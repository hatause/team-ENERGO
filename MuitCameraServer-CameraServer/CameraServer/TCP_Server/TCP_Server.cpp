#include "TCP_Server.h"

TCP_Server::TCP_Server(QObject *parent)
    : QObject(parent)
{
    m_server = new QTcpServer(this);

    connect(m_server, &QTcpServer::newConnection, this, &TCP_Server::onNewConnection);
#if (QT_VERSION >= QT_VERSION_CHECK(5, 15, 0))
    connect(m_server, &QTcpServer::acceptError, this, &TCP_Server::onAcceptError);
#endif
}

TCP_Server::~TCP_Server()
{
    stopServer();
}

bool TCP_Server::isConnected() const
{
    // Для сервера "connected" == есть активные клиенты.
    return !m_clients.isEmpty();
}

bool TCP_Server::isListening() const
{
    return m_server && m_server->isListening();
}

int TCP_Server::clientCount() const
{
    return m_clients.size();
}

bool TCP_Server::startServer(quint16 port, const QHostAddress& address)
{
    if (!m_server) {
        emit signalError("[TCP_SERVER] QTcpServer is null");
        return false;
    }

    if (m_server->isListening()) {

        qDebug() << "[TCP_SERVER] Listening....";
        // Уже слушаем — считаем успехом.
        emit signalListening(m_server->serverPort(), m_server->serverAddress());
        return true;
    }

    const bool ok = m_server->listen(address, port);
    if (!ok) {
        qDebug() << "[TCP_Server]{Connection} "<< "port: " << port << " " << m_server->errorString();
        emit signalError(QString("[TCP_SERVER] listen() failed: %1").arg(m_server->errorString()));
        return false;
    }

    emit signalListening(m_server->serverPort(), m_server->serverAddress());
    return true;
}

void TCP_Server::stopServer()
{
    disconnectAllClients();

    if (m_server && m_server->isListening()) {
        m_server->close();
        emit signalStopped();
    }
}

void TCP_Server::disconnectAllClients()
{
    // Копия списка — чтобы безопасно модифицировать оригинал.
    const auto clientsCopy = m_clients;
    for (QTcpSocket* s : clientsCopy) {
        if (!s) continue;
        // Сигнал disconnected() придёт, где мы его корректно удалим.
        s->disconnectFromHost();
        if (s->state() != QAbstractSocket::UnconnectedState) {
            s->waitForDisconnected(50);
        }
    }

    // Если какие-то сокеты уже в UnconnectedState, подчистим их.
    for (int i = m_clients.size() - 1; i >= 0; --i) {
        QTcpSocket* s = m_clients[i];
        if (!s || s->state() == QAbstractSocket::UnconnectedState) {
            m_clients.removeAt(i);
            if (s) s->deleteLater();
        }
    }
}

void TCP_Server::writeRawData(const QByteArray& data, QTcpSocket* target)
{
    if (data.isEmpty()) return;

    // Отправка конкретному клиенту
    if (target) {
        if (target->state() == QAbstractSocket::ConnectedState) {
            target->write(data);
            target->flush();
        }
        return;
    }

    // Broadcast всем
    for (int i = m_clients.size() - 1; i >= 0; --i) {
        QTcpSocket* s = m_clients[i];
        if (!s) {
            m_clients.removeAt(i);
            continue;
        }

        if (s->state() != QAbstractSocket::ConnectedState) {
            m_clients.removeAt(i);
            s->deleteLater();
            continue;
        }

        s->write(data);
        s->flush();
    }
}

void TCP_Server::onNewConnection()
{
    while (m_server && m_server->hasPendingConnections()) {
        QTcpSocket* client = m_server->nextPendingConnection();
        if (!client) continue;

        // Важно: родитель сервера, чтобы Qt управлял временем жизни.
        client->setParent(this);
        m_clients.push_back(client);

        connect(client, &QTcpSocket::readyRead, this, &TCP_Server::onClientReadyRead);
        connect(client, &QTcpSocket::disconnected, this, &TCP_Server::onClientDisconnected);
        connect(client, &QTcpSocket::errorOccurred, this, &TCP_Server::onClientError);

        const QString peer = client->peerAddress().toString();
        const quint16  pport = client->peerPort();
        emit signalClientConnected(peer, pport);
        emit signalConnected(); // совместимость
    }
}

void TCP_Server::onClientReadyRead()
{
    QTcpSocket* client = qobject_cast<QTcpSocket*>(sender());
    if (!client) return;

    const QByteArray data = client->readAll();
    if (data.isEmpty()) return;

    // Совместимость + расширенный сигнал
    emit signalDataReceived(data);
    emit signalDataReceivedFromClient(data, client->peerAddress().toString(), client->peerPort());
}

void TCP_Server::onClientDisconnected()
{
    QTcpSocket* client = qobject_cast<QTcpSocket*>(sender());
    if (!client) return;

    const QString peer = client->peerAddress().toString();
    const quint16  pport = client->peerPort();

    m_clients.removeAll(client);
    emit signalClientDisconnected(peer, pport);
    emit signalDisconnected(); // совместимость

    client->deleteLater();
}

void TCP_Server::onClientError(QAbstractSocket::SocketError)
{
    QTcpSocket* client = qobject_cast<QTcpSocket*>(sender());
    if (!client) return;

    emit signalError(QString("[TCP_SERVER] client(%1:%2) error: %3")
                         .arg(client->peerAddress().toString())
                         .arg(client->peerPort())
                         .arg(client->errorString()));
}

void TCP_Server::onAcceptError(QAbstractSocket::SocketError)
{
    if (!m_server) return;
    emit signalError(QString("[TCP_SERVER] acceptError: %1").arg(m_server->errorString()));
}
