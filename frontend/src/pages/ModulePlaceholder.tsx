import React from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../components/CatalogPageLayout';

type ModulePlaceholderProps = {
  title: string;
  module?: string;
  description?: string;
};

const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  module,
  description,
}) => (
  <CatalogPageLayout
    moduleLabel={module ?? 'Módulo'}
    title={title}
    description={
      description ??
      'Esta funcionalidade será implementada em breve. A estrutura de menus já está preparada conforme o escopo do sistema.'
    }
  >
    <section className="catalog-surface">
      <div className="catalog-empty">
        Em desenvolvimento. Em breve você poderá usar esta tela diretamente pelo menu.
      </div>
      <p style={{ marginTop: 20 }}>
        <Link to="/" className="catalog-action-button">
          Voltar ao painel geral
        </Link>
      </p>
    </section>
  </CatalogPageLayout>
);

export default ModulePlaceholder;
