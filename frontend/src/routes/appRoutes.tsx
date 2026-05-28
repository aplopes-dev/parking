import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { getFlatRoutes } from '../config/navigation';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import ModulePlaceholder from '../pages/ModulePlaceholder';
import Users from '../pages/Users';
import MyProfile from '../pages/MyProfile';
import ProductGroups from '../pages/catalog/ProductGroups';
import Products from '../pages/catalog/Products';
import Customers from '../pages/catalog/Customers';
import StockLocations from '../pages/stock/StockLocations';
import StockMovements from '../pages/stock/StockMovements';
import StockAdjustment from '../pages/stock/StockAdjustment';
import StockMinimums from '../pages/stock/StockMinimums';
import TechnicalSheets from '../pages/stock/TechnicalSheets';
import RecipeProduction from '../pages/stock/RecipeProduction';
import CrmCustomers from '../pages/crm/CrmCustomers';
import CrmCampaigns from '../pages/crm/CrmCampaigns';
import CrmLoyalty from '../pages/crm/CrmLoyalty';
import MenuChannelPage from '../pages/menu/MenuChannelPage';
import PdvOnline from '../pages/pdv/PdvOnline';
import PdvTablet from '../pages/pdv/PdvTablet';
import PdvLogs from '../pages/pdv/PdvLogs';
import PdvBalcao from '../pages/pdv/PdvBalcao';
import PdvComanda from '../pages/pdv/PdvComanda';
import PdvDelivery from '../pages/pdv/PdvDelivery';
import PdvDeliveryPanel from '../pages/pdv/PdvDeliveryPanel';
import PdvMaps from '../pages/pdv/PdvMaps';
import PdvCloseOrder from '../pages/pdv/PdvCloseOrder';
import PdvServiceFee from '../pages/pdv/PdvServiceFee';
import HomeRouter from '../pages/HomeRouter';
import KitchenQueue from '../pages/kitchen/KitchenQueue';
import PaymentSettingsPage from '../pages/payments/PaymentSettingsPage';
import FinancePage from '../pages/finance/FinancePage';
import { FINANCE_TAB_PATHS } from '../pages/finance/financeTabRoutes';
import {
  FinanceAdvancesPage,
  FinanceBillsPage,
  FinanceCalendarPage,
  FinanceCardPage,
  FinanceCashPage,
  FinanceDailyPage,
  FinanceDrcPage,
  FinanceDrePage,
  FinancePayrollPage,
  FinancePrepaidPage,
  FinanceReconciliationPage,
  FinanceReceiptsPage,
  FinanceRecurringPage,
  FinanceSettlePage,
  FinanceStatementPage,
  FinanceTransfersPage,
} from '../pages/finance/financeMenuPages';
import {
  FiscalAccountantsPage,
  FiscalCancelPage,
  FiscalEmitPage,
  FiscalImportPage,
  FiscalInvoicesPage,
  FiscalListPage,
  FiscalOrdersPage,
  FiscalReturnsPage,
  FiscalVoidPage,
} from '../pages/fiscal/fiscalMenuPages';
import {
  AnalyticsIndicatorsPage,
  AnalyticsOnlinePage,
  AnalyticsRealtimePage,
} from '../pages/analytics/analyticsMenuPages';
import {
  ReportsFinancePage,
  ReportsOverviewPage,
  ReportsSalesPage,
  ReportsStockPage,
} from '../pages/analytics/reportsMenuPages';
import ProductionNotificationsPage from '../pages/production/ProductionNotificationsPage';
import {
  DeliveryManagementPage,
  DeliveryMotoboysPage,
} from '../pages/delivery/deliveryMenuPages';
import {
  MultistoreReportsPage,
  MultistoreUnitsPage,
} from '../pages/multistore/multistoreMenuPages';
import {
  ParkingEntryPage,
  ParkingFacilitiesPage,
  ParkingSessionsPage,
  ParkingSpotsPage,
  ParkingTariffsPage,
} from '../pages/parking/parkingMenuPages';
import { ParkingContractsPage } from '../pages/parking/parkingContractsPages';
import { ParkingValetPage } from '../pages/parking/parkingValetPages';
import { ParkingCashPage } from '../pages/parking/parkingCashPages';
import { ParkingLprPage, ParkingGatesPage } from '../pages/parking/parkingHardwarePages';
import { ParkingReportsPage } from '../pages/parking/parkingReportsPages';
import { ParkingVehiclesPage } from '../pages/parking/parkingVehiclesPages';
import { ParkingBillingPage } from '../pages/parking/parkingBillingPages';
import { AppUserRole } from '../types/userRole';

const DEFAULT_ROUTE_ROLES: AppUserRole[] = ['admin', 'manager', 'developer', 'hr', 'garcom', 'cozinha'];

const IMPLEMENTED: Record<string, React.ReactElement> = {
  '/': <HomeRouter />,
  '/operacao/entrada-saida': <ParkingEntryPage />,
  '/operacao/caixa': <ParkingCashPage />,
  '/operacao/sessoes': <ParkingSessionsPage />,
  '/estacionamento/unidades': <ParkingFacilitiesPage />,
  '/estacionamento/vagas': <ParkingSpotsPage />,
  '/estacionamento/tarifas': <ParkingTariffsPage />,
  '/estacionamento/mensalistas': <ParkingContractsPage />,
  '/estacionamento/cobranca': <ParkingBillingPage />,
  '/estacionamento/valet': <ParkingValetPage />,
  '/producao/kds': <KitchenQueue />,
  '/cadastros/grupos-produtos': <ProductGroups />,
  '/cadastros/produtos': <Products />,
  '/cadastros/clientes': <Customers />,
  '/cadastros/veiculos': <ParkingVehiclesPage />,
  '/estoque/locais': <StockLocations />,
  '/estoque/entrada-saida': <StockMovements />,
  '/estoque/acerto': <StockAdjustment />,
  '/estoque/minimo': <StockMinimums />,
  '/estoque/ficha-tecnica': <TechnicalSheets />,
  '/estoque/producao-receitas': <RecipeProduction />,
  '/crm/clientes': <CrmCustomers />,
  '/crm/campanhas': <CrmCampaigns />,
  '/crm/fidelidade': <CrmLoyalty />,
  '/cardapio/mesa': <MenuChannelPage />,
  '/cardapio/delivery': <MenuChannelPage />,
  '/pdv/online': <PdvOnline />,
  '/pdv/tablet': <PdvTablet />,
  '/pdv/logs': <PdvLogs />,
  '/pdv/balcao': <PdvBalcao />,
  '/pdv/comanda': <PdvComanda />,
  '/pdv/delivery': <PdvDelivery />,
  '/pdv/painel-entregas': <PdvDeliveryPanel />,
  '/pdv/maps': <PdvMaps />,
  '/pdv/fechar-pedido': <PdvCloseOrder />,
  '/pdv/taxa-servico': <PdvServiceFee />,
  '/pagamentos/configuracao': <PaymentSettingsPage />,
  '/integracoes/lpr': <ParkingLprPage />,
  '/integracoes/catracas': <ParkingGatesPage />,
  '/financeiro': <Navigate to="/financeiro/lancamentos" replace />,
  ...Object.fromEntries(FINANCE_TAB_PATHS.map((path) => [path, <FinancePage key={path} />])),
  '/financeiro/folha': <FinancePayrollPage />,
  '/financeiro/contas': <FinanceBillsPage />,
  '/financeiro/baixa-contas': <FinanceSettlePage />,
  '/financeiro/transferencias': <FinanceTransfersPage />,
  '/financeiro/calendario': <FinanceCalendarPage />,
  '/financeiro/recorrentes': <FinanceRecurringPage />,
  '/financeiro/adiantamento': <FinanceAdvancesPage />,
  '/financeiro/extrato': <FinanceStatementPage />,
  '/financeiro/recibos': <FinanceReceiptsPage />,
  '/financeiro/conferencia-diaria': <FinanceDailyPage />,
  '/financeiro/caixas': <FinanceCashPage />,
  '/financeiro/dre': <FinanceDrePage />,
  '/financeiro/drc': <FinanceDrcPage />,
  '/financeiro/cartao': <FinanceCardPage />,
  '/financeiro/conciliacao': <FinanceReconciliationPage />,
  '/financeiro/credito-prepago': <FinancePrepaidPage />,
  '/analytics/tempo-real': <AnalyticsRealtimePage />,
  '/analytics/indicadores': <AnalyticsIndicatorsPage />,
  '/analytics/acesso-online': <AnalyticsOnlinePage />,
  '/relatorios': <ReportsOverviewPage />,
  '/relatorios/estacionamento': <ParkingReportsPage />,
  '/relatorios/vendas': <ReportsSalesPage />,
  '/relatorios/estoque': <ReportsStockPage />,
  '/relatorios/financeiro': <ReportsFinancePage />,
  '/fiscal/pedidos': <FiscalOrdersPage />,
  '/fiscal/devolucoes': <FiscalReturnsPage />,
  '/fiscal/listagem': <FiscalListPage />,
  '/fiscal/notas': <FiscalInvoicesPage />,
  '/fiscal/importacao': <FiscalImportPage />,
  '/fiscal/emissao': <FiscalEmitPage />,
  '/fiscal/cancelamento': <FiscalCancelPage />,
  '/fiscal/inutilizacao': <FiscalVoidPage />,
  '/fiscal/contador': <FiscalAccountantsPage />,
  '/producao/notificacao-pedidos': <ProductionNotificationsPage />,
  '/entregas/gerenciamento': <DeliveryManagementPage />,
  '/entregas/motoboys': <DeliveryMotoboysPage />,
  '/multilojas/unidades': <MultistoreUnitsPage />,
  '/multilojas/relatorios': <MultistoreReportsPage />,
  '/usuarios': <Users />,
  '/meu-perfil': <MyProfile />,
};

function wrapWithRoleGuard(
  element: React.ReactElement,
  allowedRoles?: readonly AppUserRole[],
): React.ReactElement {
  return (
    <RoleProtectedRoute allowedRoles={allowedRoles}>
      {element}
    </RoleProtectedRoute>
  );
}

export function buildModuleRoutes(): React.ReactElement[] {
  const flat = getFlatRoutes();
  const seen = new Set<string>();

  const routes = flat
    .filter((route) => {
      if (seen.has(route.path)) return false;
      seen.add(route.path);
      return true;
    })
    .map((route) => {
      const base =
        IMPLEMENTED[route.path] ?? (
          <ModulePlaceholder
            title={route.label}
            module={route.moduleLabel}
            description={route.description}
          />
        );

      const allowedRoles = route.roles?.length ? route.roles : DEFAULT_ROUTE_ROLES;
      const element = wrapWithRoleGuard(base, allowedRoles);
      const path = route.path === '/' ? '/' : route.path.replace(/^\//, '');

      return <Route key={route.path} path={path} element={element} />;
    });

  for (const [implPath, implElement] of Object.entries(IMPLEMENTED)) {
    if (seen.has(implPath)) continue;
    seen.add(implPath);
    const element = wrapWithRoleGuard(implElement, DEFAULT_ROUTE_ROLES);
    const path = implPath.replace(/^\//, '');
    routes.push(<Route key={implPath} path={path} element={element} />);
  }

  return routes;
}
