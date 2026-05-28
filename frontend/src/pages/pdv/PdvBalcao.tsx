import React from 'react';
import PdvWorkspace from './PdvWorkspace';

const PdvBalcao: React.FC = () => (
  <PdvWorkspace
    orderType="balcao"
    title="Pedidos de balcão"
    description="Atendimento rápido no balcão com fechamento no caixa."
    newOrderInModal
    billSplitInModal
    closeOrderInModal
    useKitchenFlow
    showTableSelect
  />
);

export default PdvBalcao;
