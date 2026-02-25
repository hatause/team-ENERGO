#include "AlgorithmManager.h"
AlgorithmManager::AlgorithmManager(SettingsFile* file, QObject *parent)
    : QObject{parent}
{
    database = new DatabaseManager(file, this);
    database->openConnection();
    finder = new AuditoryFinder(database, this);
    // checker = new CameraChecker(file, database, this); // Checker сам запустит мониторинг
    cleaner = new TemporaryAuditoryCleaner(database, this);

    // checker->startMonitoring();

    checkerThread = new QThread(this);
    cameraDatabase = new DatabaseManager(file, nullptr);
    checker = new CameraChecker(file, cameraDatabase, nullptr);

    cameraDatabase->moveToThread(checkerThread);
    checker->moveToThread(checkerThread);
    // Корректное удаление объектов потока
    connect(checkerThread, &QThread::finished, checker, &QObject::deleteLater);
    connect(checkerThread, &QThread::finished, cameraDatabase, &QObject::deleteLater);
    connect(checkerThread, &QThread::started,
            cameraDatabase, &DatabaseConnector::openConnection,
            Qt::QueuedConnection);


    // Запуск мониторинга после старта потока
    connect(checkerThread, &QThread::started,
            checker, &CameraChecker::startMonitoring,
            Qt::QueuedConnection);
    checkerThread->start();
    // ВАЖНО: Мы больше не коннектим checker->peopleCount к onCameraChecked!
}

void AlgorithmManager::slotGetFindRequest(const QString& targetCorpus, const QTime& startTime, const int& longness)
{
    if (m_isChecking || !startTime.isValid()) {
        qWarning() << "[ALGORITHMMANAGER] Rejecting request: Invalid time or busy.";
        return;
    }
    m_isChecking = true;



    qDebug() << "[ALGORITHMMANAGER]{SLOTFINDREQUEST} Новый запрос на поиск: Корпус" << targetCorpus << "Время" << startTime.toString();
    findNextAvailableRoom(targetCorpus, startTime, longness);
}

void AlgorithmManager::findNextAvailableRoom(const QString& targetCorpus, const QTime& startTime, const int& longness)
{
    int dayOfWeek = QDate::currentDate().dayOfWeek();

    // Теперь Finder делает сложный SQL-запрос с JOIN к таблице камер (где мы добавили is_busy)
    // Результат приходит МГНОВЕННО
    AuditoryNote foundNote = finder->FindAuditory(targetCorpus, startTime, 1, longness);

    if (foundNote.Id() != 0) {
        qDebug() << "[ALGORITHMMANAGER]{FINDNEXTAUD} Аудитория найдена:" << foundNote.AudNumber();

        // Сразу подтверждаем бронь (статус 2 -> 1)
        finder->CompleteBooking(foundNote, startTime, 1, longness);

        // Отправляем ответ наверх (в прокси и далее пользователю)
        emit finder->signalAuditoryFound(foundNote);
    }
    else {
        qDebug() << "[ALGORITHMMANAGER]{FINDNEXTAUD} Свободных аудиторий не найдено (с учетом расписания и камер)";
        emit finder->signalAuditoryFound(AuditoryNote()); // Пустая нота
        emit finder->signalAuditoryNotFound("Кабинет не найден");
    }

    m_isChecking = false;
}

AlgorithmManager::~AlgorithmManager()
{
    delete cleaner;
    if (checkerThread) {
        checkerThread->quit();
        if (!checkerThread->wait(3000)) {
            checkerThread->terminate();
            checkerThread->wait(1000);
        }
    }

    delete finder;
    delete database;
}
