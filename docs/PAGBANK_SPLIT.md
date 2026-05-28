# PagBank — Divisão de pagamento (split)

Configuração em **Pagamentos → Configuração** (`/pagamentos/configuracao`).

Referência PagBank: [Divisão do pagamento](https://developer.pagbank.com.br/reference/divisao-de-pagamento).

## Papel da Aplopes (adquirente)

Quando vocês são **adquirentes**, a conta principal (`pagbankMasterAccountId` / recebedor `master`) concentra a transação. Os recebedores **secundários** recebem a fatia configurada via `charges.splits` na API Orders.

## API interna

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/payments/pagbank-split` | Lê configuração + preview do objeto `splits` |
| PATCH | `/payments/pagbank-split` | Salva (admin/manager) |

### Payload salvo (recebedores)

- `method`: `PERCENTAGE` ou `FIXED` (centavos no FIXED)
- `receivers[].account.id`: `ACCO_…` PagBank
- `receivers[].amount.value`: percentual ou centavos

## Uso ao criar pedido PagBank

```typescript
const splits = await paymentsService.getPagbankSplitsForOrder(tenantId);
// Incluir em charges ao pagar: { splits }
```

## Regras

- Modelo **carrinho único** (um vendedor por checkout), conforme PagBank.
- Soma de percentuais ativos ≤ 100%.
- Token armazenado por tenant; resposta da API não devolve o token completo.

## Teste no sandbox

No painel **Pagamentos → Testes Sandbox**, seção **Split — divisão de pagamento**:

1. Habilite split na aba **Divisão (split)** e informe `ACCO_…` do adquirente.
2. Cadastre ao menos um recebedor secundário (`ACCO_…`) ou sincronize contas **Connect**.
3. Ative os fluxos necessários:
   - **Split + cartão:** `split_create_and_pay` e `orders_credit_card`
   - **Split + PIX:** `split_pix` (splits em `qr_codes[0]`, sem `charges`)
   - **Consultar split:** `split_query`
4. No painel de testes:
   - **Split + cartão** — `POST /payments/pagbank/test/orders/split`
   - **Split + PIX** — `POST /payments/pagbank/test/orders/split/pix`
   - **Consultar split** — `POST /payments/pagbank/test/orders/split/query` com `splitId` (SPLI_…), `pagbankOrderId` (ORDE_…) ou `transactionId` (transação local após PIX)

A PagBank exige contas válidas no sandbox; secundários costumam vir do **Connect** (OAuth) no mesmo ambiente. O `SPLI_…` costuma aparecer após o pagamento (cartão aprovado ou PIX pago); até lá use `pagbankOrderId` do teste PIX para inspecionar o pedido.

## Próximos passos

- Integrar `getPagbankSplitsForOrder` no fluxo de pagamento online/PDV.
- Webhook PagBank para confirmação de split/custódia.
