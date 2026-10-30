import {
  REFERRAL_FIRST_DEAL_BONUS,
  REFERRAL_LEVEL_POINTS,
  REFERRAL_LEVEL_RATES,
} from '@china-ru/shared';

import { NotFoundError } from '../../http/errors';

import type { ReferralRepository, UserRepository } from '@china-ru/db';
import type { ReferralEvent, ReferralSummaryDto } from '@china-ru/shared';

const MAX_DEPTH = REFERRAL_LEVEL_RATES.length;

/** Реферальная программа MLM: привязка пригласившего, начисления по уровням, сводка. */
export class ReferralService {
  /**
   * @param webUrl адрес витрины этого экземпляра (WEB_URL) — приглашение ведёт
   * на его страницу регистрации; язык страницы выберет витрина.
   */
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly users: UserRepository,
    private readonly webUrl: string
  ) {}

  /** Привязывает пригласившего по его числовому publicId (при регистрации). */
  async linkOnRegister(userId: string, refPublicId: number): Promise<void> {
    const referrer = await this.referrals.findByPublicId(refPublicId);
    if (referrer) await this.referrals.linkReferrer(userId, referrer.id);
  }

  /**
   * Начисляет вознаграждение вверх по цепочке (до 3 уровней) за сумму сделки:
   * деньги (15/5/2%) + баллы. Для первой сделки реферала — разовый бонус прямому
   * пригласившему.
   */
  async accrue(
    event: ReferralEvent,
    sourceUserId: string,
    amount: number,
    orderId: string | null,
    isFirstDeal: boolean
  ): Promise<void> {
    if (amount <= 0) return;
    const ancestors = await this.referrals.ancestors(sourceUserId, MAX_DEPTH);
    for (const { id, level } of ancestors) {
      const rate = REFERRAL_LEVEL_RATES[level - 1] ?? 0;
      const pointsPer = REFERRAL_LEVEL_POINTS[level - 1] ?? 0;
      const money = (amount * rate).toFixed(2);
      const points = Math.floor(amount / 100) * pointsPer;
      await this.referrals.recordEarning({
        beneficiaryId: id,
        sourceId: sourceUserId,
        level,
        event,
        orderId,
        money,
        points,
      });
      await this.referrals.addReward(id, money, points);
    }

    if (isFirstDeal) {
      const direct = ancestors.find(a => a.level === 1);
      if (direct) {
        await this.referrals.recordEarning({
          beneficiaryId: direct.id,
          sourceId: sourceUserId,
          level: 1,
          event: 'first_deal',
          orderId,
          money: '0',
          points: REFERRAL_FIRST_DEAL_BONUS,
        });
        await this.referrals.addReward(direct.id, '0', REFERRAL_FIRST_DEAL_BONUS);
      }
    }
  }

  async getSummary(userId: string): Promise<ReferralSummaryDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Пользователь не найден', 'user_not_found');

    const { total, bySource } = await this.referrals.incomeBySource(userId);
    const partnerRows = await this.referrals.partnersByLevel(userId, MAX_DEPTH);

    const partners = partnerRows.map(p => {
      const income = bySource.get(p.id) ?? '0.00';
      return {
        publicId: p.publicId,
        name: p.name,
        level: p.level,
        joinedAt: p.joinedAt.toISOString(),
        income,
        active: Number(income) > 0,
      };
    });

    const levels = REFERRAL_LEVEL_RATES.map((rate, i) => ({
      level: i + 1,
      percent: Math.round(rate * 100),
      count: partners.filter(p => p.level === i + 1).length,
    }));

    const refLink = new URL('/register', this.webUrl);
    refLink.searchParams.set('ref', String(user.publicId));

    return {
      refCode: `CN-${String(user.publicId).padStart(6, '0')}`,
      refLink: refLink.toString(),
      points: user.points,
      balance: user.referralBalance,
      totalEarned: total,
      totalPartners: partners.length,
      levels,
      partners,
    };
  }
}
