import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import {
  fetchBillingPreview,
  fetchParkingFacilities,
  fetchSubscriptionBills,
  generateSubscriptionBilling,
  chargeSubscriptionBill,
  settleSubscriptionBills,
  type BillingPreview,
  type ParkingFacility,
  type SubscriptionBill,
} from '../../services/parkingApi';
import { formatMoney, useFinanceMasterData } from '../finance/financeShared';
import './ParkingPages.css';

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const msg = ax.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  return 'Erro ao processar.';
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const BILL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  billed: 'Faturado',
  paid: 'Pago',
  canceled: 'Cancelado',
};

export const ParkingBillingPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(currentMonth());
  const [dueDate, setDueDate] = useState('');
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [bills, setBills] = useState<SubscriptionBill[]>([]);
  const { accounts: financeAccounts } = useFinanceMasterData();
  const accounts = financeAccounts.filter((a) => a.active);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [settleAccountId, setSettleAccountId] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [autoCharge, setAutoCharge] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto'>('pix');
  const [chargingBillId, setChargingBillId] = useState<string | null>(null);
  const [alert, setAlert] = useState({ open: false, message: '' });

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id || '';
    if (!facilityId && fid) setFacilityId(fid);

    const [prev, billList] = await Promise.all([
      fetchBillingPreview({ referenceMonth, facilityId: fid || undefined }),
      fetchSubscriptionBills({ referenceMonth, facilityId: fid || undefined }),
    ]);
    setPreview(prev);
    setBills(billList);
  }, [referenceMonth, facilityId]);

  useEffect(() => {
    if (!settleAccountId && accounts[0]?.id) setSettleAccountId(accounts[0].id);
  }, [accounts, settleAccountId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar cobranças.' }))
      .finally(() => setLoading(false));
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateSubscriptionBilling({
        referenceMonth,
        dueDate: dueDate || undefined,
        facilityId: facilityId || undefined,
        autoCharge,
        paymentMethod: autoCharge ? paymentMethod : undefined,
      });
      setAlert({
        open: true,
        message: `${result.created} título(s) gerado(s) no financeiro.${result.skipped ? ` ${result.skipped} já existiam.` : ''}${result.charged ? ` ${result.charged} cobrança(s) emitida(s) via PagBank.` : ''}${result.chargeErrors?.length ? ` ${result.chargeErrors.length} falha(s) na emissão.` : ''}`,
      });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    } finally {
      setGenerating(false);
    }
  };

  const toggleBill = (id: string) => {
    setSelectedBillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSettle = async () => {
    if (!selectedBillIds.length || !settleAccountId) return;
    try {
      const result = await settleSubscriptionBills({
        billIds: selectedBillIds,
        paymentDate: settleDate,
        accountId: settleAccountId,
      });
      setAlert({
        open: true,
        message: `${result.settled} cobrança(s) baixada(s) — ${formatMoney(result.amount)}.`,
      });
      setSelectedBillIds([]);
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const handleCharge = async (billId: string, method: 'pix' | 'boleto') => {
    setChargingBillId(billId);
    try {
      await chargeSubscriptionBill(billId, { paymentMethod: method });
      setAlert({
        open: true,
        message: method === 'pix' ? 'PIX emitido com sucesso.' : 'Boleto emitido com sucesso.',
      });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    } finally {
      setChargingBillId(null);
    }
  };

  const copyPix = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setAlert({ open: true, message: 'Código PIX copiado.' });
    } catch {
      setAlert({ open: true, message: 'Não foi possível copiar o PIX.' });
    }
  };

  const openBills = bills.filter((b) => b.status !== 'paid' && b.openAmount > 0);

  return (
    <CatalogPageLayout
      moduleLabel="Estacionamento"
      title="Cobrança de mensalidade"
      description="Gere contas a receber dos mensalistas e registre baixas no financeiro."
    >
      <section className="catalog-surface">
        <div className="catalog-filter-toolbar-stack">
          <div className="catalog-toolbar catalog-filter-toolbar">
            <div className="form-group catalog-filter-toolbar__field catalog-filter-toolbar__field--compact">
              <label htmlFor="billing-month">Referência</label>
              <input
                id="billing-month"
                type="month"
                className="premium-text-input"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
              />
            </div>
            <PremiumSelect
              label="Unidade"
              value={facilityId}
              options={facilities.map((f) => ({ value: f.id, label: f.name }))}
              wrapperClassName="form-group catalog-filter-toolbar__field"
              onChange={setFacilityId}
            />
            <div className="form-group catalog-filter-toolbar__field catalog-filter-toolbar__field--compact">
              <label htmlFor="billing-due">Vencimento (opcional)</label>
              <input
                id="billing-due"
                type="date"
                className="premium-text-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="catalog-toolbar catalog-filter-toolbar">
            <label className="catalog-filter-toolbar__checkbox">
              <input
                type="checkbox"
                checked={autoCharge}
                onChange={(e) => setAutoCharge(e.target.checked)}
              />
              Emitir cobrança automaticamente (PagBank)
            </label>
            {autoCharge ? (
              <PremiumSelect
                label="Forma de cobrança"
                value={paymentMethod}
                options={[
                  { value: 'pix', label: 'PIX' },
                  { value: 'boleto', label: 'Boleto' },
                ]}
                wrapperClassName="form-group catalog-filter-toolbar__field"
                onChange={(v) => setPaymentMethod(v as 'pix' | 'boleto')}
              />
            ) : null}
            <div className="catalog-filter-toolbar__grow" aria-hidden />
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
              onClick={() => void handleGenerate()}
              disabled={generating || !preview?.summary.pending}
            >
              {generating ? 'Gerando…' : `Gerar ${preview?.summary.pending ?? 0} título(s)`}
            </button>
            <Link
              to="/financeiro/contas"
              className="catalog-action-button is-secondary catalog-filter-toolbar__action"
            >
              Contas a receber
            </Link>
          </div>
        </div>
      </section>

      {preview ? (
        <div className="parking-summary-cards">
          <div className="parking-stat-card">
            <span>Elegíveis</span>
            <strong>{preview.summary.eligible}</strong>
          </div>
          <div className="parking-stat-card">
            <span>Pendentes</span>
            <strong>{preview.summary.pending}</strong>
          </div>
          <div className="parking-stat-card">
            <span>Já faturados</span>
            <strong>{preview.summary.alreadyBilled}</strong>
          </div>
          <div className="parking-stat-card">
            <span>Total pendente</span>
            <strong>{formatMoney(preview.summary.totalPending)}</strong>
          </div>
        </div>
      ) : null}

      <section className="parking-panel">
        <h3>Prévia — {preview?.referenceMonthLabel ?? referenceMonth}</h3>
        {loading ? (
          <p className="parking-empty">Carregando…</p>
        ) : !preview?.items.length ? (
          <p className="parking-empty">Nenhum mensalista ativo neste mês.</p>
        ) : (
          <div className="parking-table-wrap">
            <table className="parking-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Unidade</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((item) => (
                  <tr key={item.subscriptionId}>
                    <td>{item.code ?? '—'}</td>
                    <td>{item.customerName}</td>
                    <td>{item.facilityName}</td>
                    <td>{formatMoney(item.monthlyPrice)}</td>
                    <td>
                      {item.alreadyBilled ? (
                        <span className="parking-badge parking-badge--occupied">
                          {BILL_STATUS_LABELS[item.billStatus ?? 'billed'] ?? 'Faturado'}
                        </span>
                      ) : (
                        <span className="parking-badge parking-badge--available">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="parking-panel">
        <h3>Títulos gerados</h3>
        {bills.length === 0 ? (
          <p className="parking-empty">Nenhum título gerado para este mês.</p>
        ) : (
          <>
            <div className="parking-table-wrap">
              <table className="parking-table">
                <thead>
                  <tr>
                    <th />
                    <th>Cliente</th>
                    <th>Referência</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Em aberto</th>
                    <th>Status</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {b.openAmount > 0 ? (
                          <input
                            type="checkbox"
                            checked={selectedBillIds.includes(b.id)}
                            onChange={() => toggleBill(b.id)}
                          />
                        ) : null}
                      </td>
                      <td>{b.subscription?.customerName ?? '—'}</td>
                      <td>{b.referenceMonthLabel}</td>
                      <td>{new Date(b.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td>{formatMoney(b.amount)}</td>
                      <td>{formatMoney(b.openAmount)}</td>
                      <td>
                        <span
                          className={`parking-badge parking-badge--${
                            b.status === 'paid' ? 'available' : 'occupied'
                          }`}
                        >
                          {BILL_STATUS_LABELS[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="parking-billing-payment-cell">
                        {b.status === 'paid' ? (
                          <span className="parking-hint">Liquidado</span>
                        ) : (
                          <>
                            {!b.pixCopyPaste && !b.boletoPdfUrl ? (
                              <div className="parking-billing-charge-actions">
                                <button
                                  type="button"
                                  className="catalog-action-button is-secondary"
                                  disabled={chargingBillId === b.id}
                                  onClick={() => void handleCharge(b.id, 'pix')}
                                >
                                  {chargingBillId === b.id ? '…' : 'Emitir PIX'}
                                </button>
                                <button
                                  type="button"
                                  className="catalog-action-button is-secondary"
                                  disabled={chargingBillId === b.id}
                                  onClick={() => void handleCharge(b.id, 'boleto')}
                                >
                                  Boleto
                                </button>
                              </div>
                            ) : null}
                            {b.pixCopyPaste ? (
                              <div className="parking-billing-pix">
                                <span className="parking-badge parking-badge--available">PIX</span>
                                <button
                                  type="button"
                                  className="catalog-action-button is-secondary"
                                  onClick={() => void copyPix(b.pixCopyPaste!)}
                                >
                                  Copiar PIX
                                </button>
                                {b.pixQrCode ? (
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(b.pixCopyPaste)}`}
                                    alt="QR PIX"
                                    width={120}
                                    height={120}
                                  />
                                ) : null}
                              </div>
                            ) : null}
                            {b.boletoPdfUrl ? (
                              <div className="parking-billing-boleto">
                                <span className="parking-badge parking-badge--occupied">Boleto</span>
                                <a href={b.boletoPdfUrl} target="_blank" rel="noreferrer">
                                  PDF
                                </a>
                                {b.boletoBarcode ? (
                                  <code className="parking-boleto-barcode">{b.boletoBarcode}</code>
                                ) : null}
                              </div>
                            ) : null}
                            {b.autoChargeError ? (
                              <p className="parking-alert">{b.autoChargeError}</p>
                            ) : null}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {openBills.length > 0 ? (
              <div className="catalog-toolbar catalog-filter-toolbar catalog-operation-panel__footer">
                <p className="catalog-registry-panel__meta catalog-filter-toolbar__field">
                  {selectedBillIds.length} selecionado(s)
                </p>
                <PremiumSelect
                  label="Conta"
                  value={settleAccountId}
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                  wrapperClassName="form-group catalog-filter-toolbar__field"
                  onChange={setSettleAccountId}
                />
                <div className="form-group catalog-filter-toolbar__field">
                  <label htmlFor="billing-settle-date">Data pagamento</label>
                  <input
                    id="billing-settle-date"
                    type="date"
                    className="premium-text-input"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
                  disabled={!selectedBillIds.length}
                  onClick={() => void handleSettle()}
                >
                  Baixar selecionados
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <p className="parking-hint">
        Os títulos são criados em <Link to="/financeiro/contas">Contas a pagar e receber</Link> com
        vínculo ao cliente. A baixa registra lançamento automático no financeiro. Com PagBank
        configurado, use PIX ou boleto para cobrança automática — o webhook liquida o título ao
        confirmar pagamento.
      </p>

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};
