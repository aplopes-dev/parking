# SmartPos Parking (Android)

Terminal SmartPOS PagBank para operação **Valet** integrado ao backend [Aplopes Estacionamento](https://github.com/aplopes-dev/parking).

## Funcionalidades

- Login multitenant (mesmo JWT do painel web)
- Fila valet em 3 abas: Recebimento · Estacionados · Entrega
- Receber veículo, manobrar, solicitar retorno, cobrar e entregar
- Pagamento PlugPag (PIX, crédito, débito, dinheiro)
- **Tempo real** via WebSocket — alterações no painel web refletem no app instantaneamente

## Pré-requisitos

- Android Studio (Ladybug+) com JDK 17
- Backend rodando (`docker compose up` na raiz do monorepo)
- Terminal PagBank ou emulador com mock de pagamento (debug)

## Configuração da API

Produção (padrão em `app/build.gradle.kts`):

```kotlin
buildConfigField("String", "API_BASE_URL", "\"https://estacionamento.aplopes.com/api/\"")
```

WebSocket: `wss://estacionamento.aplopes.com/api/mobile/ws?token=<JWT>`

### Desenvolvimento local

No build type `debug`, descomente em `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3085/api/\"")
```

- **Emulador:** `10.0.2.2` aponta para `localhost` do host
- **Terminal físico na LAN:** use o IP da máquina, ex. `http://192.168.1.10:3085/api/`

## Executar

```bash
cd android
./gradlew :app:assembleDebug
```

Abra o projeto no Android Studio e rode no dispositivo/emulador.

## Credenciais de teste

| Campo | Valor |
|-------|--------|
| Organização | `home` |
| E-mail | `admin@estacionamento.aplopes.com` |
| Senha | `admin123` |

## Documentação da API

Ver [docs/PARKING_MOBILE_API.md](../docs/PARKING_MOBILE_API.md).

## Build release (homologação PagBank)

```bash
./gradlew :app:assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

Homologação exige APK assinado instalado no terminal de desenvolvimento PagBank.
