# Checklist de homologação — SmartPOS PagBank

Referência: [Guia de boas práticas SmartPOS](https://developer.pagbank.com.br/docs/guia-de-boas-praticas-smartpos)

## Configuração do aplicativo

| Requisito | Status no projeto |
|-----------|-------------------|
| APK ≤ 200 MB | ✅ Build release enxuto (sem Play Services / tooling em release) |
| `minSdkVersion` 23 | ✅ `minSdk = 23` em `app/build.gradle.kts` |
| `targetSdkVersion` | ✅ `targetSdk = 33` (mínimo PagBank é API 23; confirme com o auditor se exigem valor literal 23) |
| Assinatura V1 + V2 | ⚠️ Configurar no Android Studio: *Build > Generate Signed Bundle/APK* com ambas assinaturas |
| `versionCode` único por release | ⚠️ Incrementar manualmente a cada envio |
| Nome/ícone alinhados ao manifest | ✅ `@string/app_name` + ícones `ic_launcher` |
| Sem `allowBackup` / `debuggable` / `testOnly` em produção | ✅ `release`: `allowBackup=false`, `isDebuggable=false`; debug isolado em `src/debug/` |

## Segurança e privacidade

| Requisito | Status no projeto |
|-----------|-------------------|
| Coleta mínima de dados | ✅ Apenas dados de mesa/pedido mock; pagamento via PlugPag |
| Dados sensíveis em Keystore | ✅ `SecureStore` (EncryptedSharedPreferences) pronto para tokens/NSU |
| HTTPS / TLS, sem cleartext | ✅ `network_security_config.xml` + `usesCleartextTraffic=false` |
| Sem serviços de acessibilidade | ✅ Não declarados |
| Sem armazenamento externo (SDCARD) | ✅ Permissões `READ/WRITE_EXTERNAL_STORAGE` removidas |
| Sem alterar data/hora/idioma do sistema | ✅ Não implementado |

## Integrações

| Requisito | Status no projeto |
|-----------|-------------------|
| Apenas WrapperPPS (PlugPag) | ✅ `wrapper:1.33.0`; sem SUNMI/PAX SDK próprio |
| Sem Google Play Services | ✅ `exclude` em Gradle |
| Sem WebView / WebApp | ✅ UI 100% Jetpack Compose nativo |
| Sem ADB em produção | ⚠️ Usar build **release** assinado no terminal de homologação |

## Permissões

**Declaradas (lista permitida):**

- `INTERNET`
- `ACCESS_NETWORK_STATE`
- `READ_PHONE_STATE` (PlugPag / terminal)
- `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` (opcional PagBank)

**Removidas / não usadas:**

- `READ/WRITE_EXTERNAL_STORAGE` (proibido — SDCARD)
- Permissões da [lista proibida](https://developer.pagbank.com.br/docs/guia-de-boas-praticas-smartpos) (ex.: `QUERY_ALL_PACKAGES`, `SYSTEM_ALERT_WINDOW`)

**Mescladas pelo SDK PlugPag (necessárias):**

- `br.com.uol.pagseguro.permission.MANAGE_PAYMENTS`
- `CHANGE_WIFI_STATE`

## Comportamento do app

| Requisito | Status no projeto |
|-----------|-------------------|
| Prevenção de duplo clique em pagamento | ✅ `PaymentActionGuard` no ViewModel |
| Mock de pagamento só em debug | ✅ `MockPlugPagPaymentGateway` apenas se `BuildConfig.DEBUG` |
| Impressão / transação via PlugPag | ✅ `PlugPagManager` |
| Padrão [SmartCoffee demo](https://github.com/pagseguro/pagseguro-plugpagservicewrapper-smartcoffeedemo) | ✅ singleton, `isServiceBusy`, mutex, logs, `startOnBoarding` |

## Antes de enviar o APK

1. Gerar **release** assinado (V1+V2).
2. Instalar no **terminal DEBUG** PagBank.
3. Validar pagamento PIX, crédito, débito e estorno.
4. Confirmar manifest final: `./gradlew :app:processReleaseMainManifest` e revisar permissões.
5. Incrementar `versionCode`.
6. Preparar descrição do app **sem dados reais** em screenshots.

## Build de homologação

```bash
./gradlew :app:assembleRelease
```

APK: `app/build/outputs/apk/release/app-release.apk`
