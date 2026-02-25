// #ifndef CAMERAWORKER_H
// #define CAMERAWORKER_H

// #include <QObject>
// #include <QMutex>
// #include <atomic>
// #include <QMetaType>
// #include <opencv2/opencv.hpp>
// #include <opencv2/dnn.hpp>
// #include "FFmpegCapture.h"
// #include "LaptopCapture.h"
// #include "Video.h"
// #include "Camera_dictionary.h"
// // Q_DECLARE_METATYPE(std::vector<QByteArray>)
// class CameraWorker : public QObject
// {
//     Q_OBJECT
// private:
//     // std::unique_ptr<LocalCapture> capture;
//     std::unique_ptr<FFmpegCapture> capture;
//     drv::Video *vid;
//     bool running = false;
//     QString url;
//     int i = 0;

//     cv::Mat frame;         // Публичный кадр

//     CameraProcessPacket proccessPacket;

//     QElapsedTimer timer;             // Таймер для отсечки 5 секунд
//     std::vector<int> peopleHistory;  // Массив для хранения количества людей
//     const int INTERVAL_MS = 2000;    // Константа интервала (5 сек)
//     bool flagTimerElapsed = false;
//     void processVideo();
// public:
//     explicit CameraWorker(const QString &url_, QString modelConfiguration, QString modelWeights="", QObject *parent = nullptr);
//     ~CameraWorker();

//     void setRunning(bool running_){running=running_;}
//     void setUrl(const QString url_){url=url_;}
// public slots:
//     void start();
//     void run();
//     void stop();
// signals:
//     void finish();
//     void signalProcessPacketReady(CameraProcessPacket packet);
//     void signalPeopleCount();
// };

// #endif // CAMERAWORKER_H
#ifndef CAMERAWORKER_H
#define CAMERAWORKER_H

#include <QObject>
#include <QMutex>
#include <atomic>
#include <QMetaType>
#include <opencv2/opencv.hpp>
#include <opencv2/dnn.hpp>
#include "FFmpegCapture.h"
#include "LaptopCapture.h"
#include "Video.h"
#include "Camera_dictionary.h"

class CameraWorker : public QObject
{
    Q_OBJECT

private:
    std::unique_ptr<FFmpegCapture> capture;
    drv::Video* vid;
    std::atomic<bool> running { false };
    QString url;
    int i = 0;

    cv::Mat frame;
    CameraProcessPacket proccessPacket;

    QElapsedTimer       timer;
    std::vector<int>    peopleHistory;
    const int           INTERVAL_MS = 6000;
    bool                flagTimerElapsed = false;

    void processVideo();

public:
    explicit CameraWorker(const QString& url_,
                          QString modelConfiguration,
                          QString modelWeights = "",
                          QObject* parent      = nullptr);
    ~CameraWorker();

    void setRunning(bool running_) { running = running_; }
    void setUrl(const QString& url_) { url = url_; }

public slots:
    // FIX #4: start() is only ever called via Qt::QueuedConnection from
    // CameraChecker so it executes on cameraThread, not the main thread.
    void start();
    void run();
    void stop();

signals:
    void finish();
    void signalProcessPacketReady(CameraProcessPacket packet);
    void signalPeopleCount();
};

#endif // CAMERAWORKER_H
