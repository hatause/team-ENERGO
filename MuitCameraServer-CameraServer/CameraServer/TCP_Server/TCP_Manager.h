#ifndef TCP_MANAGER_H
#define TCP_MANAGER_H

#include <QObject>
#include "TCP_Connector.h"
#include "TCP_Server_dictionary.h"
#include <QDataStream>

#include <QObject>
#include "TCP_Server.h"
#include "TCP_Server_dictionary.h"
#include <QDataStream>
#include <QDebug>
#include <QTime>
#include <QString>
#include <QJsonDocument>
#include <QJsonObject>

class TCP_Manager : public TCP_Server
{
    Q_OBJECT
public:
    explicit TCP_Manager(QObject *parent = nullptr);

    // Универсальный шаблон для отправки любого пакета
    // По умолчанию отправляем всем подключённым клиентам.
    void sendRawDataToIp(const QByteArray& data, const QString& targetIp) {
        for (QTcpSocket* client : m_clients) {
            // Проверяем, что клиент подключен и его IP совпадает
            if (client && client->peerAddress().toString().contains(targetIp)) {
                client->write(data);
                client->flush(); // Немедленная отправка
                qDebug() << "[TCP_MANAGER] JSON sent to" << targetIp;
                return;
            }
        }
        qWarning() << "[TCP_MANAGER] Could not find client with IP:" << targetIp;
    }

    template<typename T>
    void sendPacketToIp(const T& packet, const QString& targetIp) {
        QByteArray block;
        QDataStream out(&block, QIODevice::WriteOnly);
        out.setVersion(QDataStream::Qt_6_0);
        out << packet;

        for (QTcpSocket* client : m_clients) {
            if (client && client->peerAddress().toString().contains(targetIp)) {
                writeRawData(block, client);
                qDebug() << "[TCP_MANAGER] Packet sent to" << targetIp;
                return;
            }
        }
        qWarning() << "[TCP_MANAGER] Target IP not found:" << targetIp;
    }


    template<typename T>
    void sendPacket(const T& packet) {
        QByteArray block;
        QDataStream out(&block, QIODevice::WriteOnly);
        out.setVersion(QDataStream::Qt_6_0); // Укажите вашу версию Qt

        // Сериализуем пакет в байты
        out << packet;

        writeRawData(block, nullptr); // broadcast
        qDebug() << "[TCP_MANAGER] Packet sent. Size:" << block.size();
    }

    // Отправка конкретному клиенту (если нужно).
    template<typename T>
    void sendPacketToClient(const T& packet, QTcpSocket* client) {
        if (!client) return;
        QByteArray block;
        QDataStream out(&block, QIODevice::WriteOnly);
        out.setVersion(QDataStream::Qt_6_0);
        out << packet;
        writeRawData(block, client);
        qDebug() << "[TCP_MANAGER] Packet sent to client. Size:" << block.size();
    }

signals:
    // Сигналы о получении конкретных типов данных
    void packetReceived(const Java2CPacket& packet);

protected slots:
    virtual void onRawDataReceived(const QByteArray& data);
};

// Чтобы QDataStream понимал ваши структуры, нужно перегрузить операторы << и >>
// Это можно вынести в отдельный заголовочный файл или добавить в dictionary.h

inline QDataStream& operator<<(QDataStream& out, const C2JavaPacket& p) {
    return out << p.Id() << p.Cabinet();
}

inline QDataStream& operator<<(QDataStream& out, const C2EspPacket& p) {
    return out << p.Id() << p.Cabinet() << p.IsBusy();
}

inline QDataStream& operator>>(QDataStream& in, Java2CPacket& p) {
    int id, duration;
    QTime time;
    QString corpus;
    in >> id >> time >> corpus >> duration;
    p.SetId(id); p.SetTime(time); p.SetCorpus(corpus); p.SetDuration(duration);
    return in;
}

#endif // TCP_MANAGER_H
