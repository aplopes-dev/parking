import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import {
  fetchParkingCashQueue,
  fetchParkingCashQuoteByTicket,
  fetchParkingCashSummary,
  fetchAllParkingFacilities,
  type ParkingFacility,
  type ParkingSession,
} from '../../services/parkingApi';
import { formatMoney } from '../finance/financeShared';
import {
  ACCESS_TYPE_LABELS,
  formatDurationMinutes,
} from './parkingConstants';
import ParkingCashCheckoutPanel from './ParkingCashCheckoutPanel';
import './ParkingPages.css';

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const msg = ax.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  return 'Erro ao processar.';
}

type CashAlert = {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
};

const closedAlert: CashAlert = { open: false, message: '', type: 'success' };

function useFacilityFilter(facilities: ParkingFacility[]) {
  const [facilityId, setFacilityId] = useState('');
  useEffect(() => {
    if (!facilityId && facilities[0]?.id) setFacilityId(facilities[0].id);
  }, [facilities, facilityId]);
  return { facilityId, setFacilityId };
}

export const ParkingCashPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [queue, setQueue] = useState<ParkingSession[]>([]);
  const [summary, setSummary] = useState({ queueCount: 0, checkoutsToday: 0, revenueToday: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<CashAlert>(closedAlert);
  const [ticketScan, setTicketScan] = useState('');
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);

  const load = useCallback(async () => {
    const facs = await fetchAllParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    if (!fid) return;

    const [queueList, sum] = await Promise.all([
      fetchParkingCashQueue(fid),
      fetchParkingCashSummary(fid),
    ]);
    setQueue(queueList);
    setSummary(sum);
  }, [facilityId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar caixa.', type: 'error' }))
      .finally(() => setLoading(false));
  }, [load]);

  const selected = queue.find((s) => s.id === selectedId) ?? null;

  const handleScanTicket = async () => {
    const code = ticketScan.trim().toUpperCase();
    if (!code) return;
    try {
      const data = await fetchParkingCashQuoteByTicket(code);
      setSelectedId(data.session.id);
    } catch (err) {
      setAlert({ open: true, message: errMsg(err), type: 'error' });
    }
  };

  const handleCheckoutSuccess = async () => {
    setSelectedId(null);
    setTicketScan('');
    await load();
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
          <PremiumSelect
            label="Unidade"
            value={facilityId}
            options={facilities.map((f) => ({ value: f.id, label: f.name }))}
            wrapperClassName="form-group"
            onChange={setFacilityId}
          />
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
            <div className="catalog-toolbar catalog-filter-toolbar">
              <div className="form-group catalog-search catalog-filter-toolbar__search catalog-filter-toolbar__search--wide">
                <label htmlFor="ticket-scan">Escanear / digitar ticket (QR)</label>
                <input
                  id="ticket-scan"
                  className="premium-text-input"
                  value={ticketScan}
                  onChange={(e) => setTicketScan(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleScanTicket();
                  }}
                  placeholder="PK-YYYYMMDD-XXXX"
                />
              </div>
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
                onClick={() => void handleScanTicket()}
              >
                Buscar ticket
              </button>
            </div>
          </div>
          {!selected ? (
            <p className="parking-empty">Selecione um veículo na fila para cobrar a saída.</p>
          ) : (
            <>
              <h3>Cobrança — {selected.plate}</h3>
              <ParkingCashCheckoutPanel
                facilityId={facilityId}
                session={selected}
                onSuccess={(message) => {
                  setAlert({ open: true, message, type: 'success' });
                  void handleCheckoutSuccess();
                }}
                onError={(message) => setAlert({ open: true, message, type: 'error' })}
              />
              <div className="parking-actions-row">
                <Link to="/financeiro/lancamentos" className="catalog-action-button is-secondary">
                  Ver financeiro
                </Link>
              </div>
            </>
          )}
        </section>
      </div>

      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert(closedAlert)}
      />
    </CatalogPageLayout>
  );
};
