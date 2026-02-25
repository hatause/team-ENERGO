#ifndef TEMPORARYAUDITORYCLEANER_H
#define TEMPORARYAUDITORYCLEANER_H
#include <QObject>
#include <QTimer>
#include <QTime>
#include <QDate>
#include "../DatabaseManager/DatabaseManager.h"

class TemporaryAuditoryCleaner : public QObject
{
    Q_OBJECT
public:
    explicit TemporaryAuditoryCleaner(DatabaseManager* dbManager, QObject *parent = nullptr);

    // Метод для ручного запуска очистки
    void cleanNow();

    // Настройка интервала автоматической очистки (в миллисекундах)
    void setCleanupInterval(int msec);

private:
    DatabaseManager* m_db;
    QTimer* m_cleanupTimer;

private slots:
    void onCleanupTick();
};

#endif // TEMPORARYAUDITORYCLEANER_H
