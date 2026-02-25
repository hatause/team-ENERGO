#pragma once
#include <ESP8266WiFi.h>
#include "TCP_Manager.h"
#include "CabinetStorage.h"
#include "EspWebServer.h"
#include "Constants.h"
#include "ServerConfig.h"

class AppController {
private:
    CabinetStorage storage;
    ServerConfig   config;
    EspWebServer   webServer;
    TCP_Manager    tcpClient;

    // Запоминаем последний известный адрес сервера
    String   lastKnownIp;
    uint16_t lastKnownPort = 0;

public:
    AppController() : webServer(storage, config) {}

    void setup() {
        Serial.begin(115200);
        delay(1000);

        config.load(SERVER_QT_IP, SERVER_QT_PORT,
                    WIFI_DEFAULT_SSID, WIFI_DEFAULT_PASS);

        WiFi.mode(WIFI_AP_STA);

        webServer.StartAP(AP_SSID, AP_PASSWORD);
        webServer.begin();

        tcpClient.ConnectWiFi(config.WifiSsid(), config.WifiPass());

        // Сохраняем текущий адрес чтобы потом сравнивать
        lastKnownIp   = String(config.Ip());
        lastKnownPort = config.Port();

        tcpClient.Connect(config.Ip(), config.Port());
    }

    void loop() {
        webServer.handle();

        // Проверяем: изменился ли адрес сервера через /admin/save-server?
        // Если да — разрываем старое соединение и подключаемся к новому
        if (String(config.Ip()) != lastKnownIp || config.Port() != lastKnownPort) {
            Serial.printf("[APP] Server changed: %s:%d -> %s:%d\n",
                lastKnownIp.c_str(), lastKnownPort,
                config.Ip(), config.Port());

            lastKnownIp   = String(config.Ip());
            lastKnownPort = config.Port();

            tcpClient.Disconnect();           // Разрываем старое соединение
            delay(100);
            tcpClient.Connect(config.Ip(), config.Port()); // Подключаемся к новому
        }

        tcpClient.Process();

        while (tcpClient.HasPackets()) {
            C2ESPpacket packet = tcpClient.GetNextPacket();
            storage.UpdateOrAddPacket(packet);
            webServer.setLastRequest(packet.CabNum());
            Serial.printf("Updated: Cab %d, Status: %s\n",
                          packet.CabNum(), packet.IsBusy() ? "BUSY" : "FREE");
        }
    }
};