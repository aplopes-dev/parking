import React from 'react';
import ModalPortal from './ModalPortal';
import './AppModal.css';

export type RegistryFormModalProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  wide?: boolean;
  modalClassName?: string;
  isSaving?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Rodapé fora do `<form>` (ex.: só botões Cancelar/Salvar). */
  footer?: React.ReactNode;
  /** Quando informado, envolve `children` + `footer` em um `<form>`. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  titleId?: string;
};

const RegistryFormModal: React.FC<RegistryFormModalProps> = ({
  isOpen,
  title,
  subtitle,
  wide = false,
  modalClassName = '',
  isSaving = false,
  onClose,
  children,
  footer,
  onSubmit,
  titleId = 'registry-form-modal-title',
}) => {
  const body = (
    <>
      <div className={`app-modal-body registry-form-modal-body${onSubmit ? '' : ' registry-form-modal-body--plain'}`}>
        {children}
      </div>
      {footer ? <div className="app-modal-footer registry-form-modal-footer">{footer}</div> : null}
    </>
  );

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        onClick={isSaving ? undefined : onClose}
        role="presentation"
      >
        <div
          className={`app-modal app-modal--responsive registry-form-modal${wide ? ' app-modal--wide' : ''}${modalClassName ? ` ${modalClassName}` : ''}`.trim()}
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
              disabled={isSaving}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          {onSubmit ? (
            <form className="registry-form-modal-form" onSubmit={onSubmit}>
              {body}
            </form>
          ) : (
            body
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

/** Impede fechar o modal durante salvamento (padrão Food `formDialogOpenChange`). */
export function registryModalCloseGuard(onClose: () => void, isSaving = false) {
  return () => {
    if (!isSaving) onClose();
  };
}

export function registryModalFooterButtons({
  onClose,
  isSaving,
  submitLabel,
  cancelLabel = 'Cancelar',
}: {
  onClose: () => void;
  isSaving?: boolean;
  submitLabel: string;
  cancelLabel?: string;
}) {
  return (
    <>
      <button
        type="button"
        className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
        disabled={isSaving}
        onClick={onClose}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        className={`catalog-form-footer-btn catalog-form-footer-btn--primary${isSaving ? ' is-loading' : ''}`}
        disabled={isSaving}
      >
        {isSaving ? 'Salvando…' : submitLabel}
      </button>
    </>
  );
}

export default RegistryFormModal;
