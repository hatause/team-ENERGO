#include "TCP_Connector.h"

TCP_Connector::TCP_Connector(QObject *parent) : QObject{parent} {
    m_socket = new QTcpSocket(this);

    connect(m_socket, &QTcpSocket::connected, this, &TCP_Connector::signalConnected);
    connect(m_socket, &QTcpSocket::disconnected, this, &TCP_Connector::signalDisconnected);
    connect(m_socket, &QTcpSocket::readyRead, this, [this](){
        emit signalDataReceived(m_socket->readAll());
    });
}

TCP_Connector::~TCP_Connector() {
    if (m_socket->isOpen()) m_socket->close();
}

void TCP_Connector::connectToServer(const QString& host, quint16 port) {
    m_socket->connectToHost(host, port);
}

void TCP_Connector::disconnectFromServer() {
    m_socket->disconnectFromHost();
}

bool TCP_Connector::isConnected() const {
    return m_socket->state() == QAbstractSocket::ConnectedState;
}

void TCP_Connector::writeRawData(const QByteArray& data) {
    if (isConnected()) {
        m_socket->write(data);
        m_socket->flush();
    }
}
