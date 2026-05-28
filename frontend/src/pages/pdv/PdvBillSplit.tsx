import React, { useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import PdvBillSplitContent from './PdvBillSplitContent';
import '../finance/Finance.css';

const PdvBillSplit: React.FC = () => {
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
      title="Divisão de conta"
      description="Divida o total do pedido entre pessoas ou formas de pagamento."
    >
      <section className="catalog-surface catalog-form-surface--premium finance-section">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Conta</span>
            <h2>Partes da divisão</h2>
          </div>
        </div>
        <PdvBillSplitContent initialOrderId={initialOrderId} inModal={false} />
      </section>
    </CatalogPageLayout>
  );
};

export default PdvBillSplit;
