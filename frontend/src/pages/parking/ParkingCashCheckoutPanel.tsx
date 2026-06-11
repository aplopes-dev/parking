import React, { useCallback, useEffect, useMemo, useState } from 'react';
import OperatorCashPanel from '../../components/OperatorCashPanel';
import PremiumSelect from '../../components/PremiumSelect';
import {
  checkoutParkingSession,
  closeMyParkingCashSession,
  fetchMyParkingCashSession,
  fetchParkingCashQuote,
  fetchAllParkingTariffs,
  openMyParkingCashSession,
  type OperatorCashSession,
  type ParkingCashQuote,
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

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const msg = ax.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  return 'Erro ao processar.';
}

const PAYMENT_METHODS = ['cash', 'pix', 'credit', 'debit'] as const;

export type ParkingCashCheckoutPanelProps = {
  facilityId: string;
  session: ParkingSession;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

const ParkingCashCheckoutPanel: React.FC<ParkingCashCheckoutPanelProps> = ({
  facilityId,
  session,
  onSuccess,
  onError,
  onBusyChange,
}) => {
  const [tariffs, setTariffs] = useState<ParkingTariff[]>([]);
  const [quoteData, setQuoteData] = useState<ParkingCashQuote | null>(null);
  const [tariffId, setTariffId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [accountId, setAccountId] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [cashSession, setCashSession] = useState<OperatorCashSession | null>(null);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [countedBalance, setCountedBalance] = useState('');
  const { accounts } = useFinanceMasterData();

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.active && a.type === 'cash'),
    [accounts],
  );

  useEffect(() => {
    if (!accountId && cashAccounts[0]?.id) setAccountId(cashAccounts[0].id);
  }, [cashAccounts, accountId]);

  const loadCashContext = useCallback(async () => {
    const [tariffList, mySession] = await Promise.all([
      fetchAllParkingTariffs({ facilityId }),
      fetchMyParkingCashSession(),
    ]);
    setCashSession(mySession);
    const rotativo = tariffList.filter(
      (t) => t.active && (t.billingType === 'hourly' || t.billingType === 'daily'),
    );
    setTariffs(rotativo);
    const defaultTariff =
      rotativo.find((t) => t.isDefault && t.billingType === 'hourly') ?? rotativo[0];
    setTariffId((prev) => prev || defaultTariff?.id || '');
    return defaultTariff?.id || '';
  }, [facilityId]);

  const loadQuote = useCallback(
    async (tid?: string) => {
      try {
        const data = await fetchParkingCashQuote(session.id, tid || tariffId || undefined);
        setQuoteData(data);
      } catch {
        setQuoteData(null);
      }
    },
    [session.id, tariffId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const defaultTariffId = await loadCashContext();
        if (!cancelled) {
          await loadQuote(defaultTariffId || undefined);
        }
      } catch {
        if (!cancelled) onError('Erro ao carregar dados do caixa.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCashContext, loadQuote, onError, session.id]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote, tariffId]);

  const quote = quoteData?.quote;
  const amount = quote?.amount ?? 0;
  const isWaived = quote?.waived ?? false;

  const handleOpenCash = async () => {
    if (!accountId) {
      onError('Selecione a conta caixa.');
      return;
    }
    try {
      await openMyParkingCashSession({
        accountId,
        openingBalance: Number(openingBalance) || 0,
        facilityId: facilityId || undefined,
      });
      onSuccess('Caixa aberto para este operador.');
      setCashSession(await fetchMyParkingCashSession());
    } catch (err) {
      onError(errMsg(err));
    }
  };

  const handleCloseCash = async () => {
    if (!cashSession?.session?.id) return;
    try {
      await closeMyParkingCashSession(cashSession.session.id, {
        countedBalance: Number(countedBalance) || 0,
      });
      onSuccess('Caixa fechado com sucesso.');
      setCountedBalance('');
      setCashSession(await fetchMyParkingCashSession());
    } catch (err) {
      onError(errMsg(err));
    }
  };

  const handleCheckout = async () => {
    if (!cashSession?.open) {
      onError('Abra seu caixa de operador antes de cobrar.');
      return;
    }
    if (amount > 0 && !accountId) {
      onError('Cadastre uma conta Caixa em Gestão financeira → Contas.');
      return;
    }
    setCheckoutBusy(true);
    onBusyChange?.(true);
    try {
      const closed = await checkoutParkingSession(session.id, {
        tariffId: tariffId || undefined,
        paymentMethod: amount > 0 ? paymentMethod : undefined,
        accountId: amount > 0 ? accountId : undefined,
      });
      const paid =
        closed.amountCharged != null ? formatMoney(closed.amountCharged) : 'R$ 0,00';
      onSuccess(
        isWaived
          ? `Saída liberada (isento). Ticket ${closed.ticketCode}.`
          : `Pagamento registrado: ${paid}. Lançamento criado no financeiro. Ticket ${closed.ticketCode}.`,
      );
    } catch (err) {
      onError(errMsg(err));
    } finally {
      setCheckoutBusy(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="parking-cash-checkout-panel">
      <OperatorCashPanel
        isOpen={Boolean(cashSession?.open && cashSession.session)}
        accountOptions={cashAccounts.map((a) => ({ value: a.id, label: a.name }))}
        accountId={accountId}
        onAccountIdChange={setAccountId}
        openingBalance={openingBalance}
        onOpeningBalanceChange={setOpeningBalance}
        countedBalance={countedBalance}
        onCountedBalanceChange={setCountedBalance}
        onOpen={() => void handleOpenCash()}
        onClose={() => void handleCloseCash()}
        closedHint="Abra seu caixa antes de registrar cobranças na saída."
        openStatusLine={
          cashSession?.session
            ? `${cashSession.session.account?.name ?? 'Conta'} · saldo inicial ${formatMoney(Number(cashSession.session.openingBalance))}`
            : undefined
        }
        summaryLine={
          cashSession?.summary
            ? `Recebimentos parking: ${formatMoney(cashSession.summary.parkingIncome)} · ${cashSession.summary.transactionCount} lançamento(s)`
            : undefined
        }
      />

      <div
        className={`parking-cash-checkout-ticket-row${
          tariffs.length > 0 && !isWaived ? '' : ' parking-cash-checkout-ticket-row--solo'
        }`}
      >
        <div className="parking-cash-checkout-meta">
          <div>
            Ticket: <strong>{session.ticketCode}</strong>
          </div>
          <div>
            Placa: <strong className="parking-plate">{session.plate}</strong>
          </div>
          <div>Entrada: {formatDateTime(session.entryAt)}</div>
          <div>Permanência: {formatDurationMinutes(session.entryAt)}</div>
          <div>
            Acesso: {ACCESS_TYPE_LABELS[session.accessType ?? 'rotativo']}
            {session.customer?.name ? ` — ${session.customer.name}` : ''}
          </div>
          <div>Tipo: {VEHICLE_TYPE_LABELS[session.vehicleType] ?? session.vehicleType}</div>
        </div>

        {tariffs.length > 0 && !isWaived ? (
          <div className="parking-cash-checkout-panel__tariff">
            <PremiumSelect
              id={`cash-tariff-${session.id}`}
              label="Tarifa"
              value={tariffId}
              options={tariffs.map((t) => ({
                value: t.id,
                label: `${t.name} — ${formatMoney(t.price)}${t.billingType === 'hourly' ? '/h' : '/dia'}`,
              }))}
              wrapperClassName="form-group parking-cash-checkout-panel__tariff-field"
              onChange={setTariffId}
            />
          </div>
        ) : null}
      </div>

      <div className="parking-cash-amount">
        {quote ? (
          <>
            <strong>{isWaived ? 'Isento' : formatMoney(amount)}</strong>
            <span>{quote.breakdown}</span>
            {quote.discountNote ? <span className="parking-hint">{quote.discountNote}</span> : null}
            {quote.tariffName ? <span className="parking-hint">{quote.tariffName}</span> : null}
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
          <div className="parking-form-grid parking-cash-checkout-panel__account">
            <PremiumSelect
              id={`cash-account-${session.id}`}
              label="Conta financeira"
              value={accountId}
              options={
                cashAccounts.length === 0
                  ? [{ value: '', label: 'Cadastre uma conta Caixa' }]
                  : cashAccounts.map((a) => ({ value: a.id, label: a.name }))
              }
              onChange={setAccountId}
            />
          </div>
        </>
      ) : null}

      <div className="parking-actions-row parking-cash-checkout-panel__actions">
        <button
          type="button"
          className="catalog-action-button"
          disabled={checkoutBusy || !quote}
          onClick={() => void handleCheckout()}
        >
          {checkoutBusy
            ? 'Processando…'
            : isWaived || amount === 0
              ? 'Liberar saída'
              : `Receber ${formatMoney(amount)}`}
        </button>
      </div>
    </div>
  );
};

export default ParkingCashCheckoutPanel;
