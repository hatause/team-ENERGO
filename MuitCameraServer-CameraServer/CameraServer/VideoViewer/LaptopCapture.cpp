#include "LaptopCapture.h"
#include <QMessageBox>

LocalCapture::LocalCapture() {
    broken = true;
}

LocalCapture::~LocalCapture() {
    close();
}

bool LocalCapture::open(const std::string& url) {
    close();

    try {
        // Если в url передано число (например "0"), открываем камеру по индексу
        // Если строка (путь), открываем как файл
        if (!url.empty() && std::all_of(url.begin(), url.end(), ::isdigit)) {
            int deviceID = std::stoi(url);
            cap.open(deviceID, cv::CAP_ANY);
        } else {
            cap.open(url);
        }

        if (!cap.isOpened()) {
            qWarning() << "[LOCALCAPTURE]{OPEN} Не удалось открыть локальную камеру:" << QString::fromStdString(url);
            QMessageBox::critical(nullptr, "Ошибка камеры", "Минус Вайб");
            broken = true;
            return false;
        }

        // Настройка для веб-камер (снижаем задержку)
        cap.set(cv::CAP_PROP_BUFFERSIZE, 1);

        broken = false;
        qDebug() << "[LOCALCAPTURE]{OPEN}Локальная камера открыта успешно";
        return true;

    } catch (...) {
        broken = true;
        return false;
    }
}

void LocalCapture::close() {
    if (cap.isOpened()) {
        cap.release();
    }
    broken = true;
}

bool LocalCapture::read(cv::Mat& output) {
    if (broken || !cap.isOpened()) {
        return false;
    }

    // Захватываем кадр напрямую через OpenCV
    bool success = cap.read(output);

    if (!success || output.empty()) {
        broken = true;
        qDebug() << "[LOCALCAPTURE]{READ} Потерян сигнал с локальной камеры";
        return false;
    }

    return true;
}
