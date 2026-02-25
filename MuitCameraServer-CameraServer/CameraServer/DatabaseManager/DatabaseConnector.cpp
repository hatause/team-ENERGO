#include "DatabaseConnector.h"
#include <QMessageBox>

DatabaseConnector::DatabaseConnector(const QString& host, const QString& dbName,
                                     const QString& user, const QString& password, QObject* parent)
    : QObject(parent), m_host(host), m_dbName(dbName), m_user(user), m_password(password)
{
    connectionOpener();

    reconnectionCount = 0;

    // openConnection();
}


DatabaseConnector::~DatabaseConnector() {
    // closeConnection();
    closeConnection();
    const QString name = m_connectionName;
    m_db = QSqlDatabase();              // отцепиться от connection
    QSqlDatabase::removeDatabase(name); // удалить из пула Qt
}

void DatabaseConnector::connectionOpener(){
    // m_db = QSqlDatabase::addDatabase("QODBC", "hackatonConnection");
    // {
    //     QString dsn = QString("DRIVER={ODBC Driver 17 for SQL Server};SERVER=%1;DATABASE=%2;Trusted_Connection=yes;TrustServerCertificate=yes;").arg(m_host).arg(m_dbName)/*.arg(m_user).arg(m_password)*/;
    //     m_db.setDatabaseName(dsn);
    // }

    m_connectionName = QString("db_%1_%2")
                           .arg(reinterpret_cast<quintptr>(this))
                           .arg(reinterpret_cast<quintptr>(QThread::currentThreadId()));

    m_db = QSqlDatabase::addDatabase("QODBC", m_connectionName);

    QString dsn = QString(
                      "DRIVER={ODBC Driver 17 for SQL Server};"
                      "SERVER=%1;DATABASE=%2;"
                      "Trusted_Connection=yes;TrustServerCertificate=yes;")
                      .arg(m_host).arg(m_dbName);

    m_db.setDatabaseName(dsn);

}


bool DatabaseConnector::openConnection() {
    if (!m_db.open()) {
        qDebug() << "[DATABASECONNECTOR]{OPENCONNECTION} Ошибка: соединение не установлено!" << m_db.lastError().text();

        reconnectionCount++;

        if(reconnectionCount <= 4) {
            QTimer::singleShot(2000, this, &DatabaseConnector::openConnection);
        }

        QMessageBox::critical(nullptr, "Ошибка", "Произошел сбой системы.");

        emit signalDatabaseNotConnected();
        return false;
    }

    reconnectionCount = 0;
    qDebug() << "[DATABASECONNECTOR]{OPENCONNECTION} Успешно подключено к базе:" << m_dbName;

    emit signalDatabaseConnected();

    return true;
}

void DatabaseConnector::closeConnection() {
    if (m_db.isOpen()) {
        m_db.close();
    }

    reconnectionCount = 0;
}
