#pragma once 

#include "TCP_Client.h"
#include <ESP8266WiFi.h>

class TCP_Manager : public TCP_Client
{
private:
    WiFiClient client;
    
    // Данные для авто-переподключения к Qt серверу
    String server_ip;
    uint16_t server_port;

    // IP для подключения к роутеру (Station Mode)
    IPAddress local_IP{192, 168, 7, 17};
    IPAddress gateway{192, 168, 7, 1};
    IPAddress subnet{255, 255, 255, 0};

public:
    TCP_Manager() {}
    
    ~TCP_Manager() override {
        Disconnect();
    }

    // Метод для подключения к WiFi роутеру
    void ConnectWiFi(const char* ssid, const char* pass);

    // Метод для подключения к Qt C++ серверу
    bool Connect(const char* ip, uint16_t port) override;

    void Disconnect() override {
        if (client.connected()) {
            client.stop();
        }
    }

    bool SendPacket(const C2ESPpacket& packet) override;
    bool ReceivePacket() override;
    
    bool IsConnected() {
        return client.connected();
    }

    // Метод для поддержания связи и чтения пакетов (вызывать в loop)
    void Process();
};