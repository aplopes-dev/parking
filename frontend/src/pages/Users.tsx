import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import RegistryFormModal from '../components/RegistryFormModal';
import { User as UserType, AlertState } from '../types';
import { getRoleLabel, UserRole } from '../types/userRole';
import { getUserPhotoUrl } from '../utils/userPhoto';
import PremiumSelect from '../components/PremiumSelect';
import CatalogPageLayout from '../components/CatalogPageLayout';
import CatalogPagination from '../components/catalog/CatalogPagination';
import CatalogRegistryIconActions from '../components/catalog/CatalogRegistryIconActions';
import { DEFAULT_PAGE_SIZE, PaginatedMeta, PaginatedResponse } from '../types/pagination';
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [listMeta, setListMeta] = useState<PaginatedMeta | null>(null);
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
  const photoInputRef = useRef<HTMLInputElement>(null);

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<PaginatedResponse<UserType> | UserType[]>('/users', {
        params: { page, limit },
      });
      const data = response.data;
      if (Array.isArray(data)) {
        setUsers(data);
        setListMeta({ page: 1, limit: data.length, total: data.length, totalPages: 1, sortBy: 'name', sortOrder: 'ASC' });
      } else {
        setUsers(data.data ?? []);
        setListMeta(data.meta);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadUsers();
    }
  }, [loadUsers, user]);

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

  const closeFormModal = (): void => {
    if (isSavingUser) return;
    setShowForm(false);
    resetForm();
  };

  const openCreateForm = (): void => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (selectedUser: UserType): void => {
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
    <section className="users-stats-grid" aria-label="Resumo de usuários">
      <article className="users-stat-card">
        <p className="users-stat-card__label">Total de usuários</p>
        <strong>{users.length}</strong>
      </article>
      <article className="users-stat-card">
        <p className="users-stat-card__label">Usuários ativos</p>
        <strong>{totalActiveUsers}</strong>
      </article>
      <article className="users-stat-card">
        <p className="users-stat-card__label">Garçons</p>
        <strong>{totalGarcons}</strong>
      </article>
      <article className="users-stat-card">
        <p className="users-stat-card__label">Cozinha</p>
        <strong>{totalCozinha}</strong>
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
        className="users-page catalog-page--ifood"
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
      className="users-page catalog-page--ifood"
      moduleLabel="Sistema"
      modulePath="/usuarios"
      title="Usuários e permissões"
      description="Cadastre colaboradores do estabelecimento, defina perfis de acesso e mantenha a equipe alinhada à operação do bar ou restaurante."
      stats={usersStats}
      actions={
        <button type="button" onClick={openCreateForm} className="catalog-action-button">
          Novo usuário
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showForm}
        wide
        title={editingUserId ? 'Editar usuário' : 'Novo usuário'}
        subtitle={
          editingUserId
            ? 'Atualize os dados do perfil, permissões e foto do usuário.'
            : 'Preencha os dados para liberar acesso ao sistema.'
        }
        isSaving={isSavingUser}
        onClose={closeFormModal}
        onSubmit={handleSubmit}
        footer={
          <>
            <button
              type="button"
              className="users-form-footer-btn users-form-footer-btn--ghost"
              disabled={isSavingUser}
              onClick={closeFormModal}
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
          </>
        }
      >
        <div className="users-form users-form--premium users-form-surface users-form-surface--premium">
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

        </div>
      </RegistryFormModal>

      <section className="catalog-registry-panel" aria-labelledby="users-panel-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="users-panel-title">Perfis cadastrados</h2>
            <p className="catalog-registry-panel__meta">
              {listMeta?.total ?? users.length} usuário(s) encontrado(s)
            </p>
          </div>
        </header>

        <div className="catalog-grid users-grid users-grid--panel">
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

              <dl className="catalog-meta-grid user-meta-grid">
                <div>
                  <dt>Perfil</dt>
                  <dd>{getRoleLabel(u.role)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{u.active ? 'Ativo' : 'Inativo'}</dd>
                </div>
                <div>
                  <dt>Criado em</dt>
                  <dd>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</dd>
                </div>
              </dl>

              <div className="catalog-card-actions">
                <CatalogRegistryIconActions
                  editLabel={`Editar usuário ${u.name}`}
                  deleteLabel={`Excluir usuário ${u.name}`}
                  showDelete={user.role === 'admin'}
                  onEdit={() => openEditForm(u)}
                  onDelete={() => void handleDelete(u)}
                />
              </div>
            </article>
          ))}
        </div>
        {listMeta && listMeta.total > 0 ? (
          <div className="users-pagination-wrap">
            <CatalogPagination
              page={listMeta.page}
              totalPages={listMeta.totalPages}
              total={listMeta.total}
              limit={limit}
              disabled={loading}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </div>
        ) : null}
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
