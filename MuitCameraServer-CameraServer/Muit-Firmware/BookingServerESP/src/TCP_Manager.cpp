#include "TCP_Manager.h"

void TCP_Manager::ConnectWiFi(const char* ssid, const char* pass) {
    // WiFi.config(local_IP, gateway, subnet);
    WiFi.begin(ssid, pass);

    Serial.print("Connecting to WiFi...");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nConnected to Router!");
        Serial.print("STA IP: "); Serial.println(WiFi.localIP());
    } else {
        Serial.println("\nFailed to connect to Router.");
    }
}

bool TCP_Manager::Connect(const char* ip, uint16_t port) {
   server_ip = String(ip);
    server_port = port;
    
    Serial.printf("Attempting connection to %s:%d...\n", ip, port);
    
    // Пытаемся подключиться
    int result = client.connect(ip, port);
    
    if (result == 1) {
        Serial.println("CONNECTED to Qt Server!");
        return true;
    } else {
        // Выводим детальную причину
        Serial.print("Connection failed. Reason: ");
        if (WiFi.status() != WL_CONNECTED) Serial.println("WiFi lost connection.");
        else Serial.println("Server refused connection or unreachable.");
        return false;
    }
}

void TCP_Manager::Process() {
    // Если нет WiFi, к TCP серверу мы тоже не подключимся
    if (WiFi.status() != WL_CONNECTED) return;

    // Авто-переподключение к Qt серверу, если связь оборвалась
    if (!client.connected()) {
        Serial.println("Reconnecting to Qt Server...");
        if (Connect(server_ip.c_str(), server_port)) {
            Serial.println("Connected to Qt Server!");
        } else {
            delay(2000); // Небольшая пауза перед следующей попыткой, чтобы не спамить
            return;
        }
    }

    // Читаем пакеты, пока они есть в буфере (9 байт)
    while (client.available() >= 9) {
        ReceivePacket();
    }
}

bool TCP_Manager::ReceivePacket() {
    const size_t expectedSize = sizeof(int32_t) * 2 + sizeof(uint8_t);
    
    if (!client.connected() || client.available() < expectedSize) {
        return false; 
    }

    int32_t id, cabNum;
    uint8_t isBusy;

    client.read((uint8_t*)&id, sizeof(id));
    client.read((uint8_t*)&cabNum, sizeof(cabNum));
    client.read(&isBusy, sizeof(isBusy));

    C2ESPpacket p;
    p.SetId(id);
    p.SetCabNum(cabNum);
    p.SetIsBusy(isBusy != 0);
    Serial.printf("Received Packet - ID: %d, CabNum: %d, IsBusy: %s\n", id, cabNum, p.IsBusy() ? "BUSY" : "FREE");


    PacketStorage.push(p);
    return true;
}

bool TCP_Manager::SendPacket(const C2ESPpacket& packet) {
    if (!client.connected()) return false;

    int32_t id = packet.Id();
    int32_t cabNum = packet.CabNum();
    uint8_t isBusy = packet.IsBusy() ? 1 : 0;

    client.write((const uint8_t*)&id, sizeof(id));
    client.write((const uint8_t*)&cabNum, sizeof(cabNum));
    client.write(&isBusy, sizeof(isBusy));

    return true;
}