import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import {
  checkoutParkingByTicket,
  checkoutParkingSession,
  closeMyParkingCashSession,
  fetchMyParkingCashSession,
  fetchParkingCashQueue,
  fetchParkingCashQuote,
  fetchParkingCashQuoteByTicket,
  fetchParkingCashSummary,
  fetchParkingFacilities,
  fetchParkingTariffs,
  openMyParkingCashSession,
  type OperatorCashSession,
  type ParkingCashQuote,
  type ParkingFacility,
  type ParkingSession,
  type ParkingTariff,
} from '../../services/parkingApi';
import { formatMoney, useFinanceMasterData } from '../finance/financeShared';
import {
  ACCESS_TYPE_LABELS,
  formatDateTime,
  formatDurationMinutes,
  PAYMENT_METHOD_LABELS,
  VEHICLE_TYPE_LABELS,
} from './parkingConstants';
import './ParkingPages.css';

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const msg = ax.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  return 'Erro ao processar.';
}

function useFacilityFilter(facilities: ParkingFacility[]) {
  const [facilityId, setFacilityId] = useState('');
  useEffect(() => {
    if (!facilityId && facilities[0]?.id) setFacilityId(facilities[0].id);
  }, [facilities, facilityId]);
  return { facilityId, setFacilityId };
}

const PAYMENT_METHODS = ['cash', 'pix', 'credit', 'debit'] as const;

export const ParkingCashPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [queue, setQueue] = useState<ParkingSession[]>([]);
  const [tariffs, setTariffs] = useState<ParkingTariff[]>([]);
  const [summary, setSummary] = useState({ queueCount: 0, checkoutsToday: 0, revenueToday: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<ParkingCashQuote | null>(null);
  const [tariffId, setTariffId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const [ticketScan, setTicketScan] = useState('');
  const [cashSession, setCashSession] = useState<OperatorCashSession | null>(null);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [countedBalance, setCountedBalance] = useState('');
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);
  const { accounts } = useFinanceMasterData();

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.active && a.type === 'cash'),
    [accounts],
  );

  useEffect(() => {
    if (!accountId && cashAccounts[0]?.id) setAccountId(cashAccounts[0].id);
  }, [cashAccounts, accountId]);

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    if (!fid) return;

    const [queueList, sum, tariffList, mySession] = await Promise.all([
      fetchParkingCashQueue(fid),
      fetchParkingCashSummary(fid),
      fetchParkingTariffs({ facilityId: fid }),
      fetchMyParkingCashSession(),
    ]);
    setQueue(queueList);
    setSummary(sum);
    setCashSession(mySession);
    const rotativo = tariffList.filter(
      (t) => t.active && (t.billingType === 'hourly' || t.billingType === 'daily'),
    );
    setTariffs(rotativo);
    const defaultTariff =
      rotativo.find((t) => t.isDefault && t.billingType === 'hourly') ?? rotativo[0];
    setTariffId((prev) => prev || defaultTariff?.id || '');
  }, [facilityId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar caixa.' }))
      .finally(() => setLoading(false));
  }, [load]);

  const loadQuote = useCallback(
    async (sessionId: string, tid?: string) => {
      try {
        const data = await fetchParkingCashQuote(sessionId, tid || tariffId || undefined);
        setQuoteData(data);
      } catch {
        setQuoteData(null);
      }
    },
    [tariffId],
  );

  useEffect(() => {
    if (selectedId) void loadQuote(selectedId);
    else setQuoteData(null);
  }, [selectedId, loadQuote, tariffId]);

  const selected = queue.find((s) => s.id === selectedId) ?? null;
  const quote = quoteData?.quote;
  const amount = quote?.amount ?? 0;
  const isWaived = quote?.waived ?? false;

  const handleCheckout = async () => {
    if (!selectedId && !ticketScan.trim()) return;
    if (!cashSession?.open) {
      setAlert({ open: true, message: 'Abra seu caixa de operador antes de cobrar.' });
      return;
    }
    if (amount > 0 && !accountId) {
      setAlert({
        open: true,
        message: 'Cadastre uma conta Caixa em Gestão financeira → Contas.',
      });
      return;
    }
    setCheckoutBusy(true);
    try {
      const closed = ticketScan.trim()
        ? await checkoutParkingByTicket({
            ticketCode: ticketScan.trim().toUpperCase(),
            tariffId: tariffId || undefined,
            paymentMethod: amount > 0 ? paymentMethod : undefined,
            accountId: amount > 0 ? accountId : undefined,
          })
        : await checkoutParkingSession(selectedId!, {
            tariffId: tariffId || undefined,
            paymentMethod: amount > 0 ? paymentMethod : undefined,
            accountId: amount > 0 ? accountId : undefined,
          });
      const paid =
        closed.amountCharged != null ? formatMoney(closed.amountCharged) : 'R$ 0,00';
      setAlert({
        open: true,
        message: isWaived
          ? `Saída liberada (isento). Ticket ${closed.ticketCode}.`
          : `Pagamento registrado: ${paid}. Lançamento criado no financeiro. Ticket ${closed.ticketCode}.`,
      });
      setSelectedId(null);
      setTicketScan('');
      setQuoteData(null);
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleScanTicket = async () => {
    const code = ticketScan.trim().toUpperCase();
    if (!code) return;
    try {
      const data = await fetchParkingCashQuoteByTicket(code, tariffId || undefined);
      setQuoteData(data);
      setSelectedId(data.session.id);
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const handleOpenCash = async () => {
    if (!accountId) {
      setAlert({ open: true, message: 'Selecione a conta caixa.' });
      return;
    }
    try {
      await openMyParkingCashSession({
        accountId,
        openingBalance: Number(openingBalance) || 0,
        facilityId: facilityId || undefined,
      });
      setAlert({ open: true, message: 'Caixa aberto para este operador.' });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const handleCloseCash = async () => {
    if (!cashSession?.session?.id) return;
    try {
      await closeMyParkingCashSession(cashSession.session.id, {
        countedBalance: Number(countedBalance) || 0,
      });
      setAlert({ open: true, message: 'Caixa fechado com sucesso.' });
      setCountedBalance('');
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Operação"
      modulePath="/operacao/caixa"
      title="Caixa — cobrança na saída"
      description="Calcule tarifa, receba pagamento e registre lançamento no financeiro."
      loading={loading && !facilities.length}
      loadingDescription="Carregando caixa…"
      actions={
        facilities.length ? (
          <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      <div className="parking-stat-grid">
        <div className="parking-stat-card parking-stat-card--accent">
          <strong>{summary.queueCount}</strong>
          <span>Veículos aguardando pagamento</span>
        </div>
        <div className="parking-stat-card">
          <strong>{summary.checkoutsToday}</strong>
          <span>Saídas hoje</span>
        </div>
        <div className="parking-stat-card parking-stat-card--accent">
          <strong>{formatMoney(summary.revenueToday)}</strong>
          <span>Receita do dia (caixa)</span>
        </div>
      </div>

      <section className="parking-panel">
        <h3>Caixa do operador</h3>
        {cashSession?.open && cashSession.session ? (
          <div className="parking-cash-operator">
            <p>
              <strong>Caixa aberto</strong> — {cashSession.session.account?.name ?? 'Conta'} ·
              saldo inicial {formatMoney(Number(cashSession.session.openingBalance))}
            </p>
            {cashSession.summary ? (
              <p className="parking-hint">
                Recebimentos parking: {formatMoney(cashSession.summary.parkingIncome)} ·{' '}
                {cashSession.summary.transactionCount} lançamento(s)
              </p>
            ) : null}
            <div className="parking-toolbar">
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Valor contado no fechamento"
                value={countedBalance}
                onChange={(e) => setCountedBalance(e.target.value)}
              />
              <button type="button" className="catalog-action-button is-secondary" onClick={() => void handleCloseCash()}>
                Fechar caixa
              </button>
            </div>
          </div>
        ) : (
          <div className="parking-cash-operator">
            <p className="parking-hint">Abra seu caixa antes de registrar cobranças na saída.</p>
            <div className="parking-toolbar">
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Saldo inicial"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <button type="button" className="btn-primary" onClick={() => void handleOpenCash()}>
                Abrir caixa
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="parking-cash-layout">
        <section className="parking-panel">
          <h3>Fila de saída ({queue.length})</h3>
          {queue.length === 0 ? (
            <p className="parking-empty">Nenhum veículo no pátio.</p>
          ) : (
            <div className="parking-valet-list">
              {queue.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`parking-cash-queue-item${selectedId === s.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <span className="parking-plate">{s.plate}</span>
                  <span>{s.ticketCode}</span>
                  <span className="parking-hint">
                    {ACCESS_TYPE_LABELS[s.accessType ?? 'rotativo'] ?? 'Rotativo'} ·{' '}
                    {formatDurationMinutes(s.entryAt)}
                  </span>
                  {s.customer?.name ? (
                    <span className="parking-hint">{s.customer.name}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="parking-panel parking-cash-checkout">
          <div className="parking-ticket-scan">
            <label htmlFor="ticket-scan">Escanear / digitar ticket (QR)</label>
            <div className="parking-toolbar">
              <input
                id="ticket-scan"
                value={ticketScan}
                onChange={(e) => setTicketScan(e.target.value.toUpperCase())}
                placeholder="PK-YYYYMMDD-XXXX"
              />
              <button type="button" className="catalog-action-button is-secondary" onClick={() => void handleScanTicket()}>
                Buscar ticket
              </button>
            </div>
          </div>
          {!selected ? (
            <p className="parking-empty">Selecione um veículo na fila para cobrar a saída.</p>
          ) : (
            <>
              <h3>Cobrança — {selected.plate}</h3>
              <div className="parking-cash-checkout-meta">
                <div>Ticket: <strong>{selected.ticketCode}</strong></div>
                <div>Entrada: {formatDateTime(selected.entryAt)}</div>
                <div>Permanência: {formatDurationMinutes(selected.entryAt)}</div>
                <div>
                  Acesso: {ACCESS_TYPE_LABELS[selected.accessType ?? 'rotativo']}
                  {selected.customer?.name ? ` — ${selected.customer.name}` : ''}
                </div>
                <div>Tipo: {VEHICLE_TYPE_LABELS[selected.vehicleType] ?? selected.vehicleType}</div>
              </div>

              {tariffs.length > 0 && !isWaived ? (
                <div className="parking-form-grid" style={{ marginTop: 14 }}>
                  <div>
                    <label htmlFor="cash-tariff">Tarifa</label>
                    <select
                      id="cash-tariff"
                      value={tariffId}
                      onChange={(e) => setTariffId(e.target.value)}
                    >
                      {tariffs.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {formatMoney(t.price)}
                          {t.billingType === 'hourly' ? '/h' : '/dia'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="parking-cash-amount">
                {quote ? (
                  <>
                    <strong>{isWaived ? 'Isento' : formatMoney(amount)}</strong>
                    <span>{quote.breakdown}</span>
                    {quote.discountNote ? (
                      <span className="parking-hint">{quote.discountNote}</span>
                    ) : null}
                    {quote.tariffName ? (
                      <span className="parking-hint">{quote.tariffName}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="parking-hint">Calculando valor…</span>
                )}
              </div>

              {!isWaived && amount > 0 ? (
                <>
                  <div className="parking-cash-methods">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`catalog-action-button${paymentMethod === m ? '' : ' is-secondary'}`}
                        onClick={() => setPaymentMethod(m)}
                      >
                        {PAYMENT_METHOD_LABELS[m]}
                      </button>
                    ))}
                  </div>
                  <div className="parking-form-grid" style={{ marginTop: 14 }}>
                    <div>
                      <label htmlFor="cash-account">Conta financeira</label>
                      <select
                        id="cash-account"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                      >
                        {cashAccounts.length === 0 ? (
                          <option value="">Cadastre uma conta Caixa</option>
                        ) : (
                          cashAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="parking-actions-row">
                <button
                  type="button"
                  className="catalog-action-button"
                  disabled={checkoutBusy || !quote}
                  onClick={() => void handleCheckout()}
                >
                  {isWaived || amount === 0 ? 'Liberar saída' : `Receber ${formatMoney(amount)}`}
                </button>
                <Link to="/financeiro/lancamentos" className="catalog-action-button is-secondary">
                  Ver financeiro
                </Link>
              </div>
            </>
          )}
        </section>
      </div>

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};
