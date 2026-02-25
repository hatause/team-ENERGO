#pragma once 
#include "Dictionary.h"
#include <vector>

class CabinetStorage {
private:
    std::vector<C2ESPpacket> cabinet;
public:
    // Обновляет существующий кабинет или добавляет новый
    void UpdateOrAddPacket(const C2ESPpacket& packet) {
        for (auto& p : cabinet) {
            if (p.CabNum() == packet.CabNum()) {
                p.SetId(packet.Id());
                p.SetIsBusy(packet.IsBusy());
                return;
            }
        }
        cabinet.push_back(packet);
    }
    
    const std::vector<C2ESPpacket>& GetAllCabinets() const {
        return cabinet;
    }

    C2ESPpacket GetPacketByCab(int cab_num) {
        for (const auto& packet : cabinet) {
            if (packet.CabNum() == cab_num) return packet;
        }
        C2ESPpacket empty;
        empty.SetCabNum(cab_num);
        return empty;
    }
};