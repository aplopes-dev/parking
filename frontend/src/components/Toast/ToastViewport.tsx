import React from 'react';
import { ToastItem, ToastType } from '../../contexts/ToastContext';
import '../../pages/catalog/Catalog.css';
import './Toast.css';

type ToastViewportProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

const KICKER: Record<ToastType, string> = {
  success: 'Sucesso',
  error: 'Erro',
  info: 'Informação',
};

const ToastViewport: React.FC<ToastViewportProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-viewport"
      role="region"
      aria-label="Notificações"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="status"
        >
          <div className="toast__body">
            <span className="catalog-section-kicker toast__kicker">{KICKER[toast.type]}</span>
            <p className="toast__message">{toast.message}</p>
          </div>
          <button
            type="button"
            className="toast__dismiss"
            onClick={() => onDismiss(toast.id)}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastViewport;
