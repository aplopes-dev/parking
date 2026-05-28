# PagBank — Pagamentos Recorrentes (Assinaturas)

Referências oficiais:

- [Pagamentos Recorrentes](https://developer.pagbank.com.br/docs/pagamentos-recorrentes)
- [Criptografia e chave pública](https://developer.pagbank.com.br/docs/criptografia-e-chave-publica) (exclusiva deste produto)
- [Assinantes](https://developer.pagbank.com.br/docs/assinantes)
- [Criar assinatura](https://developer.pagbank.com.br/reference/criar-assinatura)
- [Testar integração (cartões sandbox)](https://developer.pagbank.com.br/reference/testar-sua-integracao-pagamentos-recorrentes)

## API e ambiente

| Ambiente | Base URL |
|----------|----------|
| Sandbox | `https://sandbox.api.assinaturas.pagseguro.com` |
| Produção | `https://api.assinaturas.pagseguro.com` |

Token Bearer da conta (sandbox ou produção). **Não confundir** com a API de Pedidos (`sandbox.api.pagseguro.com`).

## Fluxo oficial (4 passos)

Conforme [Pagamentos Recorrentes](https://developer.pagbank.com.br/docs/pagamentos-recorrentes):

1. **Chave pública** — `GET /public-keys` ou `PUT /public-keys` na API de Assinaturas (chave **diferente** da API de Pedidos).
2. **Plano** — `POST /plans` (`reference_id`, valor, intervalo).
3. **Assinante** — `POST /customers` com `billing_info` (cartão criptografado, em claro com CVV, ou validação conforme [Assinantes](https://developer.pagbank.com.br/docs/assinantes)).
4. **Assinatura** — `POST /subscriptions` com `plan.id` + `customer.id`; em `payment_method` só o **CVV** se o cartão já foi tokenizado no passo 3.

Também é permitido criar assinante e assinatura **no mesmo** `POST /subscriptions` (`customer` completo + `billing_info`).

## Criptografia (recorrência)

### Regra crítica

> Chaves de **Pagamento Recorrente** não servem para Pedidos/Checkout, e vice-versa.  
> Ver [Criptografia e chave pública](https://developer.pagbank.com.br/docs/criptografia-e-chave-publica).

| API | Obter chave | Uso no Aplopes |
|-----|-------------|----------------|
| Assinaturas | `GET /public-keys` (sem `/card`) | Testes recorrentes, `fetchAssinaturasCardPublicKey` |
| Pedidos | `GET /public-keys/card`, `PUT /public-keys` `{ type: "card" }` | Orders, checkout PCI |

### SDK no browser

```html
<script src="https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js"></script>
```

```javascript
const card = PagSeguro.encryptCard({
  publicKey: "CHAVE_ASSINATURAS",
  holder: "Nome Sobrenome",
  number: "5322397237653563",
  expMonth: "12",
  expYear: "2026",
  securityCode: "123",
});
// card.encryptedCard → billing_info.card.encrypted
```

### Backend (sem PCI no servidor)

O Aplopes replica o payload do SDK em Node (`pagbank-recurring-card-crypto.util.ts` + `pagbank-card-encrypt.util.ts`):

- String: `numero;cvv;mes;ano;titular;timestamp`
- RSA PKCS#1 v1.5 sobre a chave pública (base64 → PEM)
- Resultado em base64 → `billing_info[].card.encrypted`
- **Somente** `encrypted` no objeto `card` (sem `number`, `token`, etc.)

Titular: normalizado (sem acentos, máx. 30 caracteres, só letras/espaço).

## Cartão na assinatura

### Novo assinante no mesmo request

```json
{
  "customer": {
    "name": "...",
    "email": "...",
    "tax_id": "...",
    "billing_info": [{ "type": "CREDIT_CARD", "card": { "encrypted": "..." } }]
  },
  "payment_method": [{ "type": "CREDIT_CARD", "card": { "security_code": "123" } }]
}
```

PAN em claro (sandbox / PCI): `number`, `exp_month`, `exp_year` com **4 dígitos** (ex.: `"2026"`), `holder` — **CVV só** em `payment_method` na assinatura; em `POST /customers` o CVV pode ir em `billing_info.card.security_code` para validação ([Assinantes](https://developer.pagbank.com.br/docs/assinantes)).

### Sandbox — token `CARD_*`

Na [tabela de testes](https://developer.pagbank.com.br/reference/testar-sua-integracao-pagamentos-recorrentes), cada cenário traz **Number** + **Token** `CARD_...`:

- `billing_info.card` = `{ "token": "CARD_..." }` **apenas** (sem número, sem `encrypted`)
- `payment_method` = `[{ "type": "CREDIT_CARD" }]` **sem** objeto `card` (a API recusa `payment_method.card` quando há token em `billing_info`)

Misturar `token` com `number`/`encrypted`, ou enviar CVV em `payment_method` junto com token no billing, gera `invalid_parameter`.

### Criptografado ou PAN em `billing_info` (um passo)

- `billing_info.card` = `{ "encrypted": "..." }` ou PAN + validade + titular
- `payment_method` = só `[{ "type": "CREDIT_CARD" }]` (sem `card.security_code` no mesmo request)
- PAN em claro no sandbox costuma retornar `unprocessable_card_data` sem PCI; prefira `CARD_*` ou `encrypted` com chave de **Assinaturas**

### Assinante já cadastrado

```json
{
  "customer": { "id": "CUST_..." },
  "payment_method": [{ "type": "CREDIT_CARD", "card": { "security_code": "123" } }]
}
```

## Cartões de teste × API de Pedidos

Catálogo dedicado em `pagbank-orders-test.catalog.ts` (10 cenários: 5 bandeiras × aprovado/negado). Painel sandbox → seção **Pedidos — Autorizados / Negados**.

| Produto | Doc |
|---------|-----|
| **Assinaturas** | [Testar recorrência](https://developer.pagbank.com.br/reference/testar-sua-integracao-pagamentos-recorrentes) — token `CARD_*` |
| **Pedidos** | [Cartões de teste](https://developer.pagbank.com.br/docs/cartoes-de-teste) — PAN + criptografia Orders |

## Elegibilidade

- API de recorrência: conta **PJ** aprovada no onboarding ([Pagamentos Recorrentes](https://developer.pagbank.com.br/docs/pagamentos-recorrentes)).
- PF: usar **Link de Pagamento Recorrente**, não API.

## Implementação no Aplopes Food

| Arquivo | Função |
|---------|--------|
| `pagbank-sdk.config.ts` | `getPagbankSubscriptionsBaseUrl()` |
| `pagbank-recurring.service.ts` | Planos/assinaturas produção (`cardToken` em `payment_method`) |
| `pagbank-sandbox-test.service.ts` | Painel sandbox, estratégias de cartão, `attempts[]` |
| `pagbank-recurring-test.catalog.ts` | 27 cenários + `CARD_*` |
| `pagbank-recurring-card-crypto.util.ts` | Payload SDK |
| `pagbank-card-encrypt.util.ts` | RSA |
| `pagbank-orders-test.cards.ts` | PAN só para teste Orders |

### Teste Assinatura no painel sandbox

Estratégia fixa **`sandbox_card_token`**: um `POST /subscriptions` com `billing_info.card.token` (`CARD_*` do catálogo) e `payment_method: [{ "type": "CREDIT_CARD" }]` sem objeto `card`.

Fluxos com PAN em claro ou `encrypted` ficam documentados acima para integração produção (PCI / chave Assinaturas), mas não são usados no botão de teste automático.

## Rotas internas

Ver [PAGBANK_PAYMENTS.md](./PAGBANK_PAYMENTS.md) — seção Recorrente e Testes Sandbox.
