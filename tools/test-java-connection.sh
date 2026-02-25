#!/bin/bash
# Тест подключения к Java серверу hacatonLocal
# Запусти: bash tools/test-java-connection.sh

JAVA_URL="http://172.20.10.4:3333"

echo "========================================="
echo "  Тест подключения к Java серверу"
echo "  URL: $JAVA_URL"
echo "========================================="
echo ""

# 1. Пинг
echo "1️⃣  Пинг..."
ping -c 2 -t 3 172.20.10.4 > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Пинг проходит"
else
  echo "   ❌ Пинг НЕ проходит — машина не в сети"
  echo "   Проверь: подключены ли оба устройства к одному Wi-Fi/Hotspot?"
  exit 1
fi

# 2. TCP порт
echo ""
echo "2️⃣  Проверка порта 3333..."
nc -z -w 5 172.20.10.4 3333 > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Порт 3333 открыт"
else
  echo "   ❌ Порт 3333 ЗАКРЫТ"
  echo ""
  echo "   На Windows-машине выполни:"
  echo "   1) PowerShell (Администратор):"
  echo "      netsh advfirewall firewall add rule name=\"Java Server 3333\" dir=in action=allow protocol=TCP localport=3333"
  echo "   2) Проверь application.properties:"
  echo "      server.address=0.0.0.0"
  echo "   3) Перезапусти Java сервер"
  exit 1
fi

# 3. GET /api/bridge (health)
echo ""
echo "3️⃣  GET /api/bridge (health-check)..."
HEALTH=$(curl -s -w "\n%{http_code}" --connect-timeout 5 "$JAVA_URL/api/bridge" 2>&1)
HTTP_CODE=$(echo "$HEALTH" | tail -1)
BODY=$(echo "$HEALTH" | head -n -1)
echo "   HTTP: $HTTP_CODE"
echo "   Body: $BODY"
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Health-check OK"
else
  echo "   ❌ Health-check FAILED"
fi

# 4. GET /api/schedule/auditories
echo ""
echo "4️⃣  GET /api/schedule/auditories..."
AUD=$(curl -s -w "\n%{http_code}" --connect-timeout 5 "$JAVA_URL/api/schedule/auditories" 2>&1)
HTTP_CODE=$(echo "$AUD" | tail -1)
BODY=$(echo "$AUD" | head -n -1)
echo "   HTTP: $HTTP_CODE"
echo "   Body (первые 200 символов): ${BODY:0:200}"

# 5. POST /api/bridge (поиск кабинетов)
echo ""
echo "5️⃣  POST /api/bridge (поиск свободных кабинетов)..."
SEARCH=$(curl -s -w "\n%{http_code}" --connect-timeout 10 \
  -X POST "$JAVA_URL/api/bridge" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "main",
    "start_at": "2026-02-25T17:00:00",
    "duration_minutes": 60,
    "requested_by": {"telegram_user_id": 0},
    "filters": {}
  }' 2>&1)
HTTP_CODE=$(echo "$SEARCH" | tail -1)
BODY=$(echo "$SEARCH" | head -n -1)
echo "   HTTP: $HTTP_CODE"
echo "   Body: $BODY"
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Bridge POST OK"
else
  echo "   ❌ Bridge POST FAILED"
fi

echo ""
echo "========================================="
echo "  Тест завершён"
echo "========================================="
