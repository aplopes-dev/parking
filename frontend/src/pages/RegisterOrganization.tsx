import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

type RegisterResponse = {
  tenant: { id: string; name: string; slug: string };
  user: { id: string; email: string; name: string };
};

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function formatApiError(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) {
    return msg.join(' ');
  }
  if (typeof msg === 'string') {
    return msg;
  }
  return 'Não foi possível criar a organização. Tente novamente.';
}

const RegisterOrganization: React.FC = () => {
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeGroupCode, setStoreGroupCode] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [slugHint, setSlugHint] = useState<string | null>(null);
  const [groupHint, setGroupHint] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(normalized);
    setSlugHint(null);
  };

  const checkSlugAvailability = useCallback(async () => {
    const s = slug.trim();
    if (s.length < 2 || !SLUG_PATTERN.test(s)) {
      setSlugHint(null);
      return;
    }
    try {
      const { data } = await api.get<{ exists: boolean }>(`/tenants/by-slug/${encodeURIComponent(s)}`);
      setSlugHint(data.exists ? 'Este identificador já está em uso.' : 'Identificador disponível.');
    } catch {
      setSlugHint(null);
    }
  }, [slug]);

  const checkGroupCode = useCallback(async () => {
    const code = storeGroupCode.trim().toLowerCase();
    if (code.length < 3) {
      setGroupHint(null);
      return;
    }
    try {
      const { data } = await api.get<{ exists: boolean; name?: string }>(
        `/tenants/store-group/${encodeURIComponent(code)}`,
      );
      setGroupHint(
        data.exists
          ? `Grupo encontrado: ${data.name ?? code}.`
          : 'Código de grupo não encontrado.',
      );
    } catch {
      setGroupHint(null);
    }
  }, [storeGroupCode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (adminPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!SLUG_PATTERN.test(slug.trim())) {
      setError(
        'Use um slug com letras minúsculas, números e hífens (não comece nem termine com hífen).',
      );
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post<RegisterResponse>('/tenants/register', {
        name: orgName.trim(),
        slug: slug.trim().toLowerCase(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
        ...(storeGroupCode.trim()
          ? {
              storeGroupCode: storeGroupCode.trim().toLowerCase(),
              unitLabel: unitLabel.trim() || orgName.trim(),
            }
          : {}),
      });

      try {
        localStorage.setItem('lastTenantSlug', data.tenant.slug);
      } catch {
        /* ignore */
      }

      navigate('/login', {
        state: {
          tenantSlug: data.tenant.slug,
          email: data.user.email,
          registeredOrgName: data.tenant.name,
        },
      });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-showcase">
          <span className="catalog-section-kicker catalog-section-kicker--on-dark">
            Nova organização
          </span>
          <h1>Cadastre seu estacionamento.</h1>
          <p>
            Defina o nome do estabelecimento e o identificador (slug) do login. Em seguida crie a conta
            do administrador.
          </p>

          <div className="login-highlights">
            <div className="login-highlight-card">
              <strong>Multitenant</strong>
              <span>Cada estacionamento com dados e usuários isolados.</span>
            </div>
            <div className="login-highlight-card">
              <strong>Pronto para crescer</strong>
              <span>Vagas, tarifas, mensalistas e financeiro em breve.</span>
            </div>
          </div>

          <div className="login-metrics" aria-hidden="true">
            <div>
              <strong>1</strong>
              <span>admin</span>
            </div>
            <div>
              <strong>∞</strong>
              <span>equipes</span>
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
              <h2>Criar organização</h2>
            </div>
          </div>

          <p className="login-panel-copy">Preencha os dados da empresa e do administrador.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="orgName">Nome da organização</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  ◆
                </span>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex.: Minha Empresa Ltda"
                  autoComplete="organization"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="regSlug">Identificador (slug)</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  /
                </span>
                <input
                  id="regSlug"
                  type="text"
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  onBlur={checkSlugAvailability}
                  placeholder="ex: minha-empresa"
                  autoComplete="off"
                  required
                  minLength={2}
                  maxLength={32}
                />
              </div>
              {slugHint && (
                <p
                  className={
                    slugHint.includes('disponível') ? 'login-slug-hint login-slug-hint--ok' : 'login-slug-hint'
                  }
                >
                  {slugHint}
                </p>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="storeGroupCode">Código do grupo de lojas (opcional)</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  #
                </span>
                <input
                  id="storeGroupCode"
                  type="text"
                  value={storeGroupCode}
                  onChange={(e) => {
                    setStoreGroupCode(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    );
                    setGroupHint(null);
                  }}
                  onBlur={checkGroupCode}
                  placeholder="rede-minha-franquia"
                  autoComplete="off"
                />
              </div>
              {groupHint && (
                <p
                  className={
                    groupHint.includes('encontrado:')
                      ? 'login-slug-hint login-slug-hint--ok'
                      : 'login-slug-hint'
                  }
                >
                  {groupHint}
                </p>
              )}
            </div>

            {storeGroupCode.trim() && (
              <div className="login-field">
                <label htmlFor="unitLabel">Nome desta unidade na rede</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon" aria-hidden="true">
                    ◎
                  </span>
                  <input
                    id="unitLabel"
                    type="text"
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    placeholder="Ex.: Loja Centro"
                    maxLength={120}
                  />
                </div>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="adminName">Nome do administrador</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  ○
                </span>
                <input
                  id="adminName"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Seu nome completo"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="adminEmail">Email do administrador</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  @
                </span>
                <input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="adminPassword">Senha</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  *
                </span>
                <input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  *
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar organização'}
            </button>
          </form>

          <p className="login-register-footer">
            Já tem conta?{' '}
            <Link to="/login" className="login-register-link">
              Voltar ao login
            </Link>
          </p>

          <div className="login-panel-footer">
            <span className="login-status-dot" aria-hidden="true" />
            Após criar, faça login com o slug e o email cadastrados
          </div>
        </section>
      </div>
    </div>
  );
};

export default RegisterOrganization;
