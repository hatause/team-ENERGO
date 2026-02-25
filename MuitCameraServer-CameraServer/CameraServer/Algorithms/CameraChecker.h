#ifndef CAMERACHECKER_H
#define CAMERACHECKER_H

#include <QObject>
#include <QTimer>
#include <QThread>
#include <QList>
#include "../Settings/SettingsFile.h"
#include "../VideoViewer/CameraWorker.h"
#include "../VideoViewer/Camera_dictionary.h"
#include "../DatabaseManager/DatabaseManager.h"
#include "../DatabaseManager/Requests/AlgorithmRequests.h"

class CameraChecker : public QObject {
    Q_OBJECT
public:
    explicit CameraChecker(SettingsFile* file, DatabaseManager* _database, QObject *parent = nullptr);
    ~CameraChecker();

    CameraWorker* getWorker() { return camera; }

    // Метод для запуска фонового цикла
    void startMonitoring();

signals:
    void dataUpdated(CameraProcessPacket packet); // Для отрисовки видео в QML
    void peopleCount();                           // Общий сигнал уведомления

private slots:
    void processNextCamera();           // Переключение на следующую камеру
    void slotFrameReady(CameraProcessPacket packet);
    void slotPeopleCount();             // Обработка сигнала от CameraWorker

private:
    CameraWorker* camera = nullptr;
    QThread* cameraThread = nullptr;
    DatabaseManager* database = nullptr;
    QString debug_url="0";
    QString rtspStart="";
    QString rtspEnd="";

    CameraProcessPacket m_packet;       // Хранит текущий кадр и данные нейронки
    QList<CameraCabJournalNote> m_cameraList;
    int m_currentIndex = 0;
    QTimer* m_stepTimer = nullptr;      // Таймер паузы между камерами
};
#endif // CAMERACHECKER_H
