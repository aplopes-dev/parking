# Gestão financeira — plano por etapas

Referência de menu: `frontend/src/config/navigation.ts` (módulo **Gestão financeira**).  
Módulo nativo do **Aplopes Food** (restaurante/PDV multitenant). O legado em `/root/financeiro` foi descontinuado (`1771000000000-DropLegacyFinanceSystem`).

**Status:** backend (`/finance/*`) e frontend (`frontend/src/pages/finance/*`) implementados para todas as rotas do menu.

## Mapa do menu → entregas

| Rota | Funcionalidade | Etapa |
|------|----------------|-------|
| `/financeiro` | Lançamentos (receitas/despesas) | **1** |
| `/financeiro` (aba Contas) | Cadastro de contas caixa/banco/cartão | **1** |
| `/financeiro/contas` | Contas a pagar e receber (AP/AR) | **4** |
| `/financeiro/calendario` | Listagem por data | 2 |
| `/financeiro/extrato` | Extrato por conta | 2 |
| `/financeiro/recorrentes` | Recorrentes | 3 |
| `/financeiro/baixa-contas` | Baixa por pessoa/período | 4 |
| `/financeiro/transferencias` | Transferência entre contas | 4 |
| `/financeiro/folha` | Folha de pagamento | 5 |
| `/financeiro/conferencia-diaria` | Conferência diária | 5 |
| `/financeiro/caixas` | Gestão de caixas | 5 |
| `/financeiro/dre` | DRE | 6 |
| `/financeiro/drc` | Fluxo de caixa (DRC) | 6 |
| `/financeiro/cartao` | Gestão de cartão | 6 |
| `/financeiro/conciliacao` | Conciliação bancária | 7 |
| `/financeiro/credito-prepago` | Crédito pré-pago | 7 |
| `/financeiro/recibos` | Recibos | 7 |
| `/financeiro/adiantamento` | Adiantamento | 7 |
| Integração PDV | Espelhar pagamentos do pedido | 8 |
| Assistente IA | Classificação por palavras-chave | 9 |

## Etapa 1 — Fundação (concluída)

**Backend** (`/finance`):

- Tabelas: `finance_accounts`, `finance_sources`, `finance_categories`, `finance_tags`, `finance_transactions`, `finance_transaction_tags`
- `GET /finance/overview` — resumo + cadastros para formulários
- CRUD de contas, fontes, categorias, tags
- CRUD de lançamentos (filtro por período/tipo/conta), anexo MinIO opcional
- Multitenant + papéis `admin`, `manager`, `hr`

**Frontend** (`/financeiro`):

- Tela única com abas: Lançamentos, Contas, Fontes, Categorias, Tags
- Resumo (receitas, despesas, saldo)
- Formulário de lançamento com conta, categoria, fonte e tags

## Etapa 2 — Operação diária

- Calendário e extrato
- Filtros avançados e exportação CSV
- Vínculo opcional com `order_payments` (PDV)

## Etapas 3–9

Ver tabela acima; cada etapa adiciona rotas, entidades e telas sem quebrar a API da etapa 1.

## Fora do escopo do SDK PagBank

Split de marketplace PagBank (`/pagamentos`) é **pagamento de pedido**, não substitui o financeiro operacional (despesas, fornecedores, folha). Integração futura na etapa 8 pode gerar lançamentos automáticos a partir de vendas PDV.
