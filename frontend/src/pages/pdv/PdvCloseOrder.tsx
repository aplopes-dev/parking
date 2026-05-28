import React, { useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import PdvCloseOrderContent from './PdvCloseOrderContent';
import '../finance/Finance.css';

const PdvCloseOrder: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';
  const canOperate = Boolean(user);

  if (!canOperate) return <div className="container">Acesso negado</div>;

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="PDV"
      modulePath="/pdv/online"
      title="Fechar pedido"
      description="Registre pagamentos e finalize pedidos abertos."
    >
      <section className="catalog-surface catalog-form-surface--premium finance-section">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Caixa</span>
            <h2>Pagamento do pedido</h2>
          </div>
        </div>
        <PdvCloseOrderContent initialOrderId={initialOrderId} inModal={false} />
      </section>
    </CatalogPageLayout>
  );
};

export default PdvCloseOrder;
