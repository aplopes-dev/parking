import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ModalDialog.css';

type ModalDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  titleId?: string;
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** `<dialog>` nativo: semântica + foco previsível para teclado (Escape fecha). */
const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  titleId,
  children,
  className = '',
  closeOnBackdrop = true,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fallbackTitleId = useId();
  const labelledBy = titleId ?? fallbackTitleId;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const nodes = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = 'hidden';
      const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
      dialog.addEventListener('keydown', trapFocus);
      return () => {
        dialog.removeEventListener('keydown', trapFocus);
        document.body.style.overflow = '';
      };
    }

    if (dialog.open) dialog.close();
    previousFocusRef.current?.focus();
    document.body.style.overflow = '';
    return undefined;
  }, [isOpen, trapFocus]);

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    onClose();
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return;
    // Clique direto no `<dialog>` (área fora do painel) fecha; clique no conteúdo não.
    if (e.target === dialogRef.current) onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`modal-dialog ${className}`.trim()}
      aria-labelledby={labelledBy}
      onCancel={handleCancel}
      onClick={handleBackdrop}
    >
      {children}
    </dialog>,
    document.body,
  );
};

export default ModalDialog;
