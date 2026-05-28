import React, { RefObject } from 'react';
import { formatItemQty, formatMoney } from '../../pdv/pdvUtils';
import { DisplayOrderLine } from '../orderLineUtils';
import type { SmartPosPermissions } from '../../../hooks/usePermissions';
import { MobileBootstrap, MobileTable } from '../smartPosTypes';
import SmartPosOrderTotals from './SmartPosOrderTotals';

type SmartPosPanelProps = {
  selectedTable: MobileTable | undefined;
  groupedOrderLines: DisplayOrderLine[];
  bootstrap: MobileBootstrap | null;
  userName: string | undefined;
  actionLoading: boolean;
  tableIsFree: boolean;
  tableIsClosed: boolean;
  tableAwaitingPayment: boolean;
  tableHasOpenSession: boolean;
  hasMenuItems: boolean;
  canSendToProduction: boolean;
  permissions: SmartPosPermissions;
  /** Alvo de scroll em layout empilhado (mobile/tablet). */
  actionsBlockRef?: RefObject<HTMLDivElement | null>;
  onOpenTable: () => void;
  onAddItem: () => void;
  onRemoveItem: () => void;
  onSendToProduction: () => void;
  onPayment: () => void;
  onCloseAccount: () => void;
  onPrintReceipt: () => void;
  onFreeTable: () => void;
};

const SmartPosPanel: React.FC<SmartPosPanelProps> = ({
  selectedTable,
  groupedOrderLines,
  bootstrap,
  userName,
  actionLoading,
  tableIsFree,
  tableIsClosed,
  tableAwaitingPayment,
  tableHasOpenSession,
  hasMenuItems,
  canSendToProduction,
  permissions,
  actionsBlockRef,
  onOpenTable,
  onAddItem,
  onRemoveItem,
  onSendToProduction,
  onPayment,
  onCloseAccount,
  onPrintReceipt,
  onFreeTable,
}) => {
  const canEditSession = tableHasOpenSession;
  const showSendToProduction =
    tableHasOpenSession && groupedOrderLines.length > 0;
  const canCloseAccount =
    permissions.canRequestCloseAccount &&
    Boolean(selectedTable) &&
    tableHasOpenSession &&
    groupedOrderLines.length > 0;
  const canRegisterPayment =
    permissions.canRegisterPayment && Boolean(selectedTable) && tableAwaitingPayment;
  const showPrintBill =
    permissions.canPrintReceipt &&
    Boolean(selectedTable) &&
    (tableAwaitingPayment || tableIsClosed) &&
    !tableIsFree;
  const showFreeTable =
    permissions.canFreeTable && Boolean(selectedTable);
  const serviceFeePercent = bootstrap?.settings.defaultServiceFeePercent ?? 10;

  return (
    <aside className="smartpos-panel" aria-label="Detalhes da mesa">
      <div className="smartpos-panel-block">
        <h3>{selectedTable ? `Mesa ${selectedTable.number}` : 'Selecione uma mesa'}</h3>
        {selectedTable?.session ? (
          <>
            <p className="smartpos-panel-meta">
              Pedido #{selectedTable.session.orderNumber}
              {selectedTable.session.waiterName
                ? ` · ${selectedTable.session.waiterName}`
                : ''}
            </p>
            <ul className="smartpos-order-lines">
              {groupedOrderLines.map((line) => (
                <li key={line.key}>
                  <span>
                    {formatItemQty(line.quantity)}× {line.productName}
                  </span>
                  <span>{formatMoney(line.total)}</span>
                </li>
              ))}
            </ul>
            <SmartPosOrderTotals
              session={selectedTable.session}
              tableStatus={selectedTable.status}
              defaultServiceFeePercent={serviceFeePercent}
            />
          </>
        ) : selectedTable ? (
          <p className="smartpos-panel-meta">Mesa livre — abra para iniciar o atendimento.</p>
        ) : null}
      </div>

      <div
        ref={actionsBlockRef}
        id="smartpos-actions"
        className="smartpos-panel-block smartpos-panel-block--actions"
      >
        <h3>Ações</h3>
        <div className="smartpos-actions" aria-busy={actionLoading}>
          {permissions.canOpenTable ? (
            <button
              type="button"
              className="catalog-action-button"
              disabled={actionLoading || !selectedTable || !tableIsFree}
              onClick={onOpenTable}
            >
              Abrir mesa
            </button>
          ) : null}
          {permissions.canAddItem ? (
            <button
              type="button"
              className="catalog-action-button is-secondary"
              disabled={
                actionLoading || !selectedTable || !hasMenuItems || !canEditSession
              }
              onClick={onAddItem}
            >
              Adicionar item
            </button>
          ) : null}
          {permissions.canRemoveItem ? (
            <button
              type="button"
              className="catalog-action-button is-danger"
              disabled={
                actionLoading ||
                !selectedTable ||
                groupedOrderLines.length === 0 ||
                !canEditSession
              }
              onClick={onRemoveItem}
            >
              Remover item
            </button>
          ) : null}
          {permissions.canSendToProduction && showSendToProduction ? (
            <button
              type="button"
              className="catalog-action-button is-accent smartpos-send-production-btn"
              disabled={actionLoading || !canSendToProduction}
              onClick={(e) => {
                e.stopPropagation();
                onSendToProduction();
              }}
              title={
                canSendToProduction
                  ? 'Envia itens pendentes para a cozinha (KDS)'
                  : 'Itens já enviados — adicione novos itens para enviar de novo'
              }
            >
              Enviar para produção
            </button>
          ) : null}
          {permissions.canRequestCloseAccount ? (
            <button
              type="button"
              className="catalog-action-button"
              disabled={actionLoading || !canCloseAccount}
              onClick={onCloseAccount}
              title={
                permissions.canRegisterPayment
                  ? 'Encerra a conta para pagamento (não permite mais alterar itens)'
                  : 'Solicita ao caixa/admin o encerramento da conta'
              }
            >
              {permissions.closeAccountLabel}
            </button>
          ) : null}
          {showPrintBill ? (
            <button
              type="button"
              className="catalog-action-button is-secondary"
              disabled={actionLoading}
              onClick={onPrintReceipt}
              title={
                tableIsClosed
                  ? 'Reimprimir comprovante de pagamento'
                  : 'Imprimir conferência de conta para o cliente'
              }
            >
              {tableIsClosed ? 'Reimprimir cupom' : 'Imprimir conferência'}
            </button>
          ) : null}
          {permissions.canRegisterPayment ? (
            <button
              type="button"
              className="catalog-action-button is-secondary"
              disabled={actionLoading || !canRegisterPayment}
              onClick={onPayment}
              title={
                canRegisterPayment
                  ? 'Registrar pagamento da conta encerrada'
                  : 'Encerre a conta antes de registrar o pagamento'
              }
            >
              Registrar pagamento
            </button>
          ) : null}
          {showFreeTable ? (
            <button
              type="button"
              className="catalog-action-button is-danger"
              disabled={actionLoading}
              onClick={onFreeTable}
              title="Libera a mesa após o pagamento confirmado"
            >
              Liberar mesa
            </button>
          ) : null}
        </div>
        {userName ? (
          <p className="smartpos-panel-operator">Operador: {userName}</p>
        ) : null}
      </div>
    </aside>
  );
};

export default SmartPosPanel;
