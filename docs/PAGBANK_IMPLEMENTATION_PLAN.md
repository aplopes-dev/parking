# Plano de implementação — fluxos PagBank

Referência principal: [Introdução API Platform](https://developer.pagbank.com.br/reference/introducao) · [Ambientes](https://developer.pagbank.com.br/docs/ambientes-disponiveis)

| Ambiente | Base URL Orders |
|----------|-----------------|
| Sandbox | `https://sandbox.api.pagseguro.com` |
| Produção | `https://api.pagseguro.com` |

Autenticação: `Authorization: Bearer <token>` (configurado em **Pagamentos → Configuração**).

---

## Princípios

1. **Um núcleo (`PagbankOrdersService`)** — todas as variantes de Order passam pelo mesmo cliente HTTP e pela tabela `pagbank_transactions`.
2. **Fluxo habilitado no tenant** — `pagbank_flows_config` + conjunto `PAGBANK_IMPLEMENTED_IN_CODE` no código.
3. **Vínculo com PDV** — pedido interno (`orders.id`) opcional; metadados PagBank em `order_payments` após confirmação.
4. **Split** — reutilizar `buildPagbankSplitsPayload()` em `charges[].splits` quando split ativo.
5. **Webhooks** — `POST /payments/pagbank/webhooks` atualiza transação e, se pago, registra pagamento no PDV.

---

## Fases

### Fase 1 — Núcleo Orders + Split + Webhook (em andamento)

| ID fluxo | Entrega |
|----------|---------|
| `orders_create` | POST PagBank `/orders` sem charge |
| `orders_pix` | Criar + pagar PIX (QR / copia e cola) |
| `orders_create_and_pay` | Criar com `charges` na mesma requisição |
| `orders_credit_card` | Charge `CREDIT_CARD` |
| `orders_debit_card` | Charge `DEBIT_CARD` |
| `orders_boleto` | Charge `BOLETO` |
| `orders_cancel` | POST cancel charge |
| `orders_capture` | POST capture charge |
| `split_payment` | Injetar `splits` no charge (já existia builder) |
| `split_create_then_pay` | Pay com splits |
| `split_create_and_pay` | Create com splits no charge |
| `split_query` | GET consulta divisão no pedido PagBank |
| `webhooks_orders` | Endpoint webhook + atualização de status |

**API interna:** `POST /payments/pagbank/checkout`, `GET /payments/pagbank/transactions`, `POST .../pay`, `POST .../cancel`, `POST .../capture`.

### Fase 2 — Cartões avançados e carteiras (implementada)

| ID | Entrega |
|----|---------|
| `orders_token_pagbank` | `payment.card.id` no checkout |
| `orders_token_card_brand` | `payment.card.networkToken` |
| `orders_3ds_pagbank` | `POST /payments/pagbank/3ds/session` + charge com `authentication` |
| `orders_3ds_external` | `payment.authentication` no checkout/pay |
| `orders_pci_card` | `payment.card.encrypted` |
| `orders_fee_pass_through` | `payment.fees.buyerInterest` |
| `orders_pagbank_qr` | Pedido com `qr_codes` (sem charge) |
| `orders_pagbank_deeplink` | Checkout + `payment.payload` |
| `orders_google_pay` / `orders_apple_pay` | `payment.wallet` em cartão |
| `orders_card_vault` | `POST /payments/pagbank/vault/cards` |
| `orders_recurrence_hint` / `orders_elo_recurrence` | `payment.recurring` / `eloRecurrence` |
| `orders_sdwo` | `payment.sdwo` mesclado no `payment_method` |

**UI:** PDV (Fechar pedido) e SmartPOS — painel PIX PagBank quando `orders_pix` está ativo.

**API:** `GET /payments/pagbank/capabilities`, DTOs estruturados em `payment.card`, `wallet`, `authentication`, etc.

### Fase 3 — Split avançado (implementada)

| ID | Entrega |
|----|---------|
| `split_custody` | `configurations.custody` nos recebedores secundários |
| `split_pix` | PIX + `charges[].splits` |
| `split_preauth_partial` | `capture: false` + split |
| `split_cancel` | `POST .../split/cancel` |
| `split_chargeback_recovery` | `chargeback.charge_transfer.percentage` no payload |
| `split_liable_mcc` | `configurations.liable` (recebedor `isLiable`) |
| `split_release_custody` | `POST /splits/{id}/custody/release` |
| `split_query` | `GET /splits/{split_id}` + campo `pagbank_split_id` |

### Fase 4 — Connect (marketplace) (implementada)

| ID | Entrega |
|----|---------|
| `connect_app` | Client ID / Secret + Redirect URI em configuração |
| `connect_authorization` | `GET /payments/pagbank/connect/authorize-url` |
| `connect_token` | Callback `GET .../connect/callback` + refresh |
| `connect_sms` | `POST .../connect/sms/request` + `.../sms/confirm` |

Tabela `pagbank_connect_accounts` armazena tokens por tenant.

**UI:** aba Geral — seção Connect; aba Split — painel custódia (agendar + liberar).

Módulo: `pagbank-connect/` · tokens por conta conectada.

### Fase 5 — Checkout hospedado ✅

| ID | Entrega |
|----|---------|
| `checkout_pagbank` | `POST /payments/pagbank/checkout/hosted`, refresh por `CHEC_*`, URLs return/redirect nas configurações |
| `webhooks_checkout` | Webhook unificado resolve transações por `pagbank_checkout_id` |
| Connect → split | `pagbank_connect_auto_sync_split` + sincronização automática ao vincular/listar contas |

### Fase 6 — Recorrente ✅

| ID | Entrega |
|----|---------|
| `recurring_plans` | `POST/GET /payments/pagbank/recurring/plans`, inativar, espelho local |
| `recurring_subscriptions` | Assinaturas, faturas, cancelamento, estorno `POST …/payments/:id/refund` |

Base: `api.assinaturas.pagseguro.com` (sandbox separado).

### Fase 7 — Transferência e cadastro ✅

| ID | Entrega |
|----|---------|
| `transfer_balance` | `POST/GET /payments/pagbank/transfers` (P2P/PIX, `secure.api.pagseguro.com`) |
| `account_register` | `POST/GET /payments/pagbank/registration/accounts` (Connect client id/secret) |
| `public_keys` | Sync chaves públicas |
| `mtls_certificate` | Upload cert mTLS |
| `edi_statements` | Import EDI / reconciliação |

### Fase 8 — Frontend PDV

- Botão “Cobrar PagBank” no fechamento de pedido (PIX / cartão).
- Exibir QR PIX e status em tempo real (polling ou webhook + refresh).
- Tela de transações PagBank no módulo Pagamentos.

---

## Modelo de dados

### `pagbank_transactions`

| Campo | Uso |
|-------|-----|
| `order_id` | Pedido PDV interno |
| `flow_id` | Ex.: `orders_pix` |
| `pagbank_order_id` | ID PagBank |
| `charge_id` | Charge ativa |
| `status` | `created`, `waiting_payment`, `paid`, `declined`, `canceled` |
| `payment_method` | PIX, CREDIT_CARD, … |
| `checkout_data` | QR, links, boleto (JSON) |
| `raw_*` | Auditoria |

---

## Ordem de desenvolvimento recomendada

1. Fase 1 (núcleo) — **agora**
2. Webhook em produção (nginx já com WS; incluir rota pública)
3. Fase 2 PIX no PDV + SmartPOS (prioridade negócio)
4. Split em produção com homologação PagBank
5. Fases 4–7 conforme produto (marketplace, assinatura, etc.)

---

## Homologação PagBank

- Usar sandbox e token de teste.
- Marcar fluxos como **ativos** só após teste em **Pagamentos → Fluxos**.
- Documentar casos de teste por fluxo em `docs/PAGBANK_TEST_CASES.md` (criar na Fase 1).

---

## Arquivos (Fase 1)

```
backend/src/payments/
  pagbank-api.config.ts
  pagbank-http.client.ts
  pagbank-flow.guard.ts
  pagbank-order.builder.ts
  pagbank-orders.service.ts
  pagbank-webhooks.service.ts
  pagbank-operations.controller.ts
  pagbank-webhooks.controller.ts
  dto/pagbank-orders.dto.ts
  entities/pagbank-transaction.entity.ts
```

Atualizar `PAGBANK_IMPLEMENTED_IN_CODE` em `pagbank-flows.catalog.ts` conforme cada fluxo for concluído.
