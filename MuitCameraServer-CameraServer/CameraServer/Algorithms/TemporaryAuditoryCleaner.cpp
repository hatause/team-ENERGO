#include "TemporaryAuditoryCleaner.h"


TemporaryAuditoryCleaner::TemporaryAuditoryCleaner(DatabaseManager* dbManager, QObject *parent)
    : QObject{parent}, m_db(dbManager)
{
    m_cleanupTimer = new QTimer(this);
    connect(m_cleanupTimer, &QTimer::timeout, this, &TemporaryAuditoryCleaner::onCleanupTick);

    // По умолчанию запускаем проверку раз в 5 минут
    m_cleanupTimer->start(5 * 60 * 1000);
}

void TemporaryAuditoryCleaner::setCleanupInterval(int msec)
{
    m_cleanupTimer->start(msec);
}

void TemporaryAuditoryCleaner::cleanNow()
{
    onCleanupTick();
}

void TemporaryAuditoryCleaner::onCleanupTick()
{
    if (!m_db) return;

    // Получаем текущие данные для фильтрации
    QTime currentTime = QTime::currentTime();
    int currentDay = QDate::currentDate().dayOfWeek();

    /*
       SQL запрос удаляет записи, где:
       1. timeStatus равен 1 или 2
       2. День недели совпадает с текущим (или меньше, если это старые записи)
       3. Время окончания (endTime) уже прошло
    */
    QString queryStr = QString(
                           "DELETE FROM auditory_journal "
                           "WHERE timeStatus IN (1, 2) "
                           "AND dayOfWeek = %1 "
                           "AND endTime < '%2'"
                           ).arg(currentDay).arg(currentTime.toString("HH:mm:ss"));

    // Если нужно чистить записи за прошлые дни недели:
    /*
    QString queryStr = QString(
        "DELETE FROM auditory_journal "
        "WHERE timeStatus IN (1, 2) "
        "AND (dayOfWeek < %1 OR (dayOfWeek = %1 AND endTime < '%2'))"
    ).arg(currentDay).arg(currentTime.toString("HH:mm:ss"));
    */

    qDebug() << "[CLEANER]{ONCLEANUPTICK} Running scheduled cleanup...";
    m_db->Execute(queryStr);
}
