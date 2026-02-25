// #include "CameraWorker.h"
// #include <QThread>
// #include <QtConcurrent>
// #include <QFileInfo>
// #include <QDebug>
// #include <fstream>

// CameraWorker::CameraWorker(const QString &url_, QString modelConfiguration, QString modelWeights, QObject *parent)
// : QObject(parent), url(url_)
// {
//     vid = new drv::Video(modelConfiguration.toStdString(), parent);
//     // 1) Создаём и открываем поток ровно один раз
//     // capture = std::make_unique<LocalCapture>();
//     if (!capture) {
//         capture = std::make_unique<FFmpegCapture>();
//     }

//     qDebug() << "[CAMERAWORKER]: CameraWorker init";
// }

// CameraWorker::~CameraWorker()
// {

//     running = false;
//     if (capture) {
//         capture->close();
//         capture.reset();
//     }
// }

// void CameraWorker::start()
// {

//     if (running)
//         return;

//     qDebug() << "[CAMERAWORKER]{START}: CameraWorker::run() started";

//     if (!capture->open(url.toStdString())) {
//         qWarning() << "Не удалось открыть поток:" << url;
//         return;
//     }
//     qDebug() << "[CAMERAWORKER]{START}: RTSP подключён";

//     running = true;
//     timer.start(); // Запускаем отсчет времени
//     peopleHistory.clear();

//     // qDebug() << "CameraWorker start";

//     run();
// }

// void CameraWorker::stop()
// {
//     running = false;
//     if (capture) {
//         capture->close();
//         capture.reset();
//     }
//     emit finish();
// }

// void CameraWorker::run()
// {

//     while (running) {
//         // 2) Читаем следующий кадр
//         i++;
//         if (!capture->read(frame) || frame.empty()) {
//             qWarning() << "[CAMERAWORKER]{RUN}:Ошибка чтения кадра, переподключаемся…";
//             capture->close();
//             QThread::sleep(1);

//             if (!capture->open(url.toStdString())) {
//                 qWarning() << "[CAMERAWORKER]{RUN}:Переподключение не удалось";
//             }
//         }
//         if(i % 1 == 0){
//             processVideo();
//         }

//         QThread::msleep(15);
//     }
//     // qDebug() << i ;
//     if (capture) {
//         capture->close();
//     }
// }

// void CameraWorker::processVideo()
// {
//     if (frame.empty()) return;

//     // 1. Получаем текущее количество людей из нейросети
//     int currentCount = vid->processFrame(frame);

//     // 2. Добавляем в массив для накопления
//     peopleHistory.push_back(currentCount);

//     int countToSendMessage = 0; // По умолчанию отправляем 0

//     // 3. Проверяем, прошло ли 5 секунд
//     if (timer.elapsed() >= INTERVAL_MS) {
//         if (!peopleHistory.empty()) {
//             // Вычисляем среднее арифметическое
//             double sum = std::accumulate(peopleHistory.begin(), peopleHistory.end(), 0.0);
//             countToSendMessage = static_cast<int>(sum / peopleHistory.size());
//             qDebug() << "[CAMERAWORKER]{IMAGEPROCESS}:people" << countToSendMessage;
//             flagTimerElapsed = true;
//         }

//         // Сбрасываем накопленные данные и перезапускаем таймер
//         peopleHistory.clear();
//         timer.restart();
//     }

//     // 4. Заполняем пакет (здесь будет 0, если 5 сек еще не прошли, или среднее, если прошли)
//     proccessPacket.modelOut.SetPeople(countToSendMessage);
//     proccessPacket.modelOut.SetPeople(countToSendMessage);
//     proccessPacket.image.SetFrame(frame);

//     cv::Mat temp;
//     cv::cvtColor(proccessPacket.image.Frame().clone(), temp, cv::COLOR_BGR2RGB);
//     QImage qimg = QImage((const uchar*)temp.data, temp.cols, temp.rows, temp.step, QImage::Format_RGB888).copy();

//     proccessPacket.image.SetQFrame(qimg);

//     emit signalProcessPacketReady(proccessPacket);

//     if(flagTimerElapsed){
//         flagTimerElapsed=false;
//         running=false;
//         emit signalPeopleCount();
//     }

//     // qDebug() << "target" << target;

// }
#include "CameraWorker.h"
#include <QThread>
#include <QDebug>
#include <numeric>

CameraWorker::CameraWorker(const QString& url_,
                           QString modelConfiguration,
                           QString modelWeights,
                           QObject* parent)
    : QObject(parent), url(url_)
{
    vid     = new drv::Video(modelConfiguration.toStdString(), parent);
    capture = std::make_unique<FFmpegCapture>();
    qDebug() << "[CAMERAWORKER]: CameraWorker init";
}

CameraWorker::~CameraWorker()
{
    running = false;
    if (capture) {
        capture->close();
        capture.reset();
    }
}

void CameraWorker::start()
{
    if (running) return;

    qDebug() << "[CAMERAWORKER]{START}: CameraWorker::start() called";

    if (!capture) capture = std::make_unique<FFmpegCapture>();

    if (!capture->open(url.toStdString())) {
        qWarning() << "[CAMERAWORKER]{START}: Не удалось открыть поток:" << url;
        return;
    }
    qDebug() << "[CAMERAWORKER]{START}: Поток подключён";

    running = true;
    timer.start();
    peopleHistory.clear();
    i = 0;
    run();
}

void CameraWorker::stop()
{
    running = false;
    if (capture) {
        capture->close();
        capture.reset();
    }
    emit finish();
}

void CameraWorker::run()
{
    while (running) {
        ++i;

        // ─────────────────────────────────────────────────────
        // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: readLatest() сливает весь накопленный
        // буфер FFmpeg и возвращает только САМЫЙ СВЕЖИЙ кадр.
        //
        // Раньше: read() брал первый кадр из буфера → обрабатывался
        //         кадр 2-секундной давности, буфер рос бесконечно.
        //
        // Теперь: readLatest() за один вызов выбрасывает все
        //         "залежавшиеся" кадры и даёт актуальный кадр.
        // ─────────────────────────────────────────────────────
        if (!capture || !capture->readLatest(frame) || frame.empty()) {
            qWarning() << "[CAMERAWORKER]{RUN}: Ошибка чтения, переподключаемся…";
            if (capture) capture->close();
            QThread::sleep(1);
            if (capture && !capture->open(url.toStdString())) {
                qWarning() << "[CAMERAWORKER]{RUN}: Переподключение не удалось";
            }
            continue;
        }

        processVideo();
        // Убираем msleep — readLatest() сам "поглощает" время пока
        // YOLO работал. Если кадр пришёл мгновенно (буфер пуст),
        // небольшая пауза не даст 100% CPU загрузки.
        QThread::msleep(5);
    }

    if (capture) capture->close();
}

void CameraWorker::processVideo()
{
    if (frame.empty()) return;

    int currentCount = vid->processFrame(frame);
    peopleHistory.push_back(currentCount);

    int countToSendMessage = 0;

    // if (timer.elapsed() >= INTERVAL_MS) {
    //     if (!peopleHistory.empty()) {
    //         double sum = std::accumulate(peopleHistory.begin(), peopleHistory.end(), 0.0);
    //         countToSendMessage = static_cast<int>(sum / peopleHistory.size());
    //         qDebug() << "[CAMERAWORKER]{IMAGEPROCESS}: people =" << countToSendMessage;
    //         flagTimerElapsed = true;
    //     }
    //     peopleHistory.clear();
    //     timer.restart();
    // }

    if (timer.elapsed() >= INTERVAL_MS) {
        int maxCount = 0;
        for (int c : peopleHistory) maxCount = std::max(maxCount, c);

        countToSendMessage = maxCount; // а не среднее с int
        qDebug() << "[CAMERAWORKER]{IMAGEPROCESS}: maxPeople =" << countToSendMessage;

        peopleHistory.clear();
        timer.restart();
        flagTimerElapsed = true;
    }

    proccessPacket.modelOut.SetPeople(countToSendMessage);
    proccessPacket.image.SetFrame(frame);

    cv::Mat temp;
    cv::cvtColor(proccessPacket.image.Frame().clone(), temp, cv::COLOR_BGR2RGB);
    QImage qimg = QImage(
                      reinterpret_cast<const uchar*>(temp.data),
                      temp.cols, temp.rows,
                      static_cast<int>(temp.step),
                      QImage::Format_RGB888).copy();

    proccessPacket.image.SetQFrame(qimg);
    emit signalProcessPacketReady(proccessPacket);

    if (flagTimerElapsed) {
        flagTimerElapsed = false;
        running          = false;
        emit signalPeopleCount();
    }
}
