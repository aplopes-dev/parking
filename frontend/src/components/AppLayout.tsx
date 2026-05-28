import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Layout from './Layout';

const AppLayout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Layout>
      <div key={location.pathname} className="app-page-transition">
        <Outlet />
      </div>
    </Layout>
  );
};

export default AppLayout;
