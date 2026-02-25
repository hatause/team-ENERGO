#ifndef TCP_CONNECTOR_H
#define TCP_CONNECTOR_H

#include <QObject>
#include <QTcpSocket>
#include <QAbstractSocket>

class TCP_Connector : public QObject
{
    Q_OBJECT
public:
    explicit TCP_Connector(QObject *parent = nullptr);
    virtual ~TCP_Connector();

    bool isConnected() const;

public slots:
    void connectToServer(const QString& host, quint16 port);
    void disconnectFromServer();

protected:
    QTcpSocket* m_socket;

    // Вспомогательный метод для отправки сырых байт
    void writeRawData(const QByteArray& data);

signals:
    void signalConnected();
    void signalDisconnected();
    void signalError(const QString& error);
    void signalDataReceived(const QByteArray& data);
};

#endif // TCP_CONNECTOR_H
