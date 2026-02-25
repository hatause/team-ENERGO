#ifndef AUDITORYFINDER_H
#define AUDITORYFINDER_H

#include <QObject>
#include "../DatabaseManager/Requests/AlgorithmRequests.h"
#include "../DatabaseManager/DatabaseManager.h"

class AuditoryFinder : public QObject
{
    Q_OBJECT
private:
    DatabaseManager* m_database = nullptr;

public:
    explicit AuditoryFinder(DatabaseManager* database, QObject *parent = nullptr);

    AuditoryNote FindAuditory(const QString& targetCorpus, const QTime& startTime, const int& dayOfWeek, const int& longness); // алгоритм поиска аудитории

    void CompleteBooking(const AuditoryNote& note, const QTime& startTime, const int& dayOfWeek, const int& longness); // подтверждаем бронь
    // void BookAuditory(const AuditoryNote& note, const QTime& startTime, const int& longness);

    void ClearTemporaryBookings(); // чистим брони по time status 1
signals:
    void signalAuditoryFound(const AuditoryNote& note);
    void signalCheckAgain();
    void signalAuditoryNotFound(QString msg); // Сигнал, если свободных аудиторий больше нет
};

#endif // AUDITORYFINDER_H
