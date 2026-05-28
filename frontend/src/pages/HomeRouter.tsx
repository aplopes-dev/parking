import React from 'react';
import { ParkingDashboardPage } from './parking/parkingMenuPages';

/** Rota `/`: painel de estacionamento. */
const HomeRouter: React.FC = () => {
  return <ParkingDashboardPage />;
};

export default HomeRouter;
