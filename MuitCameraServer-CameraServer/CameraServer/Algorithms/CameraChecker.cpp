// #include "CameraChecker.h"
// #include <QMessageBox>

// CameraChecker::CameraChecker(SettingsFile* file, DatabaseManager* _database, QObject *parent)
//     : QObject(parent), database(_database)
// {
//     cameraThread = new QThread(this);
//     // Инициализируем воркер. WeightsFilePath из настроек.
//     debug_url = file->cameraSettings.CameraIndex();
//     debug_url = "rtsp://admin:en8684frtzSTITO@192.168.205.62:554/Streaming/Channels/202/";
//     camera = new CameraWorker(debug_url, file->neuromodelSettings.WeightsFilePath(), "", nullptr);
//     camera->moveToThread(cameraThread);

//     // Связи для работы потока и удаления
//     // connect(cameraThread, &QThread::started, camera, &CameraWorker::start);
//     connect(camera, &CameraWorker::finish, cameraThread, &QThread::quit);
//     connect(cameraThread, &QThread::finished, camera, &QObject::deleteLater);

//     // СИГНАЛЫ: Получаем данные из CameraWorker и пробрасываем их наружу
//     connect(camera, &CameraWorker::signalProcessPacketReady, this, &CameraChecker::slotFrameReady, Qt::QueuedConnection);
//     connect(camera, &CameraWorker::signalPeopleCount, this, &CameraChecker::slotPeopleCount, Qt::QueuedConnection);

//     // Таймер для управления циклом обхода
//     m_stepTimer = new QTimer(this);
//     m_stepTimer->setSingleShot(true);
//     connect(m_stepTimer, &QTimer::timeout, this, &CameraChecker::processNextCamera);

//     cameraThread->start();
// }

// void CameraChecker::startMonitoring() {
//     // Получаем ВСЕ записи о камерах из таблицы camera_cab_journal
//     m_cameraList = database->GetNote<QList<CameraCabJournalNote>>(FilterType::CameraCab);

//     if (m_cameraList.isEmpty()) {
//         qDebug() << "[CAMERACHECKER]{STARTMONITORING} КРИТИЧЕСКАЯ ОШИБКА: Таблица camera_cab_journal пуста в БД!";
//         QMessageBox::critical(nullptr, "Список камер пуст", "Минус вайб");
//         // Пробуем перезапуститься через 5 секунд, вдруг база еще не прогрузилась
//         QTimer::singleShot(5000, this, &CameraChecker::startMonitoring);
//         return;
//     }

//     qDebug() << "[CAMERACHECKER]{STARTMONITORING} Загружено камер для мониторинга:" << m_cameraList.size();
//     m_currentIndex = 0;
//     processNextCamera(); // Запускаем первую камеру
// }

// void CameraChecker::processNextCamera() {
//     if (m_cameraList.isEmpty()) return;

//     if (m_currentIndex >= m_cameraList.size()) {
//         m_currentIndex = 0;
//         // Обновляем список из базы на случай изменений
//         m_cameraList = database->GetNote<QList<CameraCabJournalNote>>(FilterType::CameraCab);
//     }

//     auto& currentNote = m_cameraList[m_currentIndex];

//     // Останавливаем текущий захват, меняем URL и запускаем снова
//     camera->setRunning(false);
//     camera->setUrl(debug_url);
//     camera->start();

//     qDebug() << "[CAMERACHECKER]{PROCESSCAMERA} Checking Camera:" << currentNote.CameraIp() << "for Cab:" << currentNote.IdCab();
// }

// void CameraChecker::slotFrameReady(CameraProcessPacket packet) {
//     m_packet = packet;

//     if (!packet.image.QFrame().isNull()) {
//         emit dataUpdated(packet);
//     }
// }

// void CameraChecker::slotPeopleCount() {
//     // 1. Проверка на пустой список - критично!
//     if (m_cameraList.isEmpty()) {
//         qDebug() << "[CAMERACHECKER]{SLOTPEOPLECOUNT} CameraChecker: Список камер пуст, ждем загрузки...";
//         QMessageBox::critical(nullptr, "Список камер ждем загрузки", "Минус вайб");
//         m_stepTimer->start(2000);
//         return;
//     }

//     // 2. Проверка индекса (защита от выхода за пределы)
//     if (m_currentIndex < 0 || m_currentIndex >= m_cameraList.size()) {
//         m_currentIndex = 0;
//     }

//     int count = m_packet.modelOut.People();
//     auto& currentNote = m_cameraList[m_currentIndex];

//     // Обновляем статус в БД
//     currentNote.SetBusy((count > 0) ? 1 : 0);
//     database->UpdateNote<CameraCabJournalNote>(FilterType::CameraCab, currentNote);

//     qDebug() << "[CAMERACHECKER]{STARTMONITORING} Кабинет" << currentNote.IdCab() << "проверен. Людей:" << count;

//     emit peopleCount();

//     // 3. Безопасный переход к следующей камере
//     m_currentIndex = (m_currentIndex + 1) % m_cameraList.size();

//     // Запускаем таймер для следующей итерации
//     m_stepTimer->start(3000);
// }

// CameraChecker::~CameraChecker() {
//     if (cameraThread) {
//         camera->setRunning(false);
//         cameraThread->quit();
//         if (!cameraThread->wait(3000)) {
//             cameraThread->terminate();
//         }
//     }
// }
#include "CameraChecker.h"
#include <QMessageBox>
#include <QMetaObject>

CameraChecker::CameraChecker(SettingsFile* file, DatabaseManager* _database, QObject* parent)
    : QObject(parent), database(_database)
{
    cameraThread = new QThread(this);

    rtspEnd = file->cameraSettings.EndRtcp();
    rtspStart = file->cameraSettings.StartRtcp();
    debug_url = rtspStart+ "192.168.205.62:554" + rtspEnd;
    camera = new CameraWorker(debug_url, file->neuromodelSettings.WeightsFilePath(), "", nullptr);
    camera->moveToThread(cameraThread);

    // Thread lifecycle
    connect(camera,       &CameraWorker::finish,   cameraThread, &QThread::quit);
    connect(cameraThread, &QThread::finished,       camera,       &QObject::deleteLater);

    // Data signals (queued across thread boundary)
    connect(camera, &CameraWorker::signalProcessPacketReady,
            this,   &CameraChecker::slotFrameReady,  Qt::QueuedConnection);
    connect(camera, &CameraWorker::signalPeopleCount,
            this,   &CameraChecker::slotPeopleCount, Qt::QueuedConnection);

    // Step timer lives in the main thread — it drives processNextCamera()
    m_stepTimer = new QTimer(this);
    m_stepTimer->setSingleShot(true);
    connect(m_stepTimer, &QTimer::timeout, this, &CameraChecker::processNextCamera);

    cameraThread->start();
}

void CameraChecker::startMonitoring()
{
    m_cameraList = database->GetNote<QList<CameraCabJournalNote>>(FilterType::CameraCab);

    if (m_cameraList.isEmpty()) {
        qDebug() << "[CAMERACHECKER]{STARTMONITORING} Таблица camera_cab_journal пуста, повтор через 5 сек";
        QTimer::singleShot(5000, this, &CameraChecker::startMonitoring);
        return;
    }

    qDebug() << "[CAMERACHECKER]{STARTMONITORING} Загружено камер:" << m_cameraList.size();
    m_currentIndex = 0;
    processNextCamera();
}

void CameraChecker::processNextCamera()
{
    if (m_cameraList.isEmpty()) return;

    if (m_currentIndex >= m_cameraList.size()) {
        m_currentIndex = 0;
        // Refresh list from DB on each full cycle
        m_cameraList = database->GetNote<QList<CameraCabJournalNote>>(FilterType::CameraCab);
    }

    auto& currentNote = m_cameraList[m_currentIndex];
    qDebug() << "[CAMERACHECKER]{PROCESSCAMERA} Проверяем камеру:"
             << currentNote.CameraIp() << "кабинет:" << currentNote.IdCab();

    // Stop whatever the worker is doing now
    camera->setRunning(false);

    debug_url = rtspStart + currentNote.CameraIp() + currentNote.PortCamera() + rtspEnd;

    camera->setUrl(debug_url); // TODO: replace with currentNote.CameraIp() once tested

    // FIX #4: camera lives on cameraThread. Calling camera->start() directly
    // from this (main-thread) slot would execute start() on the main thread,
    // blocking the UI and causing data races. Use invokeMethod with
    // QueuedConnection so start() runs on cameraThread.
    QMetaObject::invokeMethod(camera, "start", Qt::QueuedConnection);
}

void CameraChecker::slotFrameReady(CameraProcessPacket packet)
{
    m_packet = packet;
    if (!packet.image.QFrame().isNull()) {
        emit dataUpdated(packet);
    }
}

void CameraChecker::slotPeopleCount()
{
    if (m_cameraList.isEmpty()) {
        qDebug() << "[CAMERACHECKER]{SLOTPEOPLECOUNT} Список камер пуст, ждём 2 сек";
        m_stepTimer->start(2000);
        return;
    }

    if (m_currentIndex < 0 || m_currentIndex >= m_cameraList.size()) {
        m_currentIndex = 0;
    }

    int   count       = m_packet.modelOut.People();
    auto& currentNote = m_cameraList[m_currentIndex];

    currentNote.SetBusy((count > 0) ? 1 : 0);
    database->UpdateNote<CameraCabJournalNote>(FilterType::CameraCab, currentNote);

    qDebug() << "[CAMERACHECKER]{SLOTPEOPLECOUNT} Кабинет" << currentNote.IdCab()
             << "— людей:" << count;

    emit peopleCount();

    m_currentIndex = (m_currentIndex + 1) % m_cameraList.size();
    m_stepTimer->start(3000);
}

CameraChecker::~CameraChecker()
{
    if (cameraThread) {
        camera->setRunning(false);
        cameraThread->quit();
        if (!cameraThread->wait(3000)) {
            cameraThread->terminate();
        }
    }
}
