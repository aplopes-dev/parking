import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AlertState } from '../../types';
import PaymentPagbankSplitSection from './PaymentPagbankSplitSection';
import PaymentPagbankConnectSection from './PaymentPagbankConnectSection';
import PaymentPagbankRecurringSection from './PaymentPagbankRecurringSection';
import PaymentPagbankTransferSection from './PaymentPagbankTransferSection';
import PaymentPagbankRegistrationSection from './PaymentPagbankRegistrationSection';
import PaymentPagbankTestSection from './PaymentPagbankTestSection';
import {
  PagbankFlowCatalogItem,
  PagbankFlowCategory,
  PaymentSettingsResponse,
  ReceiverForm,
} from './paymentSettings.types';
import {
  PagbankTokenVerifyResult,
  verifyPagbankToken,
} from '../../services/pagbankApi';
import { getApiErrorMessage } from '../../utils/apiError';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import './PaymentSettings.css';

function pagbankEnvMeta(env: 'sandbox' | 'production') {
  const isSandbox = env === 'sandbox';
  return {
    environment: env,
    environmentLabel: isSandbox ? 'Sandbox' : 'Produção',
    isSandbox,
  };
}

type TabId =
  | 'geral'
  | 'fluxos'
  | 'split'
  | 'recorrente'
  | 'transferencia'
  | 'cadastro'
  | 'testes';

const TAB_LABELS: Record<TabId, string> = {
  geral: 'Geral e credenciais',
  fluxos: 'Fluxos PagBank',
  split: 'Divisão (split)',
  recorrente: 'Recorrente',
  transferencia: 'Transferência',
  cadastro: 'Cadastro',
  testes: 'Testes Sandbox',
};

const PaymentSettingsPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const canManage = Boolean(user);
  const [tab, setTab] = useState<TabId>('geral');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [data, setData] = useState<PaymentSettingsResponse | null>(null);
  const [newToken, setNewToken] = useState('');
  const [newConnectSecret, setNewConnectSecret] = useState('');
  const [flowFilter, setFlowFilter] = useState<PagbankFlowCategory | 'all'>('all');
  const [tokenTesting, setTokenTesting] = useState(false);
  const [tokenTestResult, setTokenTestResult] = useState<PagbankTokenVerifyResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaymentSettingsResponse>('/payments/settings');
      const normalized = {
        ...res.data,
        pagbankSplit: {
          ...res.data.pagbankSplit,
          pagbankConnectAutoSyncSplit:
            res.data.pagbankSplit.pagbankConnectAutoSyncSplit ?? false,
          pagbankConnectSplitPercentEach:
            res.data.pagbankSplit.pagbankConnectSplitPercentEach ?? null,
          pagbankCheckoutReturnUrl: res.data.pagbankSplit.pagbankCheckoutReturnUrl ?? null,
          pagbankCheckoutSuccessUrl: res.data.pagbankSplit.pagbankCheckoutSuccessUrl ?? null,
          receivers: res.data.pagbankSplit.receivers.map((r) => ({
            ...r,
            amountValue: String(r.amountValue),
          })),
        },
      };
      setData(normalized);
      setNewToken('');
      setNewConnectSecret('');
    } catch (err: any) {
      setAlert({
        isOpen: true,
        message: err.response?.data?.message || 'Erro ao carregar',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const setFlowEnabled = (flowId: string, enabled: boolean) => {
    if (!data) return;
    setData({
      ...data,
      flows: {
        ...data.flows,
        [flowId]: { ...data.flows[flowId], enabled },
      },
      catalog: data.catalog.map((f) =>
        f.id === flowId ? { ...f, config: { ...f.config, enabled } } : f,
      ),
    });
  };

  const setFlowOption = (flowId: string, key: string, value: string) => {
    if (!data) return;
    const prev = data.flows[flowId]?.options ?? {};
    setData({
      ...data,
      flows: {
        ...data.flows,
        [flowId]: {
          ...data.flows[flowId],
          options: { ...prev, [key]: value },
        },
      },
      catalog: data.catalog.map((f) =>
        f.id === flowId
          ? { ...f, config: { ...f.config, options: { ...f.config.options, [key]: value } } }
          : f,
      ),
    });
  };

  const groupedFlows = useMemo(() => {
    if (!data) return [];
    const items =
      flowFilter === 'all'
        ? data.catalog
        : data.catalog.filter((f) => f.category === flowFilter);
    const groups = new Map<PagbankFlowCategory, PagbankFlowCatalogItem[]>();
    for (const flow of items) {
      const list = groups.get(flow.category) ?? [];
      list.push(flow);
      groups.set(flow.category, list);
    }
    return Array.from(groups.entries()).map(([category, flows]) => ({
      category,
      label: data.categoryLabels[category],
      flows,
    }));
  }, [data, flowFilter]);

  const handleSave = async () => {
    if (!data || !canManage) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        pagbankEnvironment: data.general.pagbankEnvironment,
        pagbankPublicKey: data.general.pagbankPublicKey,
        pagbankConnectClientId: data.general.pagbankConnectClientId,
        pagbankNotificationUrl: data.general.pagbankNotificationUrl,
        pagbankOrderSoftDescriptor: data.general.pagbankOrderSoftDescriptor,
        pagbankOrderMcc: data.general.pagbankOrderMcc,
        pagbankConnectRedirectUri: data.general.pagbankConnectRedirectUri,
        notes: data.general.notes,
        pagbankFlows: data.flows,
        pagbankCustodyScheduledDefault: data.pagbankSplit.pagbankCustodyScheduledDefault,
        pagbankCheckoutReturnUrl: data.pagbankSplit.pagbankCheckoutReturnUrl,
        pagbankCheckoutSuccessUrl: data.pagbankSplit.pagbankCheckoutSuccessUrl,
        pagbankSplit: {
          pagbankSplitEnabled: data.flows.split_payment?.enabled ?? data.pagbankSplit.pagbankSplitEnabled,
          pagbankSplitMethod: data.pagbankSplit.pagbankSplitMethod,
          pagbankMasterAccountId: data.pagbankSplit.pagbankMasterAccountId,
          pagbankTransferInterest: data.pagbankSplit.pagbankTransferInterest,
          pagbankTransferShipping: data.pagbankSplit.pagbankTransferShipping,
          pagbankCustodyEnabled: data.pagbankSplit.pagbankCustodyEnabled,
          pagbankCustodyScheduledDefault: data.pagbankSplit.pagbankCustodyScheduledDefault,
          pagbankConnectAutoSyncSplit: data.pagbankSplit.pagbankConnectAutoSyncSplit,
          pagbankConnectSplitPercentEach:
            data.pagbankSplit.pagbankConnectSplitPercentEach != null
              ? data.pagbankSplit.pagbankConnectSplitPercentEach
              : null,
          receivers: data.pagbankSplit.receivers.map((r, i) => ({
            label: r.label,
            pagbankAccountId: r.pagbankAccountId,
            connectAccountId: r.connectAccountId,
            role: r.role,
            amountValue: Number(r.amountValue) || 0,
            isLiable: r.isLiable,
            active: r.active,
            sortOrder: i,
          })),
        },
      };
      if (newToken.trim()) payload.pagbankToken = newToken.trim();
      if (newConnectSecret.trim()) payload.pagbankConnectClientSecret = newConnectSecret.trim();

      const res = await api.patch<PaymentSettingsResponse>('/payments/settings', payload);
      setData(res.data);
      setAlert({ isOpen: true, message: 'Configurações salvas', type: 'success' });
    } catch (err: any) {
      setAlert({
        isOpen: true,
        message: err.response?.data?.message || 'Erro ao salvar',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const pctTotal = data?.pagbankSplit.receivers
    .filter((r) => r.active)
    .reduce((s, r) => s + (Number(r.amountValue) || 0), 0) ?? 0;

  return (
    <CatalogPageLayout
      moduleLabel="Integrações"
      modulePath="/integracoes/ifood"
      title="PagBank"
      description="Ative os fluxos da API Platform PagBank conforme for implementando cada integração no sistema."
      loading={loading && !data}
      loadingDescription="Carregando configurações de pagamento."
    >
      <p className="payment-settings-intro">
        Documentação:{' '}
        <a
          href="https://developer.pagbank.com.br/reference/introducao"
          target="_blank"
          rel="noreferrer"
        >
          API Platform PagBank
        </a>
        {data ? (
          <>
            {' '}
            · {data.summary.enabledFlows} de {data.summary.totalFlows} fluxos ativos ·{' '}
            {data.summary.implementedFlows} já com código no Aplopes Food
          </>
        ) : null}
      </p>

      <div className="payment-settings-tabs">
        {(Object.keys(TAB_LABELS) as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`payment-settings-tab${tab === id ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      <section className="catalog-surface catalog-form-surface--premium">
        {loading || !data ? (
          <p>Carregando…</p>
        ) : (
          <>
            {tab === 'geral' && (
              <div className="catalog-form">
                <p className="payment-settings-doc">
                  Credenciais globais usadas nas chamadas REST PagBank (Bearer token, chaves e
                  Connect).
                </p>
                {(data.flows.split_payment?.enabled ?? data.pagbankSplit.pagbankSplitEnabled) &&
                  !data.pagbankSplit.pagbankMasterAccountId?.trim() && (
                    <p className="payment-settings-doc payment-settings-warn">
                      O fluxo <strong>split_payment</strong> está ativo, mas a conta adquirente{' '}
                      <code>ACCO_…</code> não foi preenchida na aba <strong>Divisão (split)</strong>.
                      Você pode salvar token e demais dados da aba Geral; para cobranças com split,
                      informe a conta master ou desative o fluxo em Fluxos PagBank.
                    </p>
                  )}
                <div className="catalog-form-grid">
                  <PremiumSelect
                    label="Ambiente"
                    value={data.general.pagbankEnvironment}
                    onChange={(v) =>
                      setData({
                        ...data,
                        general: { ...data.general, pagbankEnvironment: v as 'sandbox' | 'production' },
                      })
                    }
                    options={[
                      { value: 'sandbox', label: 'Sandbox' },
                      { value: 'production', label: 'Produção' },
                    ]}
                    disabled={!canManage}
                  />
                  <div className="form-group payment-token-field">
                    <label>
                      Token API{' '}
                      {data.general.pagbankTokenSet && data.general.pagbankTokenPreview
                        ? `(${data.general.pagbankTokenPreview})`
                        : ''}
                    </label>
                    <div className="payment-token-row">
                      <input
                        className="premium-text-input"
                        type="password"
                        value={newToken}
                        onChange={(e) => {
                          setNewToken(e.target.value.replace(/[^\x20-\x7E]/g, ''));
                          setTokenTestResult(null);
                        }}
                        placeholder={
                          data.general.pagbankTokenSet ? 'Manter atual' : 'Cole só o UUID do token'
                        }
                        disabled={!canManage}
                      />
                      {canManage && (
                        <button
                          type="button"
                          className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                          disabled={
                            tokenTesting || (!newToken.trim() && !data.general.pagbankTokenSet)
                          }
                          onClick={async () => {
                            setTokenTesting(true);
                            setTokenTestResult(null);
                            try {
                              const res = await verifyPagbankToken({
                                token: newToken.trim() || undefined,
                                environment: data.general.pagbankEnvironment,
                              });
                              setTokenTestResult(res);
                            } catch (err: unknown) {
                              let message = getApiErrorMessage(err, 'Falha ao testar token');
                              if (
                                message.includes('Cannot POST') &&
                                message.includes('verify-token')
                              ) {
                                message +=
                                  ' Reinicie o backend (docker restart food_backend) para carregar o endpoint.';
                              }
                              setTokenTestResult({
                                valid: false,
                                message,
                                ...pagbankEnvMeta(data.general.pagbankEnvironment),
                                tokenSource: 'erro',
                                orders: {
                                  label: 'Pedidos',
                                  apiBase: '',
                                  endpoint: '',
                                  ok: false,
                                  httpStatus: 0,
                                  error: null,
                                },
                                subscriptions: {
                                  label: 'Assinaturas',
                                  apiBase: '',
                                  endpoint: '',
                                  ok: false,
                                  httpStatus: 0,
                                  error: null,
                                },
                              });
                            } finally {
                              setTokenTesting(false);
                            }
                          }}
                        >
                          {tokenTesting ? 'Testando…' : 'Testar token'}
                        </button>
                      )}
                    </div>
                    <p className="payment-token-hint">
                      Cole apenas o token (UUID). Não use ícones ✓/✗, aspas nem o texto &quot;Bearer&quot;.
                    </p>
                    {tokenTestResult && (
                      <div
                        className={`payment-token-verify${tokenTestResult.valid ? ' is-ok' : ' is-fail'}`}
                      >
                        <p className="payment-token-verify-msg">{tokenTestResult.message}</p>
                        <ul className="payment-token-verify-details">
                          <li>
                            {tokenTestResult.orders.ok ? '✓' : '✗'} {tokenTestResult.orders.label}{' '}
                            — HTTP {tokenTestResult.orders.httpStatus}
                            {tokenTestResult.orders.error
                              ? ` — ${tokenTestResult.orders.error}`
                              : ''}
                          </li>
                          <li>
                            {tokenTestResult.subscriptions.ok ? '✓' : '✗'}{' '}
                            {tokenTestResult.subscriptions.label} — HTTP{' '}
                            {tokenTestResult.subscriptions.httpStatus}
                            {tokenTestResult.subscriptions.error
                              ? ` — ${tokenTestResult.subscriptions.error}`
                              : ''}
                          </li>
                        </ul>
                        {tokenTestResult.environmentMismatch?.detected && (
                          <p className="payment-token-verify-hint">
                            Sugestão: use ambiente{' '}
                            <strong>
                              {tokenTestResult.environmentMismatch.suggestedLabel}
                            </strong>
                          </p>
                        )}
                        <p className="payment-token-verify-meta">
                          Testado como:{' '}
                          <strong>
                            {tokenTestResult.environmentLabel ?? tokenTestResult.environment}
                          </strong>
                          {tokenTestResult.isSandbox === true
                            ? ' (sandbox)'
                            : tokenTestResult.isSandbox === false
                              ? ' (produção)'
                              : ''}{' '}
                          · Fonte:{' '}
                          {tokenTestResult.tokenSource === 'informado_no_formulario'
                            ? 'digitado no campo'
                            : 'salvo na configuração'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Chave pública (checkout transparente / 3DS)</label>
                    <input
                      className="premium-text-input"
                      value={data.general.pagbankPublicKey || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          general: { ...data.general, pagbankPublicKey: e.target.value },
                        })
                      }
                      disabled={!canManage}
                    />
                  </div>
                  <div className="form-group">
                    <label>Connect Client ID</label>
                    <input
                      className="premium-text-input"
                      value={data.general.pagbankConnectClientId || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          general: { ...data.general, pagbankConnectClientId: e.target.value },
                        })
                      }
                      disabled={!canManage}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Connect Client Secret{' '}
                      {data.general.pagbankConnectClientSecretSet
                        ? `(${data.general.pagbankConnectClientSecretPreview})`
                        : ''}
                    </label>
                    <input
                      className="premium-text-input"
                      type="password"
                      value={newConnectSecret}
                      onChange={(e) => setNewConnectSecret(e.target.value)}
                      disabled={!canManage}
                    />
                  </div>
                </div>

                <PaymentPagbankConnectSection
                  canManage={canManage}
                  clientId={data.general.pagbankConnectClientId || ''}
                  redirectUri={data.general.pagbankConnectRedirectUri || ''}
                  connectSecretSet={data.general.pagbankConnectClientSecretSet}
                  onRedirectUriChange={(v) =>
                    setData({
                      ...data,
                      general: { ...data.general, pagbankConnectRedirectUri: v },
                    })
                  }
                />

                <div className="catalog-form-grid">
                  <div className="form-group">
                    <label>URL de notificação (pedidos)</label>
                    <input
                      className="premium-text-input"
                      value={data.general.pagbankNotificationUrl || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          general: { ...data.general, pagbankNotificationUrl: e.target.value },
                        })
                      }
                      disabled={!canManage}
                    />
                  </div>
                  <div className="form-group">
                    <label>Soft descriptor (máx. 22)</label>
                    <input
                      className="premium-text-input"
                      maxLength={22}
                      value={data.general.pagbankOrderSoftDescriptor || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          general: {
                            ...data.general,
                            pagbankOrderSoftDescriptor: e.target.value,
                          },
                        })
                      }
                      disabled={!canManage}
                    />
                  </div>
                  <div className="form-group">
                    <label>MCC (opcional)</label>
                    <input
                      className="premium-text-input"
                      maxLength={10}
                      value={data.general.pagbankOrderMcc || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          general: { ...data.general, pagbankOrderMcc: e.target.value },
                        })
                      }
                      disabled={!canManage}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Observações</label>
                  <textarea
                    className="premium-text-input"
                    rows={2}
                    value={data.general.notes || ''}
                    onChange={(e) =>
                      setData({ ...data, general: { ...data.general, notes: e.target.value } })
                    }
                    disabled={!canManage}
                  />
                </div>
              </div>
            )}

            {tab === 'fluxos' && (
              <div>
                <p className="payment-settings-doc">
                  Marque os fluxos que deseja habilitar no roadmap. Cada item aponta para a
                  documentação oficial para implementação.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <PremiumSelect
                    label="Filtrar categoria"
                    value={flowFilter}
                    onChange={(v) => setFlowFilter(v as PagbankFlowCategory | 'all')}
                    options={[
                      { value: 'all', label: 'Todas as categorias' },
                      ...Object.entries(data.categoryLabels).map(([k, label]) => ({
                        value: k,
                        label,
                      })),
                    ]}
                  />
                </div>
                {groupedFlows.map(({ category, label, flows }) => (
                  <div key={category} className="payment-flow-group">
                    <h3 className="payment-flow-group-title">{label}</h3>
                    <div className="payment-flow-grid">
                      {flows.map((flow) => (
                        <article
                          key={flow.id}
                          className={`payment-flow-card${flow.config.enabled ? ' is-on' : ''}${flow.implemented ? ' is-implemented' : ''}`}
                        >
                          <header className="payment-flow-card-head">
                            <label className="catalog-checkbox-label">
                              <input
                                type="checkbox"
                                checked={flow.config.enabled}
                                onChange={(e) => setFlowEnabled(flow.id, e.target.checked)}
                                disabled={!canManage}
                              />
                              <strong>{flow.label}</strong>
                            </label>
                            {flow.implemented && (
                              <span className="catalog-pill is-role">No sistema</span>
                            )}
                          </header>
                          <p>{flow.description}</p>
                          <a href={flow.docUrl} target="_blank" rel="noreferrer">
                            Ver na documentação →
                          </a>
                          {flow.optionFields?.map((field) => (
                            <div key={field.key} className="form-group" style={{ marginTop: 10 }}>
                              <label>{field.label}</label>
                              <input
                                className="premium-text-input"
                                type={field.type === 'number' ? 'number' : 'text'}
                                value={String(flow.config.options?.[field.key] ?? '')}
                                onChange={(e) =>
                                  setFlowOption(flow.id, field.key, e.target.value)
                                }
                                placeholder={field.placeholder}
                                disabled={!canManage || !flow.config.enabled}
                              />
                            </div>
                          ))}
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'split' && (
              <>
              <div className="catalog-form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>Checkout — URL de retorno (return_url)</label>
                  <input
                    className="premium-text-input"
                    value={data.pagbankSplit.pagbankCheckoutReturnUrl || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        pagbankSplit: {
                          ...data.pagbankSplit,
                          pagbankCheckoutReturnUrl: e.target.value || null,
                        },
                      })
                    }
                    disabled={!canManage}
                  />
                </div>
                <div className="form-group">
                  <label>Checkout — URL após pagamento (redirect_url)</label>
                  <input
                    className="premium-text-input"
                    value={data.pagbankSplit.pagbankCheckoutSuccessUrl || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        pagbankSplit: {
                          ...data.pagbankSplit,
                          pagbankCheckoutSuccessUrl: e.target.value || null,
                        },
                      })
                    }
                    disabled={!canManage}
                  />
                </div>
              </div>
              <PaymentPagbankSplitSection
                canManage={canManage}
                splitMethod={data.pagbankSplit.pagbankSplitMethod}
                masterAccountId={data.pagbankSplit.pagbankMasterAccountId || ''}
                transferInterest={data.pagbankSplit.pagbankTransferInterest}
                transferShipping={data.pagbankSplit.pagbankTransferShipping}
                custodyEnabled={data.pagbankSplit.pagbankCustodyEnabled}
                custodyScheduledDefault={data.pagbankSplit.pagbankCustodyScheduledDefault || ''}
                connectAutoSync={data.pagbankSplit.pagbankConnectAutoSyncSplit}
                connectSplitPercentEach={
                  data.pagbankSplit.pagbankConnectSplitPercentEach != null
                    ? String(data.pagbankSplit.pagbankConnectSplitPercentEach)
                    : ''
                }
                receivers={data.pagbankSplit.receivers}
                percentageTotal={pctTotal}
                splitsPreview={data.pagbankSplit.splitsPreview}
                onConnectAutoSyncChange={(v) =>
                  setData({
                    ...data,
                    pagbankSplit: { ...data.pagbankSplit, pagbankConnectAutoSyncSplit: v },
                  })
                }
                onConnectSplitPercentChange={(v) =>
                  setData({
                    ...data,
                    pagbankSplit: {
                      ...data.pagbankSplit,
                      pagbankConnectSplitPercentEach: v.trim() ? Number(v) : null,
                    },
                  })
                }
                onReceiversSynced={() => load()}
                onSplitMethodChange={(v) =>
                  setData({
                    ...data,
                    pagbankSplit: { ...data.pagbankSplit, pagbankSplitMethod: v },
                  })
                }
                onMasterChange={(v) =>
                  setData({
                    ...data,
                    pagbankSplit: { ...data.pagbankSplit, pagbankMasterAccountId: v },
                  })
                }
                onTransferInterestChange={(v) =>
                  setData({
                    ...data,
                    pagbankSplit: { ...data.pagbankSplit, pagbankTransferInterest: v },
                  })
                }
                onTransferShippingChange={(v) =>
                  setData({
                    ...data,
                    pagbankSplit: { ...data.pagbankSplit, pagbankTransferShipping: v },
                  })
                }
                onCustodyChange={(v) =>
                  setData({
                    ...data,
                    pagbankSplit: { ...data.pagbankSplit, pagbankCustodyEnabled: v },
                  })
                }
                onCustodyScheduledChange={(v) =>
                  setData({
                    ...data,
                    pagbankSplit: { ...data.pagbankSplit, pagbankCustodyScheduledDefault: v },
                  })
                }
                onReceiversChange={(receivers) =>
                  setData({
                    ...data,
                    pagbankSplit: {
                      ...data.pagbankSplit,
                      receivers: receivers as ReceiverForm[],
                    },
                  })
                }
              />
              </>
            )}

            {tab === 'recorrente' && (
              <PaymentPagbankRecurringSection canManage={canManage} />
            )}

            {tab === 'transferencia' && (
              <PaymentPagbankTransferSection canManage={canManage} />
            )}

            {tab === 'cadastro' && (
              <PaymentPagbankRegistrationSection canManage={canManage} />
            )}

            {tab === 'testes' && <PaymentPagbankTestSection canManage={canManage} />}

            {canManage &&
              tab !== 'recorrente' &&
              tab !== 'transferencia' &&
              tab !== 'cadastro' &&
              tab !== 'testes' && (
              <div className="catalog-form-actions" style={{ marginTop: 28 }}>
                <button
                  type="button"
                  className="catalog-action-button"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? 'Salvando…' : 'Salvar configuração'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <AlertModal
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((a) => ({ ...a, isOpen: false }))}
      />
    </CatalogPageLayout>
  );
};

export default PaymentSettingsPage;
