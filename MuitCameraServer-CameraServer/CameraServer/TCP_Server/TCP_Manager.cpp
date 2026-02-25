#include "TCP_Manager.h"


TCP_Manager::TCP_Manager(QObject *parent) : TCP_Server(parent) {
    // Подписываемся на сырые данные от TCP_Server (совместимый сигнал)
    connect(this, &TCP_Server::signalDataReceived, this, &TCP_Manager::onRawDataReceived);
}

void TCP_Manager::onRawDataReceived(const QByteArray& data) {
    // 1. Отрезаем первые 4 байта (0000003b), оставляя только JSON
    // 1. Отрезаем первые 4 байта (заголовок длины), оставляя только JSON
    QByteArray jsonData = data.mid(4);

    // ВЫВОД ЧИСТОГО JSON В КОНСОЛЬ
    qDebug() << "[TCP_MANAGER] RAW JSON STRING:" << jsonData;

    QJsonParseError error;
    QJsonDocument doc = QJsonDocument::fromJson(jsonData, &error);

    if (error.error != QJsonParseError::NoError) {
        qWarning() << "[TCP_MANAGER] JSON Error:" << error.errorString();
        return;
    }

    if (doc.isObject()) {
        QJsonObject obj = doc.object();
        Java2CPacket packet;

        // Читаем ID, Corpus, Duration как обычно
        packet.SetId(obj["id"].toInt());
        packet.SetCorpus(obj["corpus"].toString());
        packet.SetDuration(obj["duration"].toInt());

        // 2. ИСПРАВЛЕНИЕ ВРЕМЕНИ:
        // Так как в JSON пришло "8:00" (строка), используем fromString
        QString timeStr = obj["start_time"].toString().trimmed();
        QTime time = QTime::fromString(timeStr, "HH:mm");
        if (!time.isValid()) time = QTime::fromString(timeStr, "HH:mm");
        if (!time.isValid()) time = QTime::fromString(timeStr, "HH:mm:ss");
        if (!time.isValid()) time = QTime::fromString(timeStr, Qt::ISODate); // Стандарт ISO

        if (!time.isValid()) {
            qWarning() << "[TCP_MANAGER] CRITICAL: Failed to parse time from string:" << timeStr;
        }

        packet.SetTime(time);

        qDebug() << "[TCP_MANAGER]{ONRAWDATAREC} Parsed Time:" << packet.Time().toString("HH:mm"); // Теперь будет 08:00

        emit packetReceived(packet);
    }
}
