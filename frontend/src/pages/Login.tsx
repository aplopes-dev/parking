import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import PremiumSelect from '../components/PremiumSelect';
import { getApiErrorMessage } from '../utils/apiError';
import { getHomePathForRole } from '../types/userRole';
import './Login.css';

const TENANT_OPTIONS_TIMEOUT_MS = 12_000;

function apiConnectionHint(): string {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:3085';
  const isLocal = /localhost|127\.0\.0\.1|:3085/.test(base);
  if (isLocal) {
    return 'Confira se o container estacionamento_backend está rodando (porta 3085) e se REACT_APP_API_URL é http://localhost:3085 (sem /api no final).';
  }
  return 'O servidor da API pode estar indisponível ou reiniciando. Aguarde alguns segundos e atualize a página (erro 502 = proxy sem backend).';
}

type TenantLoginOption = { slug: string; name: string };

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [tenantSlug, setTenantSlug] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('lastTenantSlug') || 'home';
      return raw === 'default' ? 'home' : raw;
    } catch {
      return 'home';
    }
  });
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  /** `undefined` = carregando; `null` = usar campo texto; array = combobox */
  const [tenantChoices, setTenantChoices] = useState<TenantLoginOption[] | null | undefined>(
    undefined,
  );
  const [apiUnreachable, setApiUnreachable] = useState(false);
  const authContext = useContext(AuthContext);
  const { login } = authContext || {};
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as {
      tenantSlug?: string;
      email?: string;
      registeredOrgName?: string;
    } | null;
    if (state?.tenantSlug) {
      setTenantSlug(state.tenantSlug);
    }
    if (state?.email) {
      setEmail(state.email);
    }
    if (state?.registeredOrgName) {
      setSuccessMessage(`Organização “${state.registeredOrgName}” criada. Faça login abaixo.`);
    }
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setTenantChoices((current) => {
        if (current === undefined) {
          setApiUnreachable(true);
          return null;
        }
        return current;
      });
    }, TENANT_OPTIONS_TIMEOUT_MS);

    (async () => {
      try {
        const { data } = await api.get<TenantLoginOption[]>('/tenants/login-options');
        if (cancelled) return;
        setApiUnreachable(false);
        if (!data?.length) {
          setTenantChoices(null);
          return;
        }
        setTenantChoices(data);
        setTenantSlug((current) =>
          data.some((t) => t.slug === current) ? current : data[0].slug,
        );
      } catch {
        if (!cancelled) {
          setApiUnreachable(true);
          setTenantChoices(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const tenantPremiumOptions = useMemo(
    () =>
      (tenantChoices ?? []).map((t) => ({
        value: t.slug,
        label: `${t.name} (${t.slug})`,
      })),
    [tenantChoices],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (tenantChoices === undefined) {
      setError('Aguarde o carregamento da organização ou verifique a conexão com o servidor.');
      return;
    }
    if (!tenantSlug.trim()) {
      setError('Informe a organização.');
      return;
    }
    setLoading(true);

    try {
      if (!login) {
        setError('Sessão indisponível. Recarregue a página.');
        return;
      }
      const session = await login(email, password, tenantSlug);
      navigate(getHomePathForRole(session.user.role));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro ao fazer login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-showcase">
          <span className="catalog-section-kicker catalog-section-kicker--on-dark">
            Estacionamentos
          </span>
          <h1>Gestão completa do seu estacionamento.</h1>
          <p>
            Controle de vagas, entrada e saída de veículos, mensalistas, tarifas e financeiro em uma
            plataforma multitenant pensada para estacionamentos, shoppings e condomínios.
          </p>

          <div className="login-highlights">
            <div className="login-highlight-card">
              <strong>Entrada e saída</strong>
              <span>Registro de veículos, placas e tempo de permanência.</span>
            </div>
            <div className="login-highlight-card">
              <strong>Mensalistas</strong>
              <span>Contratos, credenciais e controle de acesso.</span>
            </div>
            <div className="login-highlight-card">
              <strong>Operação unificada</strong>
              <span>Tarifas, caixa, relatórios e múltiplas unidades.</span>
            </div>
          </div>

          <div className="login-metrics" aria-hidden="true">
            <div>
              <strong>Vagas</strong>
              <span>tempo real</span>
            </div>
            <div>
              <strong>Caixa</strong>
              <span>integrado</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>online</span>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-header">
            <div className="login-logo" aria-hidden="true">
              <span>P</span>
            </div>
            <div>
              <p className="login-eyebrow">Aplopes Estacionamento</p>
              <h2>Acesse sua conta</h2>
            </div>
          </div>

          <p className="login-panel-copy">Entre para continuar.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              {tenantChoices === undefined ? (
                <PremiumSelect
                  id="tenantSlug"
                  label="Organização"
                  wrapperClassName="premium-select-field login-tenant-premium"
                  value=""
                  options={[{ value: '', label: 'Carregando organizações…' }]}
                  onChange={() => {}}
                  disabled
                  placeholder="Carregando…"
                />
              ) : tenantChoices !== null ? (
                <PremiumSelect
                  id="tenantSlug"
                  label="Organização"
                  wrapperClassName="premium-select-field login-tenant-premium"
                  value={tenantSlug}
                  options={tenantPremiumOptions}
                  onChange={setTenantSlug}
                  placeholder="Selecione a organização"
                  required
                />
              ) : (
                <>
                  <label htmlFor="tenantSlug">Organização</label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon" aria-hidden="true">
                      /
                    </span>
                    <input
                      id="tenantSlug"
                      type="text"
                      value={tenantSlug}
                      onChange={(e) =>
                        setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      placeholder="ex: minha-empresa"
                      autoComplete="organization"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="email">Email corporativo</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  @
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Senha</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  *
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {apiUnreachable && (
              <div className="login-error" role="alert">
                Não foi possível contactar a API. {apiConnectionHint()}
              </div>
            )}

            {successMessage && <div className="login-success">{successMessage}</div>}

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              className="login-submit"
              disabled={loading || tenantChoices === undefined}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="login-register-footer">
            Primeira vez aqui?{' '}
            <Link to="/criar-organizacao" className="login-register-link">
              Criar organização
            </Link>
          </p>

          <div className="login-panel-footer">
            <span className="login-status-dot" aria-hidden="true" />
            Desktop, tablet e mobile
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
