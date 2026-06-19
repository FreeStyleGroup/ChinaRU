import { contentViolationMessage, inspectContent, paginate } from '@china-ru/shared';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../http/errors';
import { toMyTenderBidDto, toTenderBidDto, toTenderDto } from '../dto';

import type {
  NewTender,
  SellerProfile,
  TenderBidRepository,
  TenderRepository,
  NotificationRepository,
  SellerRepository,
} from '@china-ru/db';
import type {
  AwardTenderInput,
  CancelTenderInput,
  CreateBidInput,
  CreateTenderInput,
  MyTenderBidDto,
  MyTenderListQuery,
  Paginated,
  ReviewBidInput,
  TenderBidDto,
  TenderDto,
  TenderListQuery,
  UpdateBidInput,
  UpdateTenderInput,
} from '@china-ru/shared';

/**
 * Тендерная площадка. Заказчик (верифицированная компания) ведёт извещение по
 * жизненному циклу: черновик → опубликован (приём заявок) → рассмотрение
 * (допуск/отклонение заявок) → определение победителя → завершение/отмена.
 * Участники — другие верифицированные компании — подают заявки. Способы и
 * процедуры смоделированы по 44-ФЗ/223-ФЗ; заявки видны только заказчику.
 */
export class TenderService {
  constructor(
    private readonly tenders: TenderRepository,
    private readonly bids: TenderBidRepository,
    private readonly sellers: SellerRepository,
    private readonly notifications: NotificationRepository
  ) {}

  /* ── Заказчик: тендер ── */

  async createTender(userId: string, input: CreateTenderInput): Promise<TenderDto> {
    const seller = await this.requireVerifiedSeller(userId);
    this.assertCleanContent(`${input.title}\n${input.description}`);
    const created = await this.tenders.create(this.toRow(seller.id, input));
    return this.dto(created.id);
  }

  async updateTender(userId: string, id: string, input: UpdateTenderInput): Promise<TenderDto> {
    const { tender, seller } = await this.requireOwnedTender(userId, id);
    if (tender.status !== 'draft') {
      throw new BadRequestError('Редактировать можно только черновик тендера', 'tender_not_draft');
    }
    if (input.title !== undefined || input.description !== undefined) {
      this.assertCleanContent(`${input.title ?? tender.title}\n${input.description ?? tender.description}`);
    }
    const patch: Partial<NewTender> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.method !== undefined) patch.method = input.method;
    if (input.law !== undefined) patch.law = input.law;
    if (input.category !== undefined) patch.category = input.category;
    if (input.region !== undefined) patch.region = input.region;
    if (input.deliveryPlace !== undefined) patch.deliveryPlace = input.deliveryPlace;
    if (input.startPrice !== undefined) patch.startPrice = input.startPrice;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.bidSecurity !== undefined) patch.bidSecurity = input.bidSecurity;
    if (input.contractSecurity !== undefined) patch.contractSecurity = input.contractSecurity;
    if (input.submissionDeadline !== undefined) {
      patch.submissionDeadline = new Date(input.submissionDeadline);
    }
    void seller;
    await this.tenders.update(id, patch);
    return this.dto(id);
  }

  /** Публикация: черновик → опубликован, открывается приём заявок. */
  async publishTender(userId: string, id: string): Promise<TenderDto> {
    const { tender } = await this.requireOwnedTender(userId, id);
    if (tender.status !== 'draft') {
      throw new BadRequestError('Тендер уже опубликован', 'tender_not_draft');
    }
    if (tender.submissionDeadline.getTime() <= Date.now()) {
      throw new ValidationError({ submissionDeadline: 'Срок подачи заявок должен быть в будущем' });
    }
    await this.tenders.update(id, { status: 'published', publishedAt: new Date() });
    return this.dto(id);
  }

  /** Закрыть приём заявок и перейти к рассмотрению (можно досрочно). */
  async closeBidding(userId: string, id: string): Promise<TenderDto> {
    const { tender } = await this.requireOwnedTender(userId, id);
    if (tender.status !== 'published') {
      throw new BadRequestError('Приём заявок уже закрыт', 'tender_not_published');
    }
    await this.tenders.update(id, { status: 'review' });
    return this.dto(id);
  }

  async cancelTender(userId: string, id: string, input: CancelTenderInput): Promise<TenderDto> {
    const { tender } = await this.requireOwnedTender(userId, id);
    if (tender.status !== 'published' && tender.status !== 'review') {
      throw new BadRequestError('Отменить можно только активный тендер', 'tender_not_cancellable');
    }
    await this.tenders.update(id, { status: 'cancelled', cancelReason: input.reason ?? null });
    await this.notifyBidders(id, 'cancelled', { tenderId: id });
    return this.dto(id);
  }

  async completeTender(userId: string, id: string): Promise<TenderDto> {
    const { tender } = await this.requireOwnedTender(userId, id);
    if (tender.status !== 'awarded') {
      throw new BadRequestError('Завершить можно только тендер с победителем', 'tender_not_awarded');
    }
    await this.tenders.update(id, { status: 'completed' });
    return this.dto(id);
  }

  async deleteTender(userId: string, id: string): Promise<void> {
    const { tender } = await this.requireOwnedTender(userId, id);
    if (tender.status !== 'draft') {
      throw new BadRequestError('Удалить можно только черновик — опубликованный отмените', 'tender_not_draft');
    }
    await this.tenders.softDelete(id);
  }

  /* ── Публичный реестр и детали ── */

  async listTenders(query: TenderListQuery): Promise<Paginated<TenderDto>> {
    const { rows, total } = await this.tenders.listPublic({
      page: query.page,
      limit: query.pageSize,
      ...(query.method ? { method: query.method } : {}),
      ...(query.law ? { law: query.law } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.region ? { region: query.region } : {}),
      ...(query.q ? { q: query.q } : {}),
    });
    return paginate(rows.map(toTenderDto), total, { page: query.page, pageSize: query.pageSize });
  }

  async getTender(id: string, viewerUserId: string | null): Promise<TenderDto> {
    const tender = await this.tenders.findWithCustomer(id);
    if (!tender) throw new NotFoundError('Тендер не найден', 'tender_not_found');
    if (tender.status === 'draft') {
      const seller = viewerUserId ? await this.sellers.findByUserId(viewerUserId) : null;
      if (!seller) throw new NotFoundError('Тендер не найден', 'tender_not_found');
      if (seller.id !== tender.customerSellerId) {
        throw new NotFoundError('Тендер не найден', 'tender_not_found');
      }
      return toTenderDto(tender);
    }
    await this.tenders.incrementView(id);
    return { ...toTenderDto(tender), viewCount: tender.viewCount + 1 };
  }

  async listMyTenders(userId: string, query: MyTenderListQuery): Promise<Paginated<TenderDto>> {
    const seller = await this.requireSeller(userId);
    const { rows, total } = await this.tenders.listByCustomer(seller.id, {
      page: query.page,
      limit: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
    });
    return paginate(rows.map(toTenderDto), total, { page: query.page, pageSize: query.pageSize });
  }

  /* ── Участник: заявки ── */

  async submitBid(userId: string, tenderId: string, input: CreateBidInput): Promise<TenderBidDto> {
    const seller = await this.requireVerifiedSeller(userId);
    const tender = await this.tenders.findById(tenderId);
    if (!tender) throw new NotFoundError('Тендер не найден', 'tender_not_found');
    if (seller.id === tender.customerSellerId) {
      throw new ForbiddenError('Заказчик не может подать заявку на свой тендер', 'own_tender');
    }
    this.assertBiddingOpen(tender);
    if (input.comment) this.assertCleanContent(input.comment);

    const existing = await this.bids.findByTenderAndBidder(tenderId, seller.id);
    if (existing) {
      if (existing.status !== 'withdrawn') {
        throw new ConflictError('Вы уже подали заявку на этот тендер', 'bid_exists');
      }
      // Повторная подача после отзыва — реактивируем строку.
      await this.bids.update(existing.id, {
        price: input.price,
        comment: input.comment ?? null,
        status: 'submitted',
        rejectionReason: null,
      });
      await this.tenders.adjustBidCount(tenderId, 1);
      return this.bidDto(existing.id);
    }

    const created = await this.bids.create({
      tenderId,
      bidderSellerId: seller.id,
      price: input.price,
      comment: input.comment ?? null,
    });
    await this.tenders.adjustBidCount(tenderId, 1);
    await this.notifyCustomer(tender.customerSellerId, 'bid_received', { tenderId });
    return this.bidDto(created.id);
  }

  async updateBid(userId: string, bidId: string, input: UpdateBidInput): Promise<TenderBidDto> {
    const { bid, tender } = await this.requireOwnedBid(userId, bidId);
    this.assertBiddingOpen(tender);
    if (bid.status !== 'submitted') {
      throw new BadRequestError('Изменить можно только поданную заявку', 'bid_not_editable');
    }
    if (input.comment) this.assertCleanContent(input.comment);
    const patch: Partial<{ price: string; comment: string | null }> = {};
    if (input.price !== undefined) patch.price = input.price;
    if (input.comment !== undefined) patch.comment = input.comment;
    await this.bids.update(bidId, patch);
    return this.bidDto(bidId);
  }

  async withdrawBid(userId: string, bidId: string): Promise<TenderBidDto> {
    const { bid, tender } = await this.requireOwnedBid(userId, bidId);
    if (tender.status !== 'published') {
      throw new BadRequestError('Отозвать заявку можно только во время приёма', 'bid_not_withdrawable');
    }
    if (bid.status !== 'withdrawn') {
      await this.bids.update(bidId, { status: 'withdrawn' });
      await this.tenders.adjustBidCount(bid.tenderId, -1);
    }
    return this.bidDto(bidId);
  }

  /** Заявка текущей компании на тендер (для кнопки «вы уже участвуете»). */
  async getMyBidForTender(userId: string, tenderId: string): Promise<TenderBidDto | null> {
    const seller = await this.sellers.findByUserId(userId);
    if (!seller) return null;
    const bid = await this.bids.findByTenderAndBidder(tenderId, seller.id);
    return bid ? this.bidDto(bid.id) : null;
  }

  async listMyBids(userId: string, query: MyTenderListQuery): Promise<Paginated<MyTenderBidDto>> {
    const seller = await this.requireSeller(userId);
    const { rows, total } = await this.bids.listByBidder(seller.id, query.page, query.pageSize);
    return paginate(rows.map(toMyTenderBidDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /* ── Заказчик: рассмотрение заявок и итоги ── */

  /** Список заявок тендера — доступен только заказчику (заявки конфиденциальны). */
  async listBids(userId: string, tenderId: string): Promise<TenderBidDto[]> {
    await this.requireOwnedTender(userId, tenderId);
    const rows = await this.bids.listByTender(tenderId);
    return rows.map(toTenderBidDto);
  }

  async reviewBid(userId: string, bidId: string, input: ReviewBidInput): Promise<TenderBidDto> {
    const bid = await this.bids.findById(bidId);
    if (!bid) throw new NotFoundError('Заявка не найдена', 'bid_not_found');
    const { tender } = await this.requireOwnedTender(userId, bid.tenderId);
    if (tender.status !== 'review') {
      throw new BadRequestError('Сначала закройте приём заявок (рассмотрение)', 'tender_not_in_review');
    }
    if (bid.status === 'withdrawn') {
      throw new BadRequestError('Отозванную заявку нельзя рассматривать', 'bid_withdrawn');
    }
    if (input.status === 'admitted') {
      await this.bids.update(bidId, { status: 'admitted', rejectionReason: null });
      await this.notifyBidder(bid.bidderSellerId, 'bid_admitted', { tenderId: tender.id });
    } else {
      await this.bids.update(bidId, { status: 'rejected', rejectionReason: input.rejectionReason ?? null });
      await this.notifyBidder(bid.bidderSellerId, 'bid_rejected', { tenderId: tender.id });
    }
    return this.bidDto(bidId);
  }

  /** Определение победителя: подведение итогов. Победитель — только допущенная заявка. */
  async awardTender(userId: string, id: string, input: AwardTenderInput): Promise<TenderDto> {
    const { tender } = await this.requireOwnedTender(userId, id);
    if (tender.status !== 'review') {
      throw new BadRequestError('Подвести итоги можно только на этапе рассмотрения', 'tender_not_in_review');
    }
    const winner = await this.bids.findById(input.bidId);
    if (!winner) throw new NotFoundError('Заявка не найдена', 'bid_not_found');
    if (winner.tenderId !== id) throw new NotFoundError('Заявка не найдена', 'bid_not_found');
    if (winner.status !== 'admitted') {
      throw new BadRequestError('Победителем может стать только допущенная заявка', 'bid_not_admitted');
    }
    await this.tenders.update(id, {
      status: 'awarded',
      awardedBidId: winner.id,
      awardComment: input.comment ?? null,
    });
    await this.bids.update(winner.id, { status: 'won' });
    // Остальные активные заявки помечаем проигравшими.
    const active = await this.bids.listActiveByTender(id);
    for (const b of active) {
      if (b.id === winner.id) continue;
      if (b.status === 'rejected') continue;
      await this.bids.update(b.id, { status: 'lost' });
    }
    for (const b of active) {
      const event = b.id === winner.id ? 'won' : 'lost';
      await this.notifyBidder(b.bidderSellerId, `bid_${event}`, { tenderId: id });
    }
    return this.dto(id);
  }

  /* ── helpers ── */

  private toRow(customerSellerId: string, input: CreateTenderInput): NewTender {
    return {
      customerSellerId,
      title: input.title,
      description: input.description,
      method: input.method,
      law: input.law,
      category: input.category ?? null,
      region: input.region ?? null,
      deliveryPlace: input.deliveryPlace ?? null,
      startPrice: input.startPrice ?? null,
      currency: input.currency,
      bidSecurity: input.bidSecurity ?? null,
      contractSecurity: input.contractSecurity ?? null,
      submissionDeadline: new Date(input.submissionDeadline),
      status: 'draft',
    };
  }

  private async requireSeller(userId: string): Promise<SellerProfile> {
    const seller = await this.sellers.findByUserId(userId);
    if (!seller) throw new ForbiddenError('Действие доступно только компаниям', 'seller_required');
    return seller;
  }

  private async requireVerifiedSeller(userId: string): Promise<SellerProfile> {
    const seller = await this.requireSeller(userId);
    if (seller.verifyStatus !== 'verified') {
      throw new ForbiddenError('Доступно только верифицированной компании', 'seller_not_verified');
    }
    return seller;
  }

  private async requireOwnedTender(
    userId: string,
    id: string
  ): Promise<{ tender: NonNullable<Awaited<ReturnType<TenderRepository['findById']>>>; seller: SellerProfile }> {
    const seller = await this.requireSeller(userId);
    const tender = await this.tenders.findById(id);
    if (!tender) throw new NotFoundError('Тендер не найден', 'tender_not_found');
    if (tender.customerSellerId !== seller.id) {
      throw new ForbiddenError('Это не ваш тендер', 'not_tender_owner');
    }
    return { tender, seller };
  }

  private async requireOwnedBid(
    userId: string,
    bidId: string
  ): Promise<{
    bid: NonNullable<Awaited<ReturnType<TenderBidRepository['findById']>>>;
    tender: NonNullable<Awaited<ReturnType<TenderRepository['findById']>>>;
  }> {
    const seller = await this.requireSeller(userId);
    const bid = await this.bids.findById(bidId);
    if (!bid) throw new NotFoundError('Заявка не найдена', 'bid_not_found');
    if (bid.bidderSellerId !== seller.id) {
      throw new ForbiddenError('Это не ваша заявка', 'not_bid_owner');
    }
    const tender = await this.tenders.findById(bid.tenderId);
    if (!tender) throw new NotFoundError('Тендер не найден', 'tender_not_found');
    return { bid, tender };
  }

  private assertBiddingOpen(tender: { status: string; submissionDeadline: Date }): void {
    if (tender.status !== 'published') {
      throw new BadRequestError('Приём заявок закрыт', 'bidding_closed');
    }
    if (tender.submissionDeadline.getTime() <= Date.now()) {
      throw new BadRequestError('Срок подачи заявок истёк', 'deadline_passed');
    }
  }

  private assertCleanContent(text: string): void {
    const result = inspectContent(text);
    if (!result.ok) {
      throw new ValidationError({ body: contentViolationMessage(result.violations) });
    }
  }

  private async notifyCustomer(
    customerSellerId: string,
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const seller = await this.sellers.findById(customerSellerId);
    if (seller) {
      await this.notifications.create({ userId: seller.userId, type: 'tender', payload: { ...payload, event } });
    }
  }

  private async notifyBidder(
    bidderSellerId: string,
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const seller = await this.sellers.findById(bidderSellerId);
    if (seller) {
      await this.notifications.create({ userId: seller.userId, type: 'tender', payload: { ...payload, event } });
    }
  }

  /** Уведомить всех активных участников тендера (например, об отмене). */
  private async notifyBidders(
    tenderId: string,
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const active = await this.bids.listActiveByTender(tenderId);
    for (const b of active) {
      await this.notifyBidder(b.bidderSellerId, event, payload);
    }
  }

  private async dto(id: string): Promise<TenderDto> {
    const tender = await this.tenders.findWithCustomer(id);
    if (!tender) throw new NotFoundError('Тендер не найден', 'tender_not_found');
    return toTenderDto(tender);
  }

  private async bidDto(id: string): Promise<TenderBidDto> {
    const bid = await this.bids.findWithBidder(id);
    if (!bid) throw new NotFoundError('Заявка не найдена', 'bid_not_found');
    return toTenderBidDto(bid);
  }
}
