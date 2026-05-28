import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type ModalPortalProps = {
  isOpen: boolean;
  children: React.ReactNode;
};

/** Renderiza no `body` para `position: fixed` centralizar na viewport (ignora scroll/transform dos pais). */
const ModalPortal: React.FC<ModalPortalProps> = ({ isOpen, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return createPortal(children, document.body);
};

export default ModalPortal;
