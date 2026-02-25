#pragma once 

#include "Dictionary.h"
#include <queue>
class TCP_Client 
{
protected: // Позволяет наследнику (TCP_Manager) добавлять элементы в очередь
    std::queue<C2ESPpacket> PacketStorage;

public:
    TCP_Client() = default;
    virtual ~TCP_Client() = default;

    // Виртуальные функции для работы с соединением
    virtual bool Connect(const char* ip, uint16_t port) = 0;
    virtual void Disconnect() = 0;

    // Виртуальные функции получения и отправки пакета
    virtual bool SendPacket(const C2ESPpacket& packet) = 0;
    virtual bool ReceivePacket() = 0;

    // Вспомогательные методы для работы с очередью (чтобы не обращаться к ней напрямую)
    bool HasPackets() const { return !PacketStorage.empty(); }
    C2ESPpacket GetNextPacket() {
        C2ESPpacket p = PacketStorage.front();
        PacketStorage.pop();
        return p;
    }
};