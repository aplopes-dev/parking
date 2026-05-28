# Aplopes Food

Plataforma multitenant para gestão de bares e restaurantes: cadastros, estoque, PDV, cardápio digital, CRM, integração SmartPOS (terminal Android) e configuração de pagamentos PagBank.

Produção: [https://food.aplopes.com](https://food.aplopes.com) · API: `https://food.aplopes.com/api`

## Arquitetura

| Camada | Tecnologia |
|--------|------------|
| API | NestJS 10, TypeORM, PostgreSQL, JWT |
| Tempo real | WebSocket (`/mobile/ws`) para mesas SmartPOS |
| Frontend | React 18, React Router, Axios |
| Arquivos | MinIO (fotos de produtos, anexos) |
| Deploy | Docker Compose |

O backend carrega os módulos em [backend/src/app.module.ts](backend/src/app.module.ts): autenticação multitenant, catálogo, estoque, CRM, cardápio, PDV, API mobile e pagamentos.

## Módulos do sistema

### Implementados (API + telas)

| Área | Descrição |
|------|-----------|
| **Cadastros** | Grupos e produtos (com foto), clientes |
| **Estoque** | Locais, movimentações, acerto, mínimo, ficha técnica, produção de receitas |
| **CRM** | Base de clientes, campanhas, fidelidade |
| **Cardápio digital** | Canais mesa e delivery (sincronização com produtos) |
| **PDV** | Online, tablet, balcão, comanda, delivery, divisão de conta, taxa de serviço, logs |
| **SmartPOS · Salão** | Mapa de mesas em tempo real, espelho da API `/mobile/*` (app Android) |
| **Pagamentos** | Configuração PagBank: credenciais, catálogo de fluxos, split entre recebedores |
| **Financeiro** | Lançamentos, contas, categorias, fontes e tags (etapa 1) |
| **Sistema** | Usuários, perfil, registro de organização (tenant) |

Outras rotas do menu (contas a pagar, DRE, folha, fiscal, integrações iFood/Rappi, etc.) seguem o [plano financeiro](docs/FINANCE_MODULE_PLAN.md) por etapas.

## Como executar

### Pré-requisitos

- Docker e Docker Compose
- **PostgreSQL** e **MinIO** acessíveis na rede Docker `feedback_feedback_network` (stack do projeto `feedback` ou equivalente)
- Rede externa criada antes do `up`:
  ```bash
  docker network create feedback_feedback_network
  ```

### Docker Compose (recomendado)

O arquivo [docker-compose.yml](docker-compose.yml) sobe apenas **API** (`food_backend`) e **painel** (`food_frontend`). Não inclui banco nem MinIO — eles ficam em outro compose, conectados pela rede compartilhada.

| Hostname na rede Docker | Serviço | Uso no Food |
|-------------------------|---------|-------------|
| `postgres` | PostgreSQL | `DATABASE_URL` → banco `food_db` |
| `minio` | MinIO | Fotos de produtos, anexos (`MINIO_*`) |

```bash
git clone <repo-url>
cd aplopes-food

cp .env.example .env
# Ajuste JWT, REACT_APP_API_URL, credenciais, etc.

# 1) Suba postgres + minio (projeto feedback ou seu stack)
# 2) Depois o Food:
docker compose up -d --build
```

O backend usa [backend/docker-entrypoint.sh](backend/docker-entrypoint.sh): `migration:run` → `build` → `start:prod` (estável com volume montado; **não** use `start:dev` dentro do container).

| Serviço neste compose | URL no host |
|----------------------|-------------|
| Frontend (`food_frontend`) | http://localhost:3070 |
| API (`food_backend`) | http://localhost:3071 |
| Swagger | http://localhost:3071/api |
| Health | http://localhost:3071/health |

| Dependência externa (stack feedback) | URL típica no host |
|--------------------------------------|-------------------|
| PostgreSQL | `localhost:5439` → banco `food_db` |
| MinIO API | http://localhost:9008 |
| MinIO Console | http://localhost:9009 |

### Desenvolvimento local (sem Docker)

```bash
# Backend — porta 3000
cd backend && npm install
export DATABASE_URL=postgresql://feedback_user:feedback_pass@localhost:5439/food_db
npm run migration:run
npm run start:dev

# Frontend — outra porta (ex.: 3001)
cd frontend && npm install
PORT=3001 REACT_APP_API_URL=http://localhost:3000 npm start
```

### Seed (usuário inicial)

```bash
cd backend
npm run migration:run   # se ainda não rodou
npx ts-node src/database/seed.ts
```

Credenciais padrão:

| Campo | Valor |
|-------|--------|
| Tenant | `home` |
| E-mail | `admin@food.aplopes.com` |
| Senha | `admin123` |

Login via API:

```bash
curl -X POST http://localhost:3071/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"home","email":"admin@food.aplopes.com","password":"admin123"}'
```

## Estrutura do projeto

```
aplopes-food/
├── backend/
│   └── src/
│       ├── auth/           # JWT, login, registro de tenant
│       ├── tenants/        # Organizações (multitenant)
│       ├── users/
│       ├── products/       # Produtos e fotos públicas
│       ├── product-groups/
│       ├── customers/
│       ├── stock/
│       ├── crm/
│       ├── menu/           # Cardápio digital
│       ├── pdv/            # Pedidos, comandas, configurações PDV
│       ├── mobile/         # API SmartPOS + WebSocket
│       ├── payments/       # Config PagBank / split
│       ├── minio/
│       └── database/
│           ├── migrations/
│           └── seed.ts
├── frontend/
│   └── src/
│       ├── pages/          # catalog, pdv, menu, crm, stock, integration, payments
│       ├── config/         # navigation.ts (menu do produto)
│       └── routes/
├── docs/
│   ├── MOBILE_API.md       # Contrato food-app Android
│   ├── PAGBANK_PAYMENTS.md # Configuração PagBank
│   ├── PAGBANK_SPLIT.md
│   └── deploy/             # Referência nginx (produção)
└── docker-compose.yml
```

## API destacada

| Prefixo | Uso |
|---------|-----|
| `/auth/*` | Login, registro de organização |
| `/mobile/*` | Bootstrap, mesas, itens, pagamentos, cozinha (SmartPOS) |
| `/mobile/ws?token=` | WebSocket — snapshot e atualização de mesas |
| `/pdv/*` | Pedidos, comandas, settings |
| `/menu/*` | Cardápio por canal |
| `/payments/settings` | Configuração PagBank e fluxos |
| `/payments/pagbank-split` | Split (legado; preferir `/payments/settings`) |

Documentação interativa: Swagger em `/api` na mesma origem da API.

## Perfis de acesso

| Perfil | Papel |
|--------|--------|
| `admin` | Acesso total: mesas, pagamento, recibo, liberar mesa, KDS, cadastros |
| `garcom` | Apenas painel do salão em `/` (sem menu lateral; logo + SmartPOS) |
| `cozinha` | Apenas KDS em `/` (sem menu lateral; logo + fila de pedidos) |
| `manager` | Legado — tratado como admin no PDV |
| `hr` | Cadastros, estoque, CRM, usuários |
| `developer` | Legado — tratado como garçom no PDV |

## SmartPOS (food-app Android)

O app terminal consome a mesma API do painel web:

1. `POST /auth/login` com `tenantSlug`, e-mail e senha
2. `GET /mobile/bootstrap` — cardápio e mesas
3. Operações em `/mobile/tables/:id/*`
4. WebSocket `wss://<host>/api/mobile/ws?token=<JWT>` para sincronizar com o painel **SmartPOS · Salão** (rota inicial `/` no web)

Detalhes: [docs/MOBILE_API.md](docs/MOBILE_API.md)

## Pagamentos PagBank

Configuração em **Pagamentos → Configuração** no painel ou via API. Inclui catálogo dos fluxos da [API Platform PagBank](https://developer.pagbank.com.br/reference/introducao) (pedidos, split, Connect, checkout, recorrente, etc.).

- [docs/PAGBANK_PAYMENTS.md](docs/PAGBANK_PAYMENTS.md)
- [docs/PAGBANK_SPLIT.md](docs/PAGBANK_SPLIT.md)

## Variáveis de ambiente

Copie [.env.example](.env.example). Principais:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL (no Compose é montada automaticamente) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Autenticação |
| `FRONTEND_URL` | CORS e links |
| `REACT_APP_API_URL` | Base da API para o React |
| `CORS_ORIGINS` | Origens extras (ex.: app na LAN) |
| `MINIO_*` | Armazenamento de arquivos |
| `EMAIL_*` | SMTP (opcional) |

## Operação e troubleshooting

- **Rede externa ausente:** `network feedback_feedback_network not found` → crie com `docker network create feedback_feedback_network` ou suba o stack `feedback` que já a define.
- **API sem banco / MinIO:** `food_backend` sobe, mas falha ao conectar — confira se os containers `postgres` e `minio` estão na mesma rede (`docker network inspect feedback_feedback_network`).
- **Migrations:** `TYPEORM_SYNCHRONIZE=false` em produção. Use `npm run migration:run` no backend (o container já roda isso na subida).
- **Loop `sh: nest: not found` no log:** o compose define `NODE_ENV=production` e o volume `/app/node_modules` pode ficar sem `@nestjs/cli`. O entrypoint força `NODE_ENV=development` na instalação e usa `node_modules/.bin/nest build`. Recrie o container e o volume de dependências:
  ```bash
  docker compose down
  docker rm -f food_backend 2>/dev/null || true
  docker volume ls -q | xargs -r docker volume inspect 2>/dev/null | grep -q aplopes-food || true
  docker compose up -d --build food_backend
  docker logs -f food_backend   # deve mostrar "Iniciando (node dist/main.js)" e Nest started
  curl -s http://localhost:3071/health
  ```
- **502 constante no login:** o backend no Docker usava `nest start --watch` com volume montado; a recompilação quebra `dist/` e o processo cai. O `docker-entrypoint.sh` agora faz `migration:run` → `build` → `node dist/main.js`. Após atualizar o repo:
  ```bash
  docker compose up -d --build food_backend
  docker logs -f food_backend
  curl -s http://localhost:3071/health
  ```
- **Backend fora do ar (legado / dev com watch):** se ainda usar `start:dev` no container:
  ```bash
  docker exec food_backend npm run build
  docker restart food_backend
  ```
- **WebSocket em produção:** o nginx deve repassar upgrade em `/api/mobile/ws` — ver [docs/deploy/food.aplopes.com.nginx.conf](docs/deploy/food.aplopes.com.nginx.conf).
- **Healthcheck:** `GET /health` deve retornar `{"status":"ok",...}`.
- **Login com erro 502:** o nginx em `https://food.aplopes.com/api` não alcança o backend na porta **3071**. Verifique `docker ps` (`food_backend` healthy) e teste `curl http://localhost:3071/tenants/login-options`. Reinicie com os comandos acima se necessário.
- **Docker local:** use `REACT_APP_API_URL=http://localhost:3071` no `.env` (sem `/api`). Em produção use `https://food.aplopes.com/api`.

## Scripts úteis

```bash
# Backend
cd backend
npm run build
npm run migration:run
npm run migration:revert   # cuidado em produção
npm run start:dev

# Frontend
cd frontend
npm run build
npm start
```

## Licença

Projeto privado — uso interno Aplopes.
