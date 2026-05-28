import React, { useState, useEffect, useLayoutEffect, useContext, useCallback, useMemo, useRef } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import { User as UserType, AlertState } from '../types';
import { getRoleLabel, ROLE_PILL_CLASS, UserRole } from '../types/userRole';
import { activeStatusPillClass, SECTION_KICKER_CLASS } from '../utils/catalogTags';
import { getUserPhotoUrl } from '../utils/userPhoto';
import PremiumSelect from '../components/PremiumSelect';
import CatalogPageLayout from '../components/CatalogPageLayout';
import './Users.css';

interface UserFormData {
  name: string;
  email: string;
  password: string;
  /** Perfil operacional do PDV/restaurante. */
  role: UserRole;
  active: boolean;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
}

const Users: React.FC = () => {
  const authContext = useContext(AuthContext);
  const { user, refreshUser } = authContext || {};
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'garcom',
    active: true,
  });
  const formSectionRef = useRef<HTMLElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  /** Incrementado ao abrir o formulário; força novo scroll mesmo com Strict Mode ou re-render. */
  const [formScrollNonce, setFormScrollNonce] = useState<number>(0);

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<UserType[]>('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [loadUsers, user]);

  useLayoutEffect(() => {
    if (!showForm) {
      return;
    }

    let cancelled = false;

    const scrollToForm = (): void => {
      if (cancelled) {
        return;
      }
      const el = formSectionRef.current;
      if (!el) {
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    /** Dois RAFs garantem medição/layout após pintar selects e o painel premium. */
    const rafId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToForm);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [showForm, formScrollNonce]);

  const resetForm = useCallback((): void => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'garcom',
      active: true,
    });
    setEditingUserId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  }, []);

  const openCreateForm = (): void => {
    if (showForm && !editingUserId) {
      setShowForm(false);
      resetForm();
      return;
    }

    resetForm();
    setFormScrollNonce((n) => n + 1);
    setShowForm(true);
  };

  const openEditForm = (selectedUser: UserType): void => {
    setFormScrollNonce((n) => n + 1);
    setEditingUserId(selectedUser.id);
    let formRole: UserFormData['role'] = 'garcom';
    if (selectedUser.role === 'admin' || selectedUser.role === 'manager' || selectedUser.role === 'hr') {
      formRole = 'admin';
    } else if (selectedUser.role === 'cozinha') {
      formRole = 'cozinha';
    } else if (selectedUser.role === 'garcom') {
      formRole = 'garcom';
    }
    setFormData({
      name: selectedUser.name,
      email: selectedUser.email,
      password: '',
      role: formRole,
      active: selectedUser.active,
    });
    setPhotoFile(null);
    setPhotoPreview(getUserPhotoUrl(selectedUser));
    setShowForm(true);
  };

  const openPhotoPicker = useCallback(() => {
    photoInputRef.current?.click();
  }, []);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(editingUserId ? photoPreview : null);
      return;
    }

    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const currentEditingUserId = editingUserId;

    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('email', formData.email);
    payload.append('role', formData.role);
    payload.append('active', String(formData.active));

    if (formData.password) {
      payload.append('password', formData.password);
    }

    if (photoFile) {
      payload.append('photo', photoFile);
    }

    if (!currentEditingUserId && !formData.password) {
      setAlert({
        isOpen: true,
        message: 'Informe uma senha para criar o usuário.',
        type: 'warning',
      });
      return;
    }

    setIsSavingUser(true);
    try {
      if (currentEditingUserId) {
        await api.patch(`/users/${currentEditingUserId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/users', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setShowForm(false);
      resetForm();
      await loadUsers();

      if (currentEditingUserId === user?.id && refreshUser) {
        await refreshUser();
      }

      setAlert({
        isOpen: true,
        message: currentEditingUserId
          ? 'Usuário atualizado com sucesso!'
          : 'Usuário criado com sucesso!',
        type: 'success',
      });
    } catch (error: any) {
      setAlert({
        isOpen: true,
        message:
          error.response?.data?.message ||
          (currentEditingUserId ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário'),
        type: 'error',
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDelete = async (selectedUser: UserType): Promise<void> => {
    if (selectedUser.id === user?.id) {
      setAlert({
        isOpen: true,
        message: 'Você não pode excluir o próprio usuário logado.',
        type: 'warning',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Excluir usuário',
      message: `Deseja realmente excluir ${selectedUser.name}?`,
      onConfirm: async () => {
        try {
          await api.delete(`/users/${selectedUser.id}`);
          await loadUsers();
          setAlert({
            isOpen: true,
            message: 'Usuário excluído com sucesso!',
            type: 'success',
          });
        } catch (error: any) {
          setAlert({
            isOpen: true,
            message: error.response?.data?.message || 'Erro ao excluir usuário',
            type: 'error',
          });
        }
      },
    });
  };

  const closeConfirmDialog = (): void => {
    if (isConfirmingDelete) return;
    setConfirmDialog(null);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!confirmDialog) return;
    setIsConfirmingDelete(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  const roleSelectOptions = useMemo(
    () => [
      { value: 'admin', label: 'Administrador' },
      { value: 'garcom', label: 'Garçom' },
      { value: 'cozinha', label: 'Cozinha' },
    ],
    [],
  );
  const userActiveOptions = useMemo(
    () => [
      { value: 'true', label: 'Ativo' },
      { value: 'false', label: 'Inativo' },
    ],
    [],
  );
  const totalActiveUsers = useMemo(() => users.filter((u) => u.active).length, [users]);
  const totalGarcons = useMemo(
    () => users.filter((u) => u.role === 'garcom' || u.role === 'developer').length,
    [users],
  );
  const totalCozinha = useMemo(
    () => users.filter((u) => u.role === 'cozinha').length,
    [users],
  );

  if (!user) {
    return <div className="container">Acesso negado</div>;
  }

  const usersStats = (
    <section className="catalog-stats-grid users-stats-grid">
      <article className="catalog-stat-card">
        <span>Total de usuários</span>
        <strong>{users.length}</strong>
        <p>Todos os perfis cadastrados no sistema.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Usuários ativos</span>
        <strong>{totalActiveUsers}</strong>
        <p>Perfis disponíveis para uso e autenticação.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Garçons</span>
        <strong>{totalGarcons}</strong>
        <p>Atendimento de mesas e envio à cozinha.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Cozinha</span>
        <strong>{totalCozinha}</strong>
        <p>Acesso à fila KDS de produção.</p>
      </article>
    </section>
  );

  const getInitials = (name: string): string =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

  if (loading) {
    return (
      <CatalogPageLayout
        className="users-page"
        moduleLabel="Sistema"
        modulePath="/usuarios"
        title="Usuários e permissões"
        loading
        loadingDescription="Organizando perfis, permissões e relacionamentos da equipe."
      />
    );
  }

  return (
    <CatalogPageLayout
      className="users-page"
      moduleLabel="Sistema"
      modulePath="/usuarios"
      title="Usuários e permissões"
      description="Cadastre colaboradores do estabelecimento, defina perfis de acesso e mantenha a equipe alinhada à operação do bar ou restaurante."
      stats={usersStats}
      actions={
        <button
          type="button"
          onClick={openCreateForm}
          className={`catalog-action-button${showForm && !editingUserId ? ' is-secondary' : ''}`}
        >
          {showForm && !editingUserId ? 'Fechar formulário' : 'Novo usuário'}
        </button>
      }
    >
      {showForm && (
        <section
          ref={formSectionRef}
          className="catalog-surface catalog-form-surface--premium users-form-surface users-form-surface--premium"
        >
          <div className="catalog-section-header users-form-section-header">
            <div>
              <span className="catalog-section-kicker">Cadastro</span>
              <h2>{editingUserId ? 'Editar usuário' : 'Criar novo usuário'}</h2>
            </div>
            <p>
              {editingUserId
                ? 'Atualize os dados do perfil, permissões e foto do usuário.'
                : 'Preencha os dados abaixo para liberar acesso ao sistema.'}
            </p>
          </div>

          <form className="users-form users-form--premium" onSubmit={handleSubmit}>
            <div className="users-form-grid">
              <div className="form-group">
                <label htmlFor="user-name">Nome *</label>
                <input
                  id="user-name"
                  className="premium-text-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="user-email">Email *</label>
                <input
                  id="user-email"
                  className="premium-text-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu.email@empresa.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="user-password">{editingUserId ? 'Nova senha' : 'Senha *'}</label>
                <input
                  id="user-password"
                  className="premium-text-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={
                    editingUserId
                      ? 'Deixe em branco para manter a atual'
                      : 'Defina uma senha segura'
                  }
                  required={!editingUserId}
                  autoComplete="new-password"
                />
              </div>
              <PremiumSelect
                label="Perfil *"
                wrapperClassName="premium-select-field"
                value={formData.role}
                options={roleSelectOptions}
                onChange={(value) =>
                  setFormData({ ...formData, role: value as UserFormData['role'] })
                }
                placeholder="Selecione o perfil"
                required
              />
            </div>

            <div className="users-form-grid">
              <PremiumSelect
                label="Status"
                wrapperClassName="premium-select-field"
                value={formData.active ? 'true' : 'false'}
                options={userActiveOptions}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    active: value === 'true',
                  })
                }
              />

              <div className="form-group">
                <label id="user-photo-label" htmlFor="user-photo">
                  Foto do usuário
                </label>
                <input
                  ref={photoInputRef}
                  id="user-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="users-photo-file-input"
                  onChange={handlePhotoChange}
                  tabIndex={-1}
                  aria-hidden
                />
                <div className="users-photo-file-shell" aria-labelledby="user-photo-label">
                  <span className="users-photo-file-name">
                    {photoFile?.name ??
                      (photoPreview && editingUserId
                        ? 'Foto atual do usuário'
                        : 'Nenhum arquivo selecionado')}
                  </span>
                  <button
                    type="button"
                    className="users-photo-file-btn"
                    onClick={openPhotoPicker}
                  >
                    {photoFile || photoPreview ? 'Escolher outro arquivo' : 'Escolher arquivo'}
                  </button>
                </div>
              </div>
            </div>

            <div className="users-photo-preview-card users-photo-preview-card--premium">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Pré-visualização do usuário"
                  className="users-photo-preview-image"
                />
              ) : (
                <div className="users-photo-preview-placeholder" aria-hidden="true">
                  Foto
                </div>
              )}
              <div className="users-photo-preview-copy">
                <strong>Pré-visualização</strong>
                <span>
                  Envie uma imagem para exibir no header do sistema e nos cards de usuários.
                </span>
              </div>
            </div>

            <div className="users-form-footer users-form-footer--premium">
              <button
                type="button"
                className="users-form-footer-btn users-form-footer-btn--ghost"
                disabled={isSavingUser}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`users-form-footer-btn users-form-footer-btn--primary${isSavingUser ? ' is-loading' : ''}`}
                disabled={isSavingUser}
                aria-busy={isSavingUser}
              >
                {isSavingUser ? (
                  <>
                    <span className="users-form-btn-spinner" aria-hidden />
                    {editingUserId ? 'Salvando…' : 'Criando…'}
                  </>
                ) : editingUserId ? (
                  'Salvar alterações'
                ) : (
                  'Criar usuário'
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="catalog-surface">
        <div className="catalog-section-header">
          <div>
            <span className={SECTION_KICKER_CLASS}>Equipe</span>
            <h2>Perfis cadastrados</h2>
          </div>
          <p>{users.length} usuário(s) encontrado(s)</p>
        </div>

        <div className="catalog-grid users-grid">
          {users.map((u) => (
            <article className="catalog-card user-card" key={u.id}>
              <div className="user-card-header">
                {getUserPhotoUrl(u) ? (
                  <img
                    src={getUserPhotoUrl(u) || ''}
                    alt={u.name}
                    className="user-avatar-image"
                  />
                ) : (
                  <div className="user-avatar" aria-hidden="true">
                    {getInitials(u.name)}
                  </div>
                )}

                <div className="catalog-card-headline user-card-headline">
                  <strong>{u.name}</strong>
                  <span>{u.email}</span>
                </div>
              </div>

              <div className="catalog-chip-row">
                <span className={ROLE_PILL_CLASS}>{getRoleLabel(u.role)}</span>
                <span className={activeStatusPillClass(u.active)}>
                  {u.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <dl className="catalog-meta-grid user-meta-grid">
                <div>
                  <dt>Criado em</dt>
                  <dd>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</dd>
                </div>
              </dl>

              <div className="catalog-card-actions">
                <button
                  type="button"
                  className="catalog-card-button"
                  onClick={() => openEditForm(u)}
                >
                  Editar
                </button>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    className="catalog-card-button is-danger"
                    onClick={() => handleDelete(u)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        message={alert.message}
        type={alert.type}
      />
      <ConfirmModal
        isOpen={Boolean(confirmDialog?.isOpen)}
        title={confirmDialog?.title}
        message={confirmDialog?.message || ''}
        confirmLabel="Excluir"
        isLoading={isConfirmingDelete}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmDelete}
      />
    </CatalogPageLayout>
  );
};

export default Users;
