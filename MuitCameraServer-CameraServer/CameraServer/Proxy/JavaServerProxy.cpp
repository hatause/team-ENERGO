#include "JavaServerProxy.h"


JavaServerProxy::JavaServerProxy(SettingsFile* file, QObject* parent)
    : TCP_Manager(parent), Ip(file->tcpSettings.IpJava()) {
    connect(this, &TCP_Manager::packetReceived, this, &JavaServerProxy::slotPacketJavaReceived);
}

void JavaServerProxy::slotPacketJavaReceived(const Java2CPacket& packet){
    emit signalFindRequest(packet.Corpus(), packet.Time(), packet.Duration());
}

void JavaServerProxy::slotCabinetAnswer(const AuditoryNote& note) {
    // 1. Создаем JSON объект с данными
    QJsonObject jsonObj;
    jsonObj["id"] = note.Id();
    jsonObj["cabinet"] = note.AudNumber();
    // Можно добавить дополнительные поля, если Java их ждет
    jsonObj["status"] = "answer";

    // 2. Превращаем в байты (Compact — без лишних пробелов)
    QJsonDocument doc(jsonObj);
    QByteArray jsonData = doc.toJson(QJsonDocument::Compact);

    // 3. Отправка
    // Если Java-сервер ждет 4 байта длины перед JSON (как в вашем прошлом примере):
    QByteArray block;
    QDataStream out(&block, QIODevice::WriteOnly);
    out.setVersion(QDataStream::Qt_6_0);
    out << (quint32)jsonData.size(); // Записываем длину
    block.append(jsonData);          // Добавляем сам JSON

    // Используем ваш метод из TCP_Manager для отправки по IP
    // (Нужно убедиться, что в TCP_Manager есть доступ к writeRawData или прямой отправке)
    this->sendRawDataToIp(block, Ip);
}
