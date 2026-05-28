import React, { useMemo, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import { Order } from '../../types';
import '../../components/AppModal.css';

type PdvDeliveryAddressModalProps = {
  isOpen: boolean;
  saving: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (patch: { deliveryAddress: string }) => void | Promise<void>;
};

type DeliveryAddressParts = {
  street: string;
  number: string;
  complement: string;
  reference: string;
};

function parseDeliveryAddress(value: string): DeliveryAddressParts {
  const raw = value.trim();
  if (!raw) return { street: '', number: '', complement: '', reference: '' };

  const [first = '', extras = ''] = raw.split(' — ');
  const firstMatch = first.match(/^(.*?)(?:,\s*Nº\s*(.+))?$/);
  const street = (firstMatch?.[1] ?? first).trim();
  const number = (firstMatch?.[2] ?? '').trim();

  let complement = '';
  let reference = '';
  const extraParts = extras
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of extraParts) {
    if (part.toLowerCase().startsWith('compl.')) {
      complement = part.replace(/^compl\.\s*/i, '').trim();
    } else if (part.toLowerCase().startsWith('ref.')) {
      reference = part.replace(/^ref\.\s*/i, '').trim();
    }
  }

  return { street, number, complement, reference };
}

function buildDeliveryAddress(parts: DeliveryAddressParts): string {
  const street = parts.street.trim();
  const number = parts.number.trim();
  const complement = parts.complement.trim();
  const reference = parts.reference.trim();

  const firstLine = [street, number && `Nº ${number}`].filter(Boolean).join(', ');
  const extras = [complement && `Compl. ${complement}`, reference && `Ref. ${reference}`]
    .filter(Boolean)
    .join(' | ');

  return [firstLine, extras].filter(Boolean).join(' — ');
}

const PdvDeliveryAddressModal: React.FC<PdvDeliveryAddressModalProps> = ({
  isOpen,
  saving,
  order,
  onClose,
  onSubmit,
}) => {
  const initialAddress = useMemo(
    () => parseDeliveryAddress((order?.deliveryAddress ?? '').trim()),
    [order?.deliveryAddress],
  );
  const [street, setStreet] = useState(initialAddress.street);
  const [number, setNumber] = useState(initialAddress.number);
  const [complement, setComplement] = useState(initialAddress.complement);
  const [reference, setReference] = useState(initialAddress.reference);

  React.useEffect(() => {
    if (!isOpen) return;
    setStreet(initialAddress.street);
    setNumber(initialAddress.number);
    setComplement(initialAddress.complement);
    setReference(initialAddress.reference);
  }, [initialAddress, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit({
      deliveryAddress: buildDeliveryAddress({ street, number, complement, reference }),
    });
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="app-modal-overlay" role="presentation" onClick={saving ? undefined : onClose}>
        <div
          className="app-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdv-delivery-address-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="app-modal-header">
            <div>
              <h3 id="pdv-delivery-address-title">Endereço de entrega</h3>
              <p className="app-modal-subtitle">Atualize os dados de endereço do pedido.</p>
            </div>
            <button
              type="button"
              className="app-modal-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <form className="app-modal-body" onSubmit={handleSubmit}>
            <div className="catalog-form-grid">
              <div className="form-group">
                <label htmlFor="pdv-delivery-street-modal">Endereço</label>
                <input
                  id="pdv-delivery-street-modal"
                  className="premium-text-input"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Rua / avenida"
                />
              </div>
              <div className="form-group">
                <label htmlFor="pdv-delivery-number-modal">Número</label>
                <input
                  id="pdv-delivery-number-modal"
                  className="premium-text-input"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="123"
                />
              </div>
              <div className="form-group">
                <label htmlFor="pdv-delivery-reference-modal">Local de referência</label>
                <input
                  id="pdv-delivery-reference-modal"
                  className="premium-text-input"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Próximo a..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="pdv-delivery-complement-modal">Complemento</label>
                <input
                  id="pdv-delivery-complement-modal"
                  className="premium-text-input"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto, bloco, casa"
                />
              </div>
            </div>
            <div className="app-modal-footer">
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                disabled={saving}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default PdvDeliveryAddressModal;
