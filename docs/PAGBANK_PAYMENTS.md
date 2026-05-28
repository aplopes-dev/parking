# PagBank — Configuração de pagamentos

Painel: **Pagamentos → Configuração** (`/pagamentos/configuracao`).

Introdução oficial: [API Platform PagBank](https://developer.pagbank.com.br/reference/introducao).

## Abas

### 1. Geral e credenciais
- Ambiente sandbox / produção
- Token Bearer da API
- Botão **Testar token** — valida o Bearer nas APIs de Pedidos e Assinaturas (sem salvar)
- Chave pública (checkout transparente, 3DS)
- Connect (Client ID / Secret)
- URL de notificação de pedidos
- Soft descriptor e MCC

### 2. Fluxos PagBank
Catálogo com **todos os fluxos** documentados pela PagBank, agrupados por serviço:

| Categoria | Exemplos |
|-----------|----------|
| API de Pedidos | PIX, cartão, boleto, 3DS, tokens, Google/Apple Pay, captura, cancelamento |
| Divisão (split) | Split simples, custódia, PIX+split, liable MCC, chargeback |
| Connect | OAuth, SMS, access token |
| Checkout PagBank | Redirect checkout |
| Recorrente | Planos e assinaturas |
| Transferência | Entre contas |
| Cadastro | Criar contas de terceiros |
| Segurança | Chaves públicas, mTLS, webhooks |
| Complementares | EDI |

Cada item possui:
- Toggle **ativar** (roadmap / homologação)
- Link para documentação
- Campos extras (ex.: webhook URL no fluxo `webhooks_orders`)
- Badge **No sistema** quando já existe código no Aplopes Food

### 3. Divisão (split)
Configuração operacional do split (recebedores, percentuais, preview JSON).

Referência: [Divisão do pagamento](https://developer.pagbank.com.br/reference/divisao-de-pagamento).

### 4. Recorrente
Planos (`recurring_plans`) e assinaturas (`recurring_subscriptions`) — API `api.assinaturas.pagseguro.com`.

Guia completo (fluxo oficial, criptografia exclusiva, cartões sandbox, código): **[PAGBANK_RECURRING.md](./PAGBANK_RECURRING.md)**.

### 5. Transferência
P2P / PIX (`transfer_balance`) — API `secure.api.pagseguro.com`. Exige URL de notificação e liberação comercial PagBank.

### 6. Cadastro
Criar contas BUYER/SELLER/ENTERPRISE (`account_register`) — `POST /accounts` com Connect Client ID/Secret.

### 7. Testes Sandbox
- **Pedidos — cartões de teste** ([doc](https://developer.pagbank.com.br/docs/cartoes-de-teste)): 10 cenários (Visa, Mastercard, Amex, Elo, Hiper — aprovados e negados, 12/2030), botão **Pagar pedido** → `POST /orders` com cartão criptografado.
- **Assinaturas — recorrência**: 27 cenários com token `CARD_*`, botão **Assinatura** → `POST /subscriptions`.

- Recorrência: `https://sandbox.api.assinaturas.pagseguro.com`
- Pedidos: `https://sandbox.api.pagseguro.com`

| Método | Rota |
|--------|------|
| GET | `/payments/pagbank/test/panel` |
| POST | `/payments/pagbank/test/ensure-plan` |
| POST | `/payments/pagbank/test/recurring/run` |
| POST | `/payments/pagbank/test/orders/pix` |
| POST | `/payments/pagbank/test/orders/boleto` |
| POST | `/payments/pagbank/test/orders/split` |
| POST | `/payments/pagbank/test/orders/split/pix` |
| POST | `/payments/pagbank/test/orders/split/query` |

## API interna

| Método | Rota | Auth |
|--------|------|------|
| GET | `/payments/settings` | JWT |
| PATCH | `/payments/settings` | JWT (admin/manager) |
| GET | `/payments/pagbank-split` | JWT (legado) |
| POST | `/payments/pagbank/checkout` | JWT |
| POST | `/payments/pagbank/checkout/hosted` | JWT |
| POST | `/payments/pagbank/recurring/plans` | JWT |
| POST | `/payments/pagbank/recurring/subscriptions` | JWT |
| POST | `/payments/pagbank/transfers` | JWT |
| POST | `/payments/pagbank/registration/accounts` | JWT |
| GET | `/payments/pagbank/transactions` | JWT |
| GET | `/payments/pagbank/transactions/:id` | JWT |
| POST | `/payments/pagbank/transactions/:id/pay` | JWT |
| POST | `/payments/pagbank/transactions/:id/cancel` | JWT |
| POST | `/payments/pagbank/transactions/:id/capture` | JWT |
| GET | `/payments/pagbank/transactions/:id/split` | JWT |
| POST | `/payments/pagbank/transactions/:id/refresh` | JWT |
| POST | `/payments/pagbank/webhooks` | **Público** (PagBank) |
| GET | `/payments/pagbank/capabilities` | JWT |
| POST | `/payments/pagbank/vault/cards` | JWT |
| POST | `/payments/pagbank/3ds/session` | JWT |
| POST | `/payments/pagbank/transactions/:id/split/release-custody` | JWT |
| POST | `/payments/pagbank/transactions/:id/split/cancel` | JWT |

**Split avançado (checkout):** use `flowId` adequado (`split_custody`, `split_pix`, `split_liable_mcc`, etc.) e opcionalmente `splitOptions.custodyScheduled` (ISO 8601).

**Chargeback:** marque um recebedor como **liable** na aba Split; ative o fluxo `split_chargeback_recovery` — o secundário liable recebe `percentage: 100`.

### Connect (marketplace)

| Método | Rota |
|--------|------|
| GET | `/payments/pagbank/connect/authorize-url` |
| GET | `/payments/pagbank/connect/callback` (público — OAuth) |
| GET | `/payments/pagbank/connect/accounts` |
| POST | `/payments/pagbank/connect/accounts/:id/refresh` |
| POST | `/payments/pagbank/connect/sms/request` |
| POST | `/payments/pagbank/connect/sms/confirm` |

Redirect URI padrão: `https://<domínio>/api/payments/pagbank/connect/callback`

### Custódia (UI)

Na aba **Divisão (split)**: data padrão de liberação + tabela de transações com botão **Liberar custódia**.

Exemplo checkout PIX:

```json
POST /payments/pagbank/checkout
{
  "flowId": "orders_pix",
  "orderId": "<uuid-pedido-pdv>",
  "customer": { "name": "Cliente", "email": "a@b.com" }
}
```

### Liquidação automática no PDV

Quando o PagBank confirma `paid` (webhook ou `POST .../transactions/:id/refresh`):

1. Usa o `orderId` da transação PagBank.
2. Não duplica se já houver `order_payments` com o mesmo id PagBank.
3. Lança pagamento no PDV (PIX, cartão, etc. conforme `payment_method`).
4. Marca o pedido como `pronto` se o total pago cobrir a conta.

Resposta da API inclui `pdvPaymentRegistered: true` quando o lançamento ocorreu.

Em produção, configure **URL de notificação** para `https://<seu-dominio>/api/payments/pagbank/webhooks`.

## Implementação no código

- Plano completo: [PAGBANK_IMPLEMENTATION_PLAN.md](./PAGBANK_IMPLEMENTATION_PLAN.md)
- Liquidação PDV: `pagbank-pdv-settlement.service.ts` + `OrdersService.registerPagbankApiPayment()`
- Catálogo: `pagbank-flows.catalog.ts` + `PAGBANK_IMPLEMENTED_IN_CODE`
- HTTP: `pagbank-http.client.ts`
- Pedidos: `pagbank-orders.service.ts`
- Transações: tabela `pagbank_transactions`
- Split: `buildPagbankSplitsPayload()` / `getPagbankSplitsForOrder()`
