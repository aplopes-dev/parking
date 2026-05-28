#!/usr/bin/env bash
# Sobe o emulador com DNS explícito (corrige "ping: unknown host" no AVD).
# Uso: ./scripts/emulator-com-dns.sh
# Feche o emulador atual antes de rodar.

set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
EMULATOR="$SDK/emulator/emulator"
ADB="$SDK/platform-tools/adb"

AVD="${1:-Pixel_7}"

if [[ ! -x "$EMULATOR" ]]; then
  echo "Emulador não encontrado em $EMULATOR"
  echo "Instale via Android Studio → SDK Manager → Android Emulator"
  exit 1
fi

echo "Encerrando emuladores em execução..."
"$ADB" emu kill 2>/dev/null || true
sleep 2

echo "Iniciando AVD '$AVD' com DNS 8.8.8.8 / 8.8.4.4 ..."
"$EMULATOR" -avd "$AVD" -dns-server 8.8.8.8,8.8.4.4 &

echo "Aguardando boot..."
"$ADB" wait-for-device
while [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]]; do
  sleep 2
done

"$ADB" shell settings put global private_dns_mode off || true

echo ""
echo "Teste DNS:"
"$ADB" shell ping -c 2 google.com || true
echo ""
echo "Se o ping acima funcionar, no app use USE_MOCK_REPOSITORY=false e teste o login."
