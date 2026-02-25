#ifndef DATABASECONNECTOR_H
#define DATABASECONNECTOR_H

#include <QObject>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QDebug>
#include <QObject>
#include <QTimer>
#include <QThread>
class DatabaseConnector : public QObject
{
    Q_OBJECT
public:
    explicit DatabaseConnector(const QString& host, const QString& dbName,
                               const QString& user, const QString& password, QObject* parent = nullptr);
    ~DatabaseConnector();

public slots:
    bool openConnection();
    void closeConnection();

protected:
    QSqlDatabase m_db;
    QString m_host;
    QString m_dbName;
    QString m_user;
    QString m_password;

    int reconnectionCount = 0;
private:
    QString m_connectionName;


signals:
    void signalDatabaseConnected();
    void signalDatabaseNotConnected();
private:
    void connectionOpener();
};

#endif // DATABASECONNECTOR_H
