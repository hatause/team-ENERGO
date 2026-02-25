#ifndef ALGORITHMMANAGER_H
#define ALGORITHMMANAGER_H
#include <QObject>
#include <QDate>
#include "AuditoryFinder.h"
#include "CameraChecker.h"
#include "TemporaryAuditoryCleaner.h"
#include "../DatabaseManager/DatabaseManager.h"
#include "../Settings/SettingsFile.h"

class AlgorithmManager : public QObject
{
    Q_OBJECT
private:
    AuditoryFinder* finder = nullptr;
    CameraChecker* checker = nullptr;
    TemporaryAuditoryCleaner* cleaner = nullptr;
    DatabaseManager* database = nullptr;

    DatabaseManager* cameraDatabase = nullptr;
    QThread* checkerThread = nullptr;
    bool m_isChecking = false;

public:
    explicit AlgorithmManager(SettingsFile* file, QObject *parent = nullptr);
    ~AlgorithmManager();

    AuditoryFinder* getFinderInstance() { return finder; }
    CameraChecker* getCheckerInstance() { return checker; }

public slots:
    // Главная точка входа для запросов извне (например, от Java-прокси)
    void slotGetFindRequest(const QString& targetCorpus, const QTime& startTime, const int& longness);

private:
    void findNextAvailableRoom(const QString& targetCorpus, const QTime& startTime, const int& longness);
};
#endif // ALGORITHMMANAGER_H
