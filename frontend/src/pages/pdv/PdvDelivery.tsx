import React from 'react';
import PdvWorkspace from './PdvWorkspace';

const PdvDelivery: React.FC = () => (
  <PdvWorkspace
    orderType="delivery"
    title="Pedidos de delivery"
    description="Delivery com endereço, taxa de entrega e painel de status."
    showDelivery
    newOrderInModal
    billSplitInModal
    closeOrderInModal
    useKitchenFlow
  />
);

export default PdvDelivery;
