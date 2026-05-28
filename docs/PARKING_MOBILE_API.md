# SmartPos Parking — API Mobile Valet

App Android (`android/`) e painel web compartilham o mesmo backend NestJS e sincronizam a fila valet em tempo real via WebSocket.

## Autenticação

```http
POST /auth/login
Content-Type: application/json

{
  "tenantSlug": "home",
  "email": "admin@estacionamento.aplopes.com",
  "password": "admin123"
}
```

Resposta: `{ "access_token": "...", "user": { ... } }`

Todas as rotas abaixo exigem `Authorization: Bearer <token>`.

## Bootstrap

```http
GET /mobile/parking/bootstrap?facilityId=<uuid>
```

Retorna unidades, fila resumida, tickets ativos, manobristas, vagas e tarifas.

## Tickets valet

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/mobile/parking/tickets?facilityId=&queue=` | Lista tickets |
| GET | `/mobile/parking/tickets/:id/quote?tariffId=` | Cotação na entrega |
| POST | `/mobile/parking/tickets` | Receber veículo |
| POST | `/mobile/parking/tickets/:id/park/start` | Iniciar manobra |
| POST | `/mobile/parking/tickets/:id/park/complete` | Marcar estacionado |
| POST | `/mobile/parking/tickets/:id/request` | Cliente solicitou |
| POST | `/mobile/parking/tickets/:id/retrieve/start` | Buscar veículo |
| POST | `/mobile/parking/tickets/:id/ready` | Pronto na saída |
| POST | `/mobile/parking/tickets/:id/deliver` | Cobrar e entregar |
| POST | `/mobile/parking/tickets/:id/cancel` | Cancelar |

## WebSocket

```
wss://estacionamento.aplopes.com/api/mobile/ws?token=<JWT>
```

Eventos de estacionamento:

| Evento | Quando |
|--------|--------|
| `parking.valet.snapshot` | Ao conectar |
| `parking.valet.updated` | Após qualquer mudança na fila valet |

Payload:

```json
{
  "event": "parking.valet.updated",
  "data": {
    "queue": { "intake": 2, "parked": 5, "delivery": 1, "totalActive": 8 },
    "tickets": [ /* tickets ativos */ ],
    "facilityId": "uuid-da-unidade",
    "source": "parked"
  }
}
```

O painel web em `/estacionamento/valet` e o app Android consomem os mesmos eventos.

## Pagamentos (SmartPOS)

Na entrega (`deliver`), informe `paymentMethod`: `cash`, `pix`, `credit` ou `debit`. O app Android processa PIX/cartão via PlugPag antes de chamar a API.

O backend **abre automaticamente o caixa do operador** na entrega valet (SmartPOS), usando a primeira conta financeira do tipo Caixa do tenant, se ainda não houver sessão aberta.

## Portas locais (Docker) vs produção

| Ambiente | API | Painel |
|----------|-----|--------|
| **Produção** | https://estacionamento.aplopes.com/api | https://estacionamento.aplopes.com |
| Docker local | http://localhost:3085 | http://localhost:3084 |
| Emulador Android → API local | http://10.0.2.2:3085/api/ | — |
