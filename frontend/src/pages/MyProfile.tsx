import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import AlertModal from '../components/AlertModal';
import { AlertState } from '../types';
import { getUserPhotoUrl } from '../utils/userPhoto';
import CatalogPageLayout from '../components/CatalogPageLayout';
import './Users.css';
import './MyProfile.css';

import { getRoleLabel } from '../types/userRole';

const MyProfile: React.FC = () => {
  const authContext = useContext(AuthContext);
  const { user, refreshUser } = authContext || {};
  const currentPhotoUrl = useMemo(() => getUserPhotoUrl(user), [user]);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'success' });

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
  }, [user?.email, user?.name]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  if (!user) {
    return (
      <CatalogPageLayout
        className="my-profile-page"
        moduleLabel="Sistema"
        modulePath="/meu-perfil"
        title="Meu perfil"
        loading
        loadingDescription="Buscando os dados da sua conta."
      />
    );
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const displayPhotoUrl = photoPreview || currentPhotoUrl;

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedName) {
      setAlert({ isOpen: true, message: 'Informe um nome válido.', type: 'warning' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setAlert({ isOpen: true, message: 'Informe um e-mail válido.', type: 'warning' });
      return;
    }
    if (trimmedPassword && trimmedPassword.length < 6) {
      setAlert({ isOpen: true, message: 'A senha deve ter pelo menos 6 caracteres.', type: 'warning' });
      return;
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      setAlert({ isOpen: true, message: 'A confirmação de senha não confere.', type: 'warning' });
      return;
    }

    const payload = new FormData();
    payload.append('name', trimmedName);
    payload.append('email', trimmedEmail);
    if (trimmedPassword) {
      payload.append('password', trimmedPassword);
    }
    if (photoFile) {
      payload.append('photo', photoFile);
    }

    try {
      setSaving(true);
      await api.patch('/users/me', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotoFile(null);
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(null);
      setPassword('');
      setConfirmPassword('');
      await refreshUser?.();
      setAlert({ isOpen: true, message: 'Perfil atualizado com sucesso!', type: 'success' });
    } catch (error: any) {
      setAlert({
        isOpen: true,
        message: error.response?.data?.message || 'Não foi possível atualizar seu perfil.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CatalogPageLayout
      className="users-page my-profile-page"
      moduleLabel="Sistema"
      modulePath="/meu-perfil"
      title={user.name}
      description="Consulte os dados vinculados à sua conta e à organização ativa."
    >
      <section className="catalog-surface catalog-form-surface--premium my-profile-surface">
        <form className="my-profile-card" onSubmit={handleSubmit}>
          <div className="my-profile-photo-column">
            <div className="my-profile-avatar">
              {displayPhotoUrl ? (
                <img src={displayPhotoUrl} alt={name || user.name} />
              ) : (
                <span>{initials || 'U'}</span>
              )}
            </div>
            <label className="users-form-footer-btn users-form-footer-btn--ghost my-profile-photo-button">
              Alterar foto
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </label>
          </div>

          <div className="my-profile-main">
            <span className="catalog-section-kicker">Editar perfil</span>
            <div className="my-profile-fields-grid">
              <div className="my-profile-field">
              <label htmlFor="profile-name">Nome</label>
              <input
                id="profile-name"
                className="premium-text-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              </div>
              <div className="my-profile-field">
                <label htmlFor="profile-email">E-mail</label>
                <input
                  id="profile-email"
                  className="premium-text-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="my-profile-field">
                <label htmlFor="profile-password">Nova senha</label>
                <input
                  id="profile-password"
                  className="premium-text-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Deixe em branco para manter"
                  autoComplete="new-password"
                />
              </div>
              <div className="my-profile-field">
                <label htmlFor="profile-confirm-password">Confirmar senha</label>
                <input
                  id="profile-confirm-password"
                  className="premium-text-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <p>Atualize seus dados de acesso. A senha só será alterada se os campos forem preenchidos.</p>

            <div className="my-profile-info-grid">
              <div className="my-profile-info-card">
                <span>Perfil</span>
                <strong>{getRoleLabel(user.role)}</strong>
              </div>
              <div className="my-profile-info-card">
                <span>Status</span>
                <strong>{user.active ? 'Ativo' : 'Inativo'}</strong>
              </div>
              <div className="my-profile-info-card">
                <span>Organização</span>
                <strong>{user.tenant?.name ?? 'Não informado'}</strong>
              </div>
              <div className="my-profile-info-card">
                <span>Identificador</span>
                <strong>{user.tenant?.slug ?? user.tenantId}</strong>
              </div>
            </div>

            <div className="users-form-footer users-form-footer--premium my-profile-actions">
              <button
                type="button"
                className="users-form-footer-btn users-form-footer-btn--ghost"
                disabled={saving}
                onClick={() => {
                  setName(user.name);
                  setEmail(user.email);
                  setPassword('');
                  setConfirmPassword('');
                  setPhotoFile(null);
                  if (photoPreview?.startsWith('blob:')) {
                    URL.revokeObjectURL(photoPreview);
                  }
                  setPhotoPreview(null);
                }}
              >
                Cancelar alterações
              </button>
              <button
                type="submit"
                className="users-form-footer-btn users-form-footer-btn--primary"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <AlertModal
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((current) => ({ ...current, isOpen: false }))}
      />
    </CatalogPageLayout>
  );
};

export default MyProfile;
