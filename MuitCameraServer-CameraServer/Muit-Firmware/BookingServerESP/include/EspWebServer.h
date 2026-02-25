#pragma once
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include "CabinetStorage.h"
#include "ServerConfig.h"
#include "WebPage.h"
#include "AdminPage.h"

class EspWebServer {
private:
    ESP8266WebServer server;
    CabinetStorage& storage;
    ServerConfig&   config;
    int lastCabNum = 0;

public:
    EspWebServer(CabinetStorage& st, ServerConfig& cfg)
        : server(80), storage(st), config(cfg) {}

    void setLastRequest(int num) { lastCabNum = num; }

    void StartAP(const char* ssid = "ESP_Admin_Panel", const char* pass = "12345678") {
        WiFi.softAP(ssid, pass);
        Serial.print("AP IP: ");
        Serial.println(WiFi.softAPIP());
    }

    void begin() {
        // Главная страница
        server.on("/", [this]() {
            server.send_P(200, "text/html", index_html);
        });

        // API: статус кабинетов
        server.on("/api/status", [this]() {
            String json = "{\"last\":" + String(lastCabNum) + ",\"cabinets\":[";
            const auto& cabs = storage.GetAllCabinets();
            for (size_t i = 0; i < cabs.size(); i++) {
                json += "{\"num\":" + String(cabs[i].CabNum())
                      + ",\"isBusy\":" + (cabs[i].IsBusy() ? "true" : "false") + "}";
                if (i < cabs.size() - 1) json += ",";
            }
            json += "]}";
            server.send(200, "application/json", json);
        });

        // API: текущие настройки (пароль WiFi не отдаём)
        server.on("/api/config", [this]() {
            String json = "{\"serverIp\":\""  + String(config.Ip())
                        + "\",\"serverPort\":" + String(config.Port())
                        + ",\"wifiSsid\":\""  + String(config.WifiSsid()) + "\"}";
            server.send(200, "application/json", json);
        });

        // Страница администратора
        server.on("/admin", [this]() {
            server.send_P(200, "text/html", admin_html);
        });

        // POST: сохранить настройки Qt сервера
        server.on("/admin/save-server", HTTP_POST, [this]() {
            if (!server.hasArg("ip") || !server.hasArg("port")) {
                server.send(400, "application/json", "{\"ok\":false}");
                return;
            }
            String newIp   = server.arg("ip");
            int    newPort = server.arg("port").toInt();
            if (newIp.length() == 0 || newPort <= 0 || newPort > 65535) {
                server.send(400, "application/json", "{\"ok\":false}");
                return;
            }
            config.saveServer(newIp.c_str(), (uint16_t)newPort);
            server.send(200, "application/json", "{\"ok\":true}");
            Serial.printf("[ADMIN] Server updated: %s:%d\n", newIp.c_str(), newPort);
        });

        // POST: сохранить настройки WiFi роутера
        server.on("/admin/save-wifi", HTTP_POST, [this]() {
            if (!server.hasArg("ssid")) {
                server.send(400, "application/json", "{\"ok\":false}");
                return;
            }
            String newSsid = server.arg("ssid");
            String newPass = server.hasArg("pass") ? server.arg("pass") : "";
            if (newSsid.length() == 0) {
                server.send(400, "application/json", "{\"ok\":false}");
                return;
            }
            config.saveWifi(newSsid.c_str(), newPass.c_str());
            server.send(200, "application/json", "{\"ok\":true}");
            Serial.printf("[ADMIN] WiFi updated: %s\n", newSsid.c_str());
        });

        // POST: перезагрузка
        server.on("/admin/reboot", HTTP_POST, [this]() {
            server.send(200, "application/json", "{\"ok\":true}");
            delay(300);
            ESP.restart();
        });

        server.begin();
        Serial.println("Web Server started. Admin: http://<AP_IP>/admin");
    }

    void handle() {
        server.handleClient();
    }
};