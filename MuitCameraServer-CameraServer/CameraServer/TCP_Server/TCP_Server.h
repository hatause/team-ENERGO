#ifndef TCP_SERVER_H
#define TCP_SERVER_H

#include <QObject>
#include <QTcpServer>
#include <QTcpSocket>
#include <QHostAddress>
#include <QList>

// TCP_Server — простой TCP-сервер на Qt.
//  - Принимает входящие соединения (несколько клиентов).
//  - Генерирует те же базовые сигналы, что и TCP_Connector (signalConnected/signalDisconnected/signalDataReceived),
//    чтобы минимально ломать существующий код.
//  - Дополнительно даёт расширенные сигналы с информацией о клиенте.

class TCP_Server : public QObject
{
    Q_OBJECT
public:
    explicit TCP_Server(QObject *parent = nullptr);
    ~TCP_Server() override;

    // Совместимость по имени с предыдущим клиентским классом.
    // Для сервера это значит: "есть хотя бы один подключённый клиент".
    bool isConnected() const;
    bool isListening() const;
    int  clientCount() const;

public slots:
    // Запуск сервера. address по умолчанию Any (слушаем на всех интерфейсах).
    bool startServer(quint16 port, const QHostAddress& address = QHostAddress::Any);
    void stopServer();
    void disconnectAllClients();

protected:
    QTcpServer* m_server = nullptr;
    QList<QTcpSocket*> m_clients;

    // Отправка сырых байт.
    //  - если target == nullptr -> broadcast всем активным клиентам
    //  - если target != nullptr -> только выбранному клиенту
    void writeRawData(const QByteArray& data, QTcpSocket* target = nullptr);

signals:
    // Backward-compatible сигналы (без параметров/с минимальными параметрами)
    void signalConnected();
    void signalDisconnected();
    void signalError(const QString& error);
    void signalDataReceived(const QByteArray& data);

    // Расширенные сигналы сервера
    void signalListening(quint16 port, const QHostAddress& address);
    void signalStopped();
    void signalClientConnected(const QString& peerAddress, quint16 peerPort);
    void signalClientDisconnected(const QString& peerAddress, quint16 peerPort);
    void signalDataReceivedFromClient(const QByteArray& data, const QString& peerAddress, quint16 peerPort);

private slots:
    void onNewConnection();
    void onClientReadyRead();
    void onClientDisconnected();
    void onClientError(QAbstractSocket::SocketError);
    void onAcceptError(QAbstractSocket::SocketError);
};


#endif // TCP_SERVER_H
