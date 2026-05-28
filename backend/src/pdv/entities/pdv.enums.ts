export enum OrderType {
  BALCAO = 'balcao',
  COMANDA = 'comanda',
  DELIVERY = 'delivery',
  TABLET = 'tablet',
  ONLINE = 'online',
}

export enum OrderStatus {
  ABERTO = 'aberto',
  CONFIRMADO = 'confirmado',
  PREPARANDO = 'preparando',
  PRONTO = 'pronto',
  EM_ENTREGA = 'em_entrega',
  FECHADO = 'fechado',
  CANCELADO = 'cancelado',
}

export enum PaymentMethod {
  DINHEIRO = 'dinheiro',
  PIX = 'pix',
  CARTAO_DEBITO = 'cartao_debito',
  CARTAO_CREDITO = 'cartao_credito',
  VALE = 'vale',
}

export enum ComandaStatus {
  LIVRE = 'livre',
  OCUPADA = 'ocupada',
  RESERVADA = 'reservada',
}
