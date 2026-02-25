#include "EspServerProxy.h"

EspServerProxy::EspServerProxy(SettingsFile* file, QObject* parent)
    : TCP_Manager(parent), Ip(file->tcpSettings.IpESP()) {

}


void EspServerProxy::slotCabinetAnswer(const AuditoryNote& note){
    // C2EspPacket packet;

    // packet.SetId(note.Id());
    // packet.SetCabinet(note.AudNumber());
    // packet.SetBusy(true);

    // sendPacketToIp<C2EspPacket>(packet, Ip);
    QByteArray data;
    int32_t _id = note.Id();
    int32_t _cab = note.AudNumber();
    int8_t _busy = true;

    data.append((char*)&_id, 4);
    data.append((char*)&_cab, 4);
    data.append((char*)&_busy, 1);

    sendRawDataToIp(data, Ip);
}
