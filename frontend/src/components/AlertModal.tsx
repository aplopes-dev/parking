import React from 'react';
import ModalPortal from './ModalPortal';
import './AppModal.css';
import './AlertModal.css';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}

const KICKER: Record<NonNullable<AlertModalProps['type']>, string> = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Informação',
};

const DEFAULT_TITLE: Record<NonNullable<AlertModalProps['type']>, string> = {
  success: 'Operação concluída',
  error: 'Não foi possível concluir',
  warning: 'Verifique os dados',
  info: 'Informação',
};

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'error',
}) => {
  const titleId = 'alert-modal-title';
  const resolvedTitle = title ?? DEFAULT_TITLE[type];
  const kicker = KICKER[type];

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        onClick={onClose}
        role="presentation"
      >
        <div
          className={`app-modal alert-modal alert-modal--${type}`}
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="app-modal-header">
            <div>
              <span className="catalog-section-kicker">{kicker}</span>
              <h3 id={titleId}>{resolvedTitle}</h3>
            </div>
            <button
              type="button"
              className="app-modal-close"
              onClick={onClose}
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
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
              onClick={onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AlertModal;
