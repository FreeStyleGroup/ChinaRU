'use client';

import {
  TENDER_BID_STATUS_LABELS,
  TENDER_STATUS_LABELS,
  type SellerProfileDto,
  type TenderBidDto,
  type TenderDto,
} from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { accountClient, ClientApiError, tenderClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import { money, tenderStatusClass } from './format';

type Role = 'loading' | 'guest' | 'owner' | 'participant';

function bidBadgeClass(status: TenderBidDto['status']): string {
  switch (status) {
    case 'won':
      return 'bg-green-100 text-green-700';
    case 'admitted':
      return 'bg-blue-50 text-blue-600';
    case 'rejected':
    case 'lost':
      return 'bg-red-50 text-red-600';
    case 'withdrawn':
      return 'bg-surface text-muted';
    default:
      return 'bg-amber-50 text-amber-600';
  }
}

/** Интерактивная панель тендера: владелец ведёт процедуру, участник подаёт заявку. */
export function TenderWorkspace({ tender: initial }: { tender: TenderDto }) {
  const { user, isHydrated } = useAuth();
  const router = useRouter();
  const [tender, setTender] = useState<TenderDto>(initial);
  const [role, setRole] = useState<Role>('loading');
  const [seller, setSeller] = useState<SellerProfileDto | null>(null);
  const [bids, setBids] = useState<TenderBidDto[]>([]);
  const [myBid, setMyBid] = useState<TenderBidDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setRole('guest');
      return;
    }
    let cancelled = false;
    void accountClient
      .getSeller()
      .then(s => {
        if (cancelled) return;
        setSeller(s);
        if (s?.id === tender.customer.sellerId) {
          setRole('owner');
          void tenderClient
            .listBids(tender.id)
            .then(b => !cancelled && setBids(b))
            .catch(() => undefined);
        } else {
          setRole('participant');
          void tenderClient
            .myBid(tender.id)
            .then(mb => !cancelled && setMyBid(mb))
            .catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setRole('participant');
      });
    return () => {
      cancelled = true;
    };
  }, [user, isHydrated, tender.id, tender.customer.sellerId]);

  const act = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'Не удалось выполнить действие');
    } finally {
      setBusy(false);
    }
  };

  const reloadBids = async (): Promise<void> => {
    setBids(await tenderClient.listBids(tender.id));
  };

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Управление</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${tenderStatusClass(tender.status)}`}>
          {TENDER_STATUS_LABELS[tender.status]}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {role === 'loading' && <p className="text-sm text-muted">Загрузка…</p>}

      {role === 'guest' && (
        <p className="text-sm text-muted">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Войдите
          </Link>{' '}
          как компания, чтобы подать заявку на тендер.
        </p>
      )}

      {role === 'owner' && renderOwner()}
      {role === 'participant' && renderParticipant()}
    </div>
  );

  function renderOwner() {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tender.status === 'draft' && (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  void act(async () => {
                    setTender(await tenderClient.publish(tender.id));
                  });
                }}
              >
                Опубликовать
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  void act(async () => {
                    await tenderClient.remove(tender.id);
                    router.push('/tenders');
                  });
                }}
              >
                Удалить черновик
              </Button>
            </>
          )}
          {tender.status === 'published' && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                void act(async () => {
                  setTender(await tenderClient.closeBidding(tender.id));
                });
              }}
            >
              Закрыть приём → рассмотрение
            </Button>
          )}
          {tender.status === 'awarded' && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                void act(async () => {
                  setTender(await tenderClient.complete(tender.id));
                });
              }}
            >
              Завершить (договор заключён)
            </Button>
          )}
          {(tender.status === 'published' || tender.status === 'review') && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                const reason = window.prompt('Причина отмены тендера (необязательно):') ?? undefined;
                void act(async () => {
                  setTender(await tenderClient.cancel(tender.id, reason));
                });
              }}
            >
              Отменить
            </Button>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Заявки участников ({bids.length})</p>
          {bids.length === 0 ? (
            <p className="text-sm text-muted">Заявок пока нет.</p>
          ) : (
            <div className="space-y-2">
              {bids.map(b => (
                <div key={b.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{b.bidder.companyName}</span>
                    {b.bidder.verified && (
                      <span className="text-xs text-blue-500" title="Верифицирована">
                        ✓
                      </span>
                    )}
                    <span className="font-semibold text-ink">
                      {money(b.price, tender.currency)}
                    </span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${bidBadgeClass(b.status)}`}>
                      {TENDER_BID_STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  {b.comment && <p className="mt-1 text-sm text-muted">{b.comment}</p>}
                  {b.rejectionReason && (
                    <p className="mt-1 text-sm text-red-600">Отклонено: {b.rejectionReason}</p>
                  )}
                  {tender.status === 'review' && b.status !== 'withdrawn' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {b.status === 'submitted' && (
                        <>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => {
                              void act(async () => {
                                await tenderClient.reviewBid(b.id, { status: 'admitted' });
                                await reloadBids();
                              });
                            }}
                          >
                            Допустить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              const reason =
                                window.prompt('Причина отклонения (необязательно):') ?? undefined;
                              void act(async () => {
                                await tenderClient.reviewBid(b.id, {
                                  status: 'rejected',
                                  ...(reason ? { rejectionReason: reason } : {}),
                                });
                                await reloadBids();
                              });
                            }}
                          >
                            Отклонить
                          </Button>
                        </>
                      )}
                      {b.status === 'admitted' && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            const comment =
                              window.prompt('Комментарий к протоколу итогов (необязательно):') ??
                              undefined;
                            void act(async () => {
                              setTender(await tenderClient.award(tender.id, b.id, comment));
                              await reloadBids();
                            });
                          }}
                        >
                          Сделать победителем
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderParticipant() {
    if (seller?.verifyStatus !== 'verified') {
      return (
        <p className="text-sm text-muted">
          Подавать заявки могут только верифицированные компании.{' '}
          <Link href="/cabinet/store" className="font-medium text-brand hover:underline">
            Подать заявку на верификацию →
          </Link>
        </p>
      );
    }
    if (myBid && myBid.status !== 'withdrawn') {
      const bid = myBid;
      return (
        <div className="space-y-2">
          <p className="text-sm text-ink">
            Ваша заявка: <span className="font-semibold">{money(bid.price, tender.currency)}</span>{' '}
            <span className={`rounded-full px-2 py-0.5 text-xs ${bidBadgeClass(bid.status)}`}>
              {TENDER_BID_STATUS_LABELS[bid.status]}
            </span>
          </p>
          {bid.comment && <p className="text-sm text-muted">{bid.comment}</p>}
          {tender.status === 'published' && bid.status === 'submitted' && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                void act(async () => {
                  setMyBid(await tenderClient.withdrawBid(bid.id));
                });
              }}
            >
              Отозвать заявку
            </Button>
          )}
        </div>
      );
    }
    if (tender.status !== 'published') {
      return <p className="text-sm text-muted">Приём заявок по этому тендеру закрыт.</p>;
    }
    return <BidForm onSubmit={submitBid} busy={busy} />;
  }

  async function submitBid(price: string, comment: string): Promise<void> {
    await act(async () => {
      setMyBid(
        await tenderClient.submitBid(tender.id, {
          price,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        })
      );
    });
  }
}

function BidForm({
  onSubmit,
  busy,
}: {
  onSubmit: (price: string, comment: string) => Promise<void>;
  busy: boolean;
}) {
  const [price, setPrice] = useState('');
  const [comment, setComment] = useState('');
  const valid = /^\d{1,12}(\.\d{1,2})?$/.test(price);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">Подать заявку</p>
      <input
        value={price}
        inputMode="decimal"
        onChange={e => {
          setPrice(e.target.value);
        }}
        placeholder="Ваша цена, напр. 4500000.00"
        className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <textarea
        rows={2}
        value={comment}
        maxLength={5000}
        onChange={e => {
          setComment(e.target.value);
        }}
        placeholder="Краткое предложение (сроки, условия). Без ссылок на сторонние сайты."
        className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <Button
        size="sm"
        disabled={busy || !valid}
        onClick={() => {
          void onSubmit(price, comment);
        }}
      >
        Отправить заявку
      </Button>
    </div>
  );
}
