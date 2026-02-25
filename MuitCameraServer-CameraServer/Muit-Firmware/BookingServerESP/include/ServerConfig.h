#pragma once
#include <EEPROM.h>
#include <Arduino.h>

// Изменили magic число — это сбросит старые данные EEPROM и запишет новые дефолты
#define CONFIG_MAGIC 0xB2

struct ServerConfigData {
    uint8_t  magic;
    char     serverIp[32];   // IP Qt сервера
    uint16_t serverPort;     // Порт Qt сервера
    char     wifiSsid[32];   // Имя WiFi роутера
    char     wifiPass[64];   // Пароль WiFi роутера
};

class ServerConfig {
private:
    ServerConfigData data;

    void writeToEEPROM() {
        EEPROM.begin(sizeof(ServerConfigData));
        uint8_t* ptr = (uint8_t*)&data;
        for (size_t i = 0; i < sizeof(ServerConfigData); i++) {
            EEPROM.write(i, ptr[i]);
        }
        EEPROM.commit();
        EEPROM.end();
    }

    bool readFromEEPROM() {
        EEPROM.begin(sizeof(ServerConfigData));
        uint8_t* ptr = (uint8_t*)&data;
        for (size_t i = 0; i < sizeof(ServerConfigData); i++) {
            ptr[i] = EEPROM.read(i);
        }
        EEPROM.end();
        return (data.magic == CONFIG_MAGIC);
    }

public:
    // Загружает из EEPROM, при первом запуске записывает дефолты
    void load(const char* defaultIp,   uint16_t    defaultPort,
              const char* defaultSsid, const char* defaultPass) {
        if (!readFromEEPROM()) {
            Serial.println("[CONFIG] EEPROM empty, writing defaults");
            data.magic = CONFIG_MAGIC;
            strncpy(data.serverIp,  defaultIp,   sizeof(data.serverIp)  - 1);
            strncpy(data.wifiSsid,  defaultSsid, sizeof(data.wifiSsid)  - 1);
            strncpy(data.wifiPass,  defaultPass, sizeof(data.wifiPass)  - 1);
            data.serverIp [sizeof(data.serverIp)  - 1] = '\0';
            data.wifiSsid [sizeof(data.wifiSsid)  - 1] = '\0';
            data.wifiPass [sizeof(data.wifiPass)  - 1] = '\0';
            data.serverPort = defaultPort;
            writeToEEPROM();
        } else {
            Serial.printf("[CONFIG] Server: %s:%d | WiFi SSID: %s\n",
                          data.serverIp, data.serverPort, data.wifiSsid);
        }
    }

    // Сохраняет настройки Qt сервера
    void saveServer(const char* newIp, uint16_t newPort) {
        strncpy(data.serverIp, newIp, sizeof(data.serverIp) - 1);
        data.serverIp[sizeof(data.serverIp) - 1] = '\0';
        data.serverPort = newPort;
        data.magic = CONFIG_MAGIC;
        writeToEEPROM();
        Serial.printf("[CONFIG] Server saved: %s:%d\n", newIp, newPort);
    }

    // Сохраняет настройки WiFi роутера
    void saveWifi(const char* newSsid, const char* newPass) {
        strncpy(data.wifiSsid, newSsid, sizeof(data.wifiSsid) - 1);
        strncpy(data.wifiPass, newPass, sizeof(data.wifiPass) - 1);
        data.wifiSsid[sizeof(data.wifiSsid) - 1] = '\0';
        data.wifiPass[sizeof(data.wifiPass)  - 1] = '\0';
        data.magic = CONFIG_MAGIC;
        writeToEEPROM();
        Serial.printf("[CONFIG] WiFi saved: SSID=%s\n", newSsid);
    }

    const char* Ip()       const { return data.serverIp; }
    uint16_t    Port()     const { return data.serverPort; }
    const char* WifiSsid() const { return data.wifiSsid; }
    const char* WifiPass() const { return data.wifiPass; }
};