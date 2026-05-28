import React from 'react';
import ModalPortal from './ModalPortal';
import './AppModal.css';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  loadingLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirmar ação',
  message,
  subtitle,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  loadingLabel,
  variant = 'danger',
  onConfirm,
  onClose,
}) => {
  const titleId = 'confirm-modal-title';
  const resolvedLoadingLabel =
    loadingLabel ?? (confirmLabel === 'Excluir' ? 'Excluindo…' : 'Aguarde…');

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        onClick={isLoading ? undefined : onClose}
        role="presentation"
      >
        <div
          className="app-modal confirm-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="app-modal-header">
            <div>
              <h3 id={titleId}>{title}</h3>
              {subtitle ? <p className="app-modal-subtitle">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              className="app-modal-close"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <div className="app-modal-body">
            <p>{message}</p>
          </div>

          <div className="app-modal-footer">
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`catalog-form-footer-btn catalog-form-footer-btn--primary${
                variant === 'danger' ? ' catalog-form-footer-btn--danger' : ''
              }${isLoading ? ' is-loading' : ''}`}
              onClick={() => void onConfirm()}
              disabled={isLoading}
            >
              {isLoading ? resolvedLoadingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ConfirmModal;
