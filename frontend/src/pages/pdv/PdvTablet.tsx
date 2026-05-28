import React from 'react';
import PdvWorkspace from './PdvWorkspace';

const PdvTablet: React.FC = () => (
  <PdvWorkspace
    orderType="tablet"
    title="Pedidos por tablet"
    description="Garçons lançam pedidos direto da mesa via tablet."
    showTableSelect
    newOrderInModal
    billSplitInModal
    closeOrderInModal
    useKitchenFlow
  />
);

export default PdvTablet;
