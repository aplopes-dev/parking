#!/usr/bin/env bash
# Teste ponta a ponta: entrada → ticket QR → caixa operador → checkout por ticket
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3085}"
PLATE="E2E$(date +%H%M%S)"
PASS=0
FAIL=0

log() { echo ""; echo "==> $*"; }
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
assert() {
  local desc="$1" expr="$2"
  if eval "$expr"; then ok "$desc"; else fail "$desc"; fi
}

api() {
  local method="$1" path="$2"
  shift 2
  curl -s -X "$method" "${BASE}${path}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

json() { python3 -c "$1"; }

log "1. Login"
LOGIN=$(curl -s -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"home","email":"admin@estacionamento.aplopes.com","password":"admin123"}')
TOKEN=$(echo "$LOGIN" | json "import sys,json; print(json.load(sys.stdin)['access_token'])")
assert "Token obtido" "[[ -n '${TOKEN}' ]]"

log "2. Unidade e conta caixa"
FACILITIES=$(api GET /parking/facilities)
FACILITY_ID=$(echo "$FACILITIES" | json "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")
FACILITY_NAME=$(echo "$FACILITIES" | json "import sys,json; d=json.load(sys.stdin); print(d[0]['name'] if d else '')")
assert "Unidade encontrada ($FACILITY_NAME)" "[[ -n '${FACILITY_ID}' ]]"

OVERVIEW=$(api GET "/finance/overview")
ACCOUNT_ID=$(echo "$OVERVIEW" | json "
import sys,json
d=json.load(sys.stdin)
cash=[a for a in d.get('accounts',[]) if a.get('type')=='cash' and a.get('active')]
print((cash or d.get('accounts') or [{}])[0].get('id',''))
")
ACCOUNT_NAME=$(echo "$OVERVIEW" | json "
import sys,json
d=json.load(sys.stdin)
cash=[a for a in d.get('accounts',[]) if a.get('type')=='cash' and a.get('active')]
print((cash or d.get('accounts') or [{}])[0].get('name',''))
")
assert "Conta caixa encontrada ($ACCOUNT_NAME)" "[[ -n '${ACCOUNT_ID}' ]]"

log "2b. Limpar caixas abertos (preparação)"
SESSIONS=$(api GET /finance/cash-sessions)
while IFS= read -r sid; do
  [[ -z "$sid" ]] && continue
  api POST "/finance/cash-sessions/${sid}/close" -d '{"countedBalance":0,"notes":"e2e cleanup"}' >/dev/null || true
done < <(echo "$SESSIONS" | json "
import sys,json
for s in json.load(sys.stdin):
    if s.get('status')=='open':
        print(s['id'])
")
ok "Sessões anteriores encerradas (se havia)"

log "3. Caixa fechado inicialmente"
MY=$(api GET /parking/cash/my-session)
OPEN_INIT=$(echo "$MY" | json "import sys,json; print(json.load(sys.stdin).get('open'))")
assert "Caixa inicia fechado" "[[ '${OPEN_INIT}' == 'False' ]]"

log "4. Entrada de veículo (placa $PLATE)"
ENTRY=$(api POST /parking/sessions/entry -d "{\"facilityId\":\"${FACILITY_ID}\",\"plate\":\"${PLATE}\",\"vehicleType\":\"car\"}")
SESSION_ID=$(echo "$ENTRY" | json "import sys,json; print(json.load(sys.stdin)['id'])")
TICKET=$(echo "$ENTRY" | json "import sys,json; print(json.load(sys.stdin)['ticketCode'])")
STATUS=$(echo "$ENTRY" | json "import sys,json; print(json.load(sys.stdin)['status'])")
assert "Sessão criada ($SESSION_ID)" "[[ -n '${SESSION_ID}' ]]"
assert "Ticket gerado ($TICKET)" "[[ '${TICKET}' == PK-* ]]" 2>/dev/null || assert "Ticket gerado ($TICKET)" "[[ '${TICKET}' =~ ^PK- ]]"
assert "Status active" "[[ '${STATUS}' == 'active' ]]"

log "5. Ticket QR (lookup por código)"
TICKET_DATA=$(api GET "/parking/cash/ticket-by-code/${TICKET}")
QR=$(echo "$TICKET_DATA" | json "import sys,json; print(json.load(sys.stdin).get('qrPayload',''))")
IS_ACTIVE=$(echo "$TICKET_DATA" | json "import sys,json; print(json.load(sys.stdin).get('isActive'))")
assert "QR payload = ticketCode" "[[ '${QR}' == '${TICKET}' ]]"
assert "Ticket ativo" "[[ '${IS_ACTIVE}' == 'True' ]]"

log "5b. Simular permanência (2h) para cobrança tarifada"
PGPASSWORD="${POSTGRES_PASSWORD:-feedback_pass}" psql -h localhost -p 5439 -U "${POSTGRES_USER:-feedback_user}" -d "${POSTGRES_DB:-estacionamento_db}" -q -c \
  "UPDATE parking_sessions SET entry_at = NOW() - INTERVAL '2 hours' WHERE id = '${SESSION_ID}';" >/dev/null
ok "Entrada retroagida 2h (fora da tolerância)"

log "6. Checkout sem caixa aberto (deve falhar)"
HTTP_NO_CASH=$(curl -s -o /tmp/e2e-no-cash.json -w "%{http_code}" -X POST "${BASE}/parking/cash/checkout-by-ticket" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"ticketCode\":\"${TICKET}\",\"paymentMethod\":\"cash\"}")
assert "Checkout bloqueado sem caixa (HTTP 400)" "[[ '${HTTP_NO_CASH}' == '400' ]]"

log "7. Abrir caixa do operador"
OPEN_CASH=$(api POST /parking/cash/my-session/open -d "{\"accountId\":\"${ACCOUNT_ID}\",\"openingBalance\":100,\"facilityId\":\"${FACILITY_ID}\"}")
CASH_ID=$(echo "$OPEN_CASH" | json "import sys,json; print(json.load(sys.stdin).get('id',''))")
assert "Caixa aberto ($CASH_ID)" "[[ -n '${CASH_ID}' ]]"

MY2=$(api GET /parking/cash/my-session)
OPEN_NOW=$(echo "$MY2" | json "import sys,json; print(json.load(sys.stdin).get('open'))")
assert "my-session confirma caixa aberto" "[[ '${OPEN_NOW}' == 'True' ]]"

log "8. Cotação por ticket"
QUOTE=$(api GET "/parking/cash/quote-by-ticket/${TICKET}")
AMOUNT=$(echo "$QUOTE" | json "import sys,json; print(json.load(sys.stdin)['quote']['amount'])")
assert "Cotação tarifada > 0 (R$ $AMOUNT)" "python3 -c 'import sys; sys.exit(0 if float(\"${AMOUNT}\") > 0 else 1)'"

log "9. Checkout por ticket (scan QR)"
CHECKOUT=$(api POST /parking/cash/checkout-by-ticket -d "{\"ticketCode\":\"${TICKET}\",\"paymentMethod\":\"cash\",\"accountId\":\"${ACCOUNT_ID}\"}")
PAY_STATUS=$(echo "$CHECKOUT" | json "import sys,json; print(json.load(sys.stdin).get('paymentStatus',''))")
CHARGED=$(echo "$CHECKOUT" | json "import sys,json; v=json.load(sys.stdin).get('amountCharged'); print(v if v is not None else 0)")
assert "Pagamento registrado (paid)" "[[ '${PAY_STATUS}' == 'paid' ]]"
assert "Valor cobrado > 0 (R$ $CHARGED)" "python3 -c 'import sys; sys.exit(0 if float(\"${CHARGED}\") > 0 else 1)'"

log "10. Ticket inativo após saída"
TICKET_AFTER=$(api GET "/parking/cash/ticket-by-code/${TICKET}")
IS_ACTIVE_AFTER=$(echo "$TICKET_AFTER" | json "import sys,json; print(json.load(sys.stdin).get('isActive'))")
assert "Ticket inativo pós-checkout" "[[ '${IS_ACTIVE_AFTER}' == 'False' ]]"

log "11. Resumo caixa operador"
MY3=$(api GET /parking/cash/my-session)
TX_COUNT=$(echo "$MY3" | json "import sys,json; s=json.load(sys.stdin).get('summary') or {}; print(s.get('transactionCount',0))")
PARKING_INC=$(echo "$MY3" | json "import sys,json; s=json.load(sys.stdin).get('summary') or {}; print(s.get('parkingIncome',0))")
assert "Lançamento vinculado ao caixa (count >= 1)" "python3 -c 'import sys; sys.exit(0 if float(\"${TX_COUNT}\") >= 1 else 1)'"
assert "Receita parking no caixa > 0 (R$ $PARKING_INC)" "python3 -c 'import sys; sys.exit(0 if float(\"${PARKING_INC}\") > 0 else 1)'"

log "12. Fechar caixa"
CLOSE=$(api POST "/parking/cash/my-session/${CASH_ID}/close" -d '{"countedBalance":150}')
CLOSE_STATUS=$(echo "$CLOSE" | json "import sys,json; print(json.load(sys.stdin).get('status',''))")
assert "Caixa fechado" "[[ '${CLOSE_STATUS}' == 'closed' ]]"

MY4=$(api GET /parking/cash/my-session)
OPEN_FINAL=$(echo "$MY4" | json "import sys,json; print(json.load(sys.stdin).get('open'))")
assert "my-session fechado após close" "[[ '${OPEN_FINAL}' == 'False' ]]"

log "13. Cobrança mensalista (estrutura — charge PagBank pode falhar sem credenciais)"
BILLS=$(api GET "/parking/subscriptions/billing?referenceMonth=2026-05")
BILL_ID=$(echo "$BILLS" | json "import sys,json; b=json.load(sys.stdin); print(b[0]['id'] if b else '')")
if [[ -n "$BILL_ID" ]]; then
  CHARGE_HTTP=$(curl -s -o /tmp/e2e-charge.json -w "%{http_code}" -X POST "${BASE}/parking/subscriptions/billing/${BILL_ID}/charge" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"paymentMethod":"pix"}')
  if [[ "$CHARGE_HTTP" == "201" || "$CHARGE_HTTP" == "200" ]]; then
    ok "Emitir PIX mensalidade (HTTP $CHARGE_HTTP)"
  else
    MSG=$(python3 -c "import json; print(json.load(open('/tmp/e2e-charge.json')).get('message','')[:80])" 2>/dev/null || true)
    ok "Charge PagBank esperado sem credenciais (HTTP $CHARGE_HTTP${MSG:+ — $MSG})"
  fi
else
  ok "Sem título mensalista no mês — etapa ignorada"
fi

echo ""
echo "========================================"
echo "Resultado: ${PASS} ok, ${FAIL} falha(s)"
echo "Placa testada: ${PLATE} | Ticket: ${TICKET}"
echo "========================================"

if [[ "$FAIL" -gt 0 ]]; then exit 1; fi
