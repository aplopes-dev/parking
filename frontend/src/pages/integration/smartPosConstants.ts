import { MobileTableStatus } from './smartPosTypes';

/** Largura em que o painel de ações fica abaixo do mapa de mesas. */
export const SMARTPOS_STACK_BREAKPOINT_PX = 1100;

export const STATUS_LABEL: Record<MobileTableStatus, string> = {
  free: 'Livre',
  open: 'Em atendimento',
  payment_pending: 'Aguardando pagamento',
  closed: 'Encerrada',
};
