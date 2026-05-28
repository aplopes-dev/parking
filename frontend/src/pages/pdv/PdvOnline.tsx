import React from 'react';
import PdvWorkspace from './PdvWorkspace';

const PdvOnline: React.FC = () => (
  <PdvWorkspace
    orderType="online"
    title="PDV online"
    description="Pedidos digitais e autoatendimento no balcão virtual."
    newOrderInModal
    billSplitInModal
    closeOrderInModal
    useKitchenFlow
    showTableSelect
  />
);

export default PdvOnline;
