# API de voz / iOS — assistente financeiro (preview + executar)

O app **transcreve o áudio no dispositivo** (Speech framework, Whisper on-device, etc.) e envia **só texto** para a API. O tenant vem do **JWT** do usuário (mesmo modelo do widget web).

**Base URL:** a mesma do app web (`REACT_APP_API_URL`), ex.: `https://financeiro.aplopes.com/api`  
**URLs completas (produção típica):**

- Prévia: `POST https://financeiro.aplopes.com/api/assistant/intents/preview`
- Executar: `POST https://financeiro.aplopes.com/api/assistant/intents/execute`

**Auth:** header `Authorization: Bearer <access_token>`  
**Perfis:** apenas `admin`, `manager` ou `hr` (igual ao widget).

### Como obter o token no iOS

1. Faça login na mesma API do site:

   `POST {baseURL}/auth/login`  
   Ex.: `POST https://financeiro.aplopes.com/api/auth/login`

2. **Body JSON** (obrigatório):

   | Campo | Descrição |
   |--------|-----------|
   | `tenantSlug` | Slug da organização (ex.: `home`) |
   | `email` | E-mail do utilizador |
   | `password` | Palavra-passe |

3. A resposta inclui **`access_token`** (JWT). Guarde-o de forma segura (recomendado: **Keychain**), não em `UserDefaults` em texto claro.

4. Em todas as chamadas ao assistente (e ao resto da API autenticada), envie:

   `Authorization: Bearer <access_token>`

5. (Opcional) Validar sessão ao abrir o app: `GET {baseURL}/auth/me` com o mesmo header — se devolver `401`, peça login de novo.

O JWT já contém o contexto do utilizador e do tenant; não é preciso enviar `tenantId` à parte nos endpoints do assistente.

---

## 1) Prévia — `POST /assistant/intents/preview`

Interpreta a instrução (saldo, relatórios, cadastro no formato curto, etc.) **sem gravar** lançamento.

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `transcript` | string | sim | Texto transcrito da fala do usuário |
| `history` | array | não | `{ "role": "user" \| "assistant", "content": string }[]` — últimas mensagens para contexto |
| `currentPath` | string | não | Rota “lógica” opcional, ex. `"/financeiro"` (só contexto para a IA) |

**Resposta 200:** igual ao widget (`answer`, `action` opcional, `pendingTransaction` opcional, `confirmationRequired`) **+** campo:

- `intentKind`: `"pending_transaction"` — há lançamento proposto; o app deve pedir confirmação e chamar o passo 2 com o payload abaixo.  
- `intentKind`: `"informational"` — só texto / navegação; **não** chame `/intents/execute`.

**Exemplo de comando de lançamento** (mesmo formato do widget):

`despesa pix restaurante 31,34 hoje`  
`receita banco aluguel 1500,00`

---

## 2) Executar confirmação — `POST /assistant/intents/execute`

Chamado **depois** que o usuário confirmar na UI. O corpo deve ser **exatamente** o envelope `confirmation` necessário para criar o lançamento — use o objeto `pendingTransaction` **inteiro** devolvido no preview.

**Body (JSON):**

```json
{
  "confirmation": {
    "intent": "confirm_transaction",
    "pendingTransaction": {
      "kind": "finance_transaction",
      "originalMessage": "…",
      "draft": { … },
      "preview": { … }
    }
  }
}
```

Não remova nem altere campos de `pendingTransaction` entre o preview e o execute (IDs de conta/categoria, valores, etc.).

**Resposta:** sempre **HTTP 200** com envelope:

- Sucesso: `{ "success": true, "answer": "…", "action": { … }? }`
- Falha: `{ "success": false, "message": "…" }`  
  (erros de validação ou negócio são convertidos em `success: false` para facilitar o Swift.)

---

## Exemplo mínimo (Swift / URLSession)

Ajuste `baseURL` e o modelo `PreviewResponse` conforme os tipos reais do JSON (use `Codable` com `JSONDecoder`).

```swift
import Foundation

struct PreviewRequest: Encodable {
    let transcript: String
    let history: [HistoryItem]?
    let currentPath: String?

    struct HistoryItem: Encodable {
        let role: String // "user" | "assistant"
        let content: String
    }
}

struct ExecuteRequest: Encodable {
    let confirmation: Confirmation

    struct Confirmation: Encodable {
        let intent: String // "confirm_transaction"
        let pendingTransaction: JSONValue // ou struct gerada a partir do preview
    }
}

enum JSONValue: Encodable {
    case object([String: JSONValue])
    case array([JSONValue])
    case string(String)
    case number(Double)
    case bool(Bool)
    case null

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let s): try c.encode(s)
        case .number(let n): try c.encode(n)
        case .bool(let b): try c.encode(b)
        case .null: try c.encodeNil()
        default: break // simplificado — na prática decodifique o preview em [String: Any] e re-encode
        }
    }
}

func postPreview(token: String, baseURL: URL, transcript: String) async throws -> Data {
    var req = URLRequest(url: baseURL.appendingPathComponent("assistant/intents/preview"))
    req.httpMethod = "POST"
    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    let body = PreviewRequest(transcript: transcript, history: nil, currentPath: nil)
    req.httpBody = try JSONEncoder().encode(body)
    let (data, response) = try await URLSession.shared.data(for: req)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
        throw URLError(.badServerResponse)
    }
    return data
}

func postExecute(token: String, baseURL: URL, confirmationPayload: [String: Any]) async throws -> Data {
    var req = URLRequest(url: baseURL.appendingPathComponent("assistant/intents/execute"))
    req.httpMethod = "POST"
    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    let body: [String: Any] = ["confirmation": confirmationPayload]
    req.httpBody = try JSONSerialization.data(withJSONObject: body)
    let (data, _) = try await URLSession.shared.data(for: req)
    return data
}
```

Na prática, o fluxo típico é:

1. `let previewData = try await postPreview(...)`  
2. `let json = try JSONSerialization.jsonObject(with: previewData) as? [String: Any]`  
3. Se `intentKind == "pending_transaction"`, extraia `pendingTransaction` e monte  
   `confirmation = ["intent": "confirm_transaction", "pendingTransaction": pendingDict]`  
4. Após o utilizador tocar em “Confirmar”, chame `postExecute` com esse dicionário.  
5. Decodifique a resposta e verifique `success`.

---

## Endpoint legado (widget)

`POST /assistant/chat` continua disponível com `message` + opcional `confirmation` — o fluxo em duas etapas do iOS espelha esse contrato, mas com URLs dedicadas e resposta de execução com `success`.
