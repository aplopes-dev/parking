# API Mobile / SmartPOS (food-app)

Base URL (Docker local): `http://<IP_DO_SERVIDOR>:3071`  
Produção: mesma URL do painel web (`REACT_APP_API_URL` sem sufixo `/api` se o proxy não usar prefixo).

## Autenticação

O app Android deve autenticar como o painel web.

```http
POST /auth/login
Content-Type: application/json

{
  "tenantSlug": "home",
  "email": "admin@financeiro.aplopes.com",
  "password": "admin123"
}
```

Resposta: `{ "access_token": "...", "user": { ... } }`

Todas as rotas `/mobile/*` exigem:

```http
Authorization: Bearer <access_token>
```

Validar sessão: `GET /auth/me`

## Bootstrap (carregar app)

```http
GET /mobile/bootstrap
```

Retorna:
- `settings` — taxa de serviço padrão
- `menu.categories` — grupos de produtos
- `menu.items` — produtos visíveis no cardápio **mesa**
- `tables` — 12 mesas padrão (criadas automaticamente no primeiro acesso)

## Mesas (espelha o `RestaurantRepository` do app)

| Método | Rota | Ação no app |
|--------|------|-------------|
| GET | `/mobile/tables` | Listar mesas |
| POST | `/mobile/tables/:id/open` | `openTable` — body: `{ guestCount, waiterName }` |
| POST | `/mobile/tables/:id/items` | `addOrderItem` — `{ productId, quantity, notes? }` |
| DELETE | `/mobile/tables/:id/items/:itemId` | `removeOrderLine` |
| POST | `/mobile/tables/:id/send-to-kitchen` | `sendOrderToKitchen` |
| POST | `/mobile/tables/:id/payments` | `processPayment` — ver abaixo |
| POST | `/mobile/tables/:id/service-fee` | Aplicar taxa de serviço |
| POST | `/mobile/tables/:id/close-account` | `closeAccount` (exige pagamento completo) |
| POST | `/mobile/tables/:id/free` | `closeTable` / liberar mesa |

### Status da mesa (`status`)

- `free` — livre
- `open` — conta aberta
- `payment_pending` — total pago, aguardando encerrar conta
- `closed` — pedido fechado (liberar com `/free`)

### Pagamento parcial + PlugPag

```http
POST /mobile/tables/:tableId/payments
{
  "method": "pix",
  "amount": 50.00,
  "pagBank": {
    "transactionId": "...",
    "transactionCode": "...",
    "nsu": "...",
    "hostNsu": "...",
    "processedOnTerminal": true
  }
}
```

`method`: `cash` | `credit` | `debit` | `pix`

Repita até `session.isFullyPaid === true`, depois `POST .../close-account`.

### Status do item (`orderLines[].status`)

- `pending` → `sent_to_kitchen` → `delivered`

## Cardápio

Produtos vêm do cadastro + sincronização do cardápio **mesa** (`/cardapio/mesa` no painel).  
Garanta produtos ativos e `Sincronizar produtos` antes de testar o app.

## CORS / rede local

No `.env` do backend:

```env
CORS_ORIGINS=http://localhost:3000,*
```

Para o terminal Android na mesma rede, use o IP LAN do servidor (ex.: `http://192.168.1.10:3071`).

## WebSocket (tempo real)

Conecte após o login para receber atualizações quando qualquer cliente (web ou Android) alterar as mesas.

**URL:** mesma base da API, protocolo `wss`/`ws`, path `/mobile/ws`:

```
wss://food.aplopes.com/api/mobile/ws?token=<JWT>
```

### Eventos recebidos (JSON)

| Evento | Quando | `data` |
|--------|--------|--------|
| `tables.snapshot` | Ao conectar | `{ tables: [...] }` |
| `tables.updated` | Após abrir mesa, item, pagamento, etc. | `{ tables: [...], source?: string }` |

Exemplo:

```json
{
  "event": "tables.updated",
  "data": {
    "source": "addItem",
    "tables": [ { "id": "...", "number": 1, "status": "open", "session": { ... } } ]
  }
}
```

Substitua a lista local de mesas pelo conteúdo de `data.tables` (não é patch incremental).

### Android (OkHttp)

```kotlin
val token = secureStore.getAccessToken()
val wsUrl = "wss://food.aplopes.com/api/mobile/ws?token=${URLEncoder.encode(token, "UTF-8")}"
val client = OkHttpClient()
val request = Request.Builder().url(wsUrl).build()
client.newWebSocket(request, object : WebSocketListener() {
    override fun onMessage(webSocket: WebSocket, text: String) {
        val json = JSONObject(text)
        when (json.getString("event")) {
            "tables.snapshot", "tables.updated" -> {
                val tables = parseTables(json.getJSONObject("data").getJSONArray("tables"))
                _tables.value = tables
            }
        }
    }
})
```

Reconecte com backoff se `onClosed` / `onFailure`. Envie novo `token` após refresh de login.

### Nginx (produção)

O bloco `location /api/` **precisa** repassar o upgrade WebSocket (sem isso o browser recebe `404 Cannot GET /mobile/ws`). Ver `docs/deploy/food.aplopes.com.nginx.conf` e `docs/deploy/websocket-upgrade.conf`.

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
proxy_cache_bypass $http_upgrade;
proxy_read_timeout 86400;
```

Depois: `nginx -t && systemctl reload nginx`.

## Teste pelo painel web

Rota: **Integração → SmartPOS · Salão** (`/integracao/smartpos`) — mapa de mesas, indicador **Ao vivo** e ações sincronizadas via WebSocket.

## Próximo passo no food-app

Substituir `RestaurantRepository` por cliente HTTP (Retrofit/Ktor) apontando para estas rotas, mantendo `PaymentGateway` (PlugPag) no dispositivo.
