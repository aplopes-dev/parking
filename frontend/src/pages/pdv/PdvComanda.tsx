import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import { AlertState, Comanda, ComandaStatus } from '../../types';
import PdvWorkspace from './PdvWorkspace';
import { comandaStatusLabel } from './pdvUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import RegistryFormModal, { registryModalFooterButtons } from '../../components/RegistryFormModal';
import { getApiErrorMessage } from '../../utils/apiError';

const EMPTY_COMANDA_FORM = { number: '', label: '' };

const PdvComandaPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_COMANDA_FORM);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const canManage = Boolean(user);

  const load = useCallback(async () => {
    const { data } = await api.get<Comanda[]>('/comandas');
    setComandas(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  const closeForm = () => {
    if (isSaving) return;
    setForm(EMPTY_COMANDA_FORM);
    setShowForm(false);
  };

  const openForm = () => {
    setForm(EMPTY_COMANDA_FORM);
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/comandas', {
        number: parseInt(form.number, 10),
        label: form.label.trim() || undefined,
      });
      closeForm();
      await load();
      setAlert({ isOpen: true, message: 'Comanda cadastrada', type: 'success' });
    } catch (err: unknown) {
      setAlert({ isOpen: true, message: getApiErrorMessage(err, 'Erro'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const setStatus = async (id: string, status: ComandaStatus) => {
    try {
      await api.patch(`/comandas/${id}`, { status });
      await load();
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    }
  };

  return (
    <>
      {canManage && (
        <CatalogPageLayout
          moduleLabel="PDV"
          modulePath="/pdv/online"
          title="Gestão de comandas"
          description="Cadastre comandas físicas e acompanhe o status antes de abrir pedidos."
          actions={
            <button type="button" className="catalog-action-button" onClick={openForm}>
              Nova comanda
            </button>
          }
        >
          <RegistryFormModal
            isOpen={showForm}
            title="Nova comanda"
            subtitle="Cadastre comandas físicas para uso no PDV."
            isSaving={isSaving}
            onClose={closeForm}
            onSubmit={handleCreate}
            footer={registryModalFooterButtons({
              onClose: closeForm,
              isSaving,
              submitLabel: 'Salvar comanda',
            })}
          >
            <div className="catalog-form-grid">
              <div className="form-group">
                <label htmlFor="comanda-num">Número *</label>
                <input
                  id="comanda-num"
                  className="premium-text-input"
                  type="number"
                  min="1"
                  required
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="comanda-label">Rótulo</label>
                <input
                  id="comanda-label"
                  className="premium-text-input"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
            </div>
          </RegistryFormModal>

          <section className="catalog-surface">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Listagem</span>
                <h2>Comandas cadastradas</h2>
              </div>
              <p>{comandas.length} comanda(s)</p>
            </div>
            {loading ? (
              <p>Carregando…</p>
            ) : comandas.length === 0 ? (
              <div className="catalog-empty">Nenhuma comanda cadastrada.</div>
            ) : (
              <div className="catalog-grid">
                {comandas.map((c) => (
                  <article className="catalog-card" key={c.id}>
                    <div className="catalog-card-headline">
                      <strong>Comanda #{c.number}</strong>
                      <span>{c.label || 'Sem rótulo'}</span>
                    </div>
                    <div className="catalog-chip-row">
                      <span
                        className={`catalog-pill ${
                          'is-muted'
                        }`}
                      >
                        {comandaStatusLabel(c.status)}
                      </span>
                    </div>
                    <div className="catalog-card-actions">
                      {(['livre', 'ocupada', 'reservada'] as ComandaStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="catalog-card-button"
                          onClick={() => setStatus(c.id, s)}
                        >
                          {comandaStatusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <AlertModal
            isOpen={alert.isOpen}
            message={alert.message}
            type={alert.type}
            onClose={() => setAlert((a) => ({ ...a, isOpen: false }))}
          />
        </CatalogPageLayout>
      )}

      <PdvWorkspace
        embedded
        orderType="comanda"
        title="Pedidos de comanda"
        description="Vincule pedidos às comandas físicas do estabelecimento."
        showComanda
        newOrderInModal
        billSplitInModal
        closeOrderInModal
        useKitchenFlow
      />
    </>
  );
};

export default PdvComandaPage;
