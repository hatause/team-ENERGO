#include "Video.h"

drv::Video::Video(QObject *parent) : QObject(parent) {}

drv::Video::Video(const cv::String& modelPath, QObject *parent) : QObject(parent)
{
    // Загружаем ONNX модель
    net = cv::dnn::readNetFromONNX(modelPath);

    // Проверяем доступность CUDA
    int cudaDeviceCount = 0;
    bool cudaAvailable = false;

    try {
        cudaDeviceCount = cv::cuda::getCudaEnabledDeviceCount();
        cudaAvailable = (cudaDeviceCount > 0);
    } catch (const cv::Exception& e) {
        qWarning() << "CUDA check failed:" << QString::fromStdString(e.msg);
        cudaAvailable = false;
    }

    if (cudaAvailable) {
        // CUDA доступна! Пытаемся использовать GPU
        try {
            qDebug() << "✓ Найдено GPU устройств:" << cudaDeviceCount;
            qDebug() << "✓ Пытаемся использовать GPU (CUDA)...";

            // Устанавливаем CUDA backend
            net.setPreferableBackend(cv::dnn::DNN_BACKEND_CUDA);
            net.setPreferableTarget(cv::dnn::DNN_TARGET_CUDA);

            qDebug() << "✓ GPU (CUDA) активирована успешно!";

            // Информация о GPU
            try {
                qDebug() << "GPU info:";
                cv::cuda::printCudaDeviceInfo(0);
            } catch (...) {
                qDebug() << "(GPU info unavailable)";
            }
        } catch (const cv::Exception& e) {
            // CUDA не работает, даже если доступна
            qWarning() << "❌ CUDA не работает: " << QString::fromStdString(e.msg);
            qWarning() << "⚠️ Переходим на CPU (медленнее)";

            net.setPreferableBackend(cv::dnn::DNN_BACKEND_OPENCV);
            net.setPreferableTarget(cv::dnn::DNN_TARGET_CPU);
        }
    } else {
        // CUDA НЕ доступна
        qWarning() << "⚠️ CUDA НЕ ДОСТУПНА!";
        qWarning() << "Возможные причины:";
        qWarning() << "  1. OpenCV скомпилирована БЕЗ CUDA поддержки";
        qWarning() << "  2. NVIDIA GPU не установлена";
        qWarning() << "  3. CUDA Toolkit не установлена";
        qWarning() << "⚠️ Используем CPU (медленнее)";

        // Fallback на CPU
        net.setPreferableBackend(cv::dnn::DNN_BACKEND_OPENCV);
        net.setPreferableTarget(cv::dnn::DNN_TARGET_CPU);

        qDebug() << "CPU backend активирована";
    }
}

drv::Video::~Video(){
    lastBoxes.clear();
    lastConfidences.clear();
}

int drv::Video::processFrame(cv::Mat &frame)
{
    if (frame.empty()) {
        lastBoxes.clear();
        lastConfidences.clear();
        return 0;
    }

    // 1. Подготовка (Blob). YOLOv11 требует 640x640
    cv::Mat blob;
    cv::dnn::blobFromImage(frame, blob, 1/255.0, cv::Size(640, 640), cv::Scalar(), true, false);
    net.setInput(blob);

    // 2. Прогон нейросети
    std::vector<cv::Mat> outs;
    net.forward(outs, net.getUnconnectedOutLayersNames());

    // 3. Обработка выхода [1 x 84 x 8400]
    // Транспонируем, чтобы получить 8400 строк и 84 колонки
    cv::Mat output = outs[0];
    if (output.dims == 3) {
        output = output.reshape(1, output.size[1]);
        cv::transpose(output, output);
    }

    std::vector<int> classIds;
    std::vector<float> confidences;
    std::vector<cv::Rect> boxes;

    float x_factor = frame.cols / 640.0;
    float y_factor = frame.rows / 640.0;

    float* data = (float*)output.data;
    for (int i = 0; i < output.rows; ++i) {
        // У YOLOv11 первые 4 значения — это x, y, w, h. Далее — вероятности классов.
        cv::Mat scores = output.row(i).colRange(4, output.cols);
        cv::Point classIdPoint;
        double maxLabelConf;
        cv::minMaxLoc(scores, 0, &maxLabelConf, 0, &classIdPoint);

        if (maxLabelConf > confThreshold && classIdPoint.x == personClassId) {
            float cx = data[0];
            float cy = data[1];
            float w = data[2];
            float h = data[3];

            int left = static_cast<int>((cx - 0.5 * w) * x_factor);
            int top = static_cast<int>((cy - 0.5 * h) * y_factor);
            int width = static_cast<int>(w * x_factor);
            int height = static_cast<int>(h * y_factor);

            confidences.push_back((float)maxLabelConf);
            classIds.push_back(classIdPoint.x);
            cv::rectangle(frame, cv::Rect(left, top, width, height), cv::Scalar(0, 255, 0), 2);
            boxes.push_back(cv::Rect(left, top, width, height));
        }
        data += output.cols;
    }

    // 4. Очистка наложений (NMS)
    std::vector<int> indices;
    cv::dnn::NMSBoxes(boxes, confidences, confThreshold, nmsThreshold, indices);

    // ═══ НОВОЕ: СОХРАНЯЕМ БОКСЫ ПОСЛЕ NMS ═══
    // Очищаем старые боксы
    lastBoxes.clear();
    lastConfidences.clear();

    // Сохраняем только те боксы, которые прошли NMS
    for (int idx : indices) {
        lastBoxes.push_back(boxes[idx]);
        lastConfidences.push_back(confidences[idx]);
    }
    // ════════════════════════════════════════════

    return static_cast<int>(indices.size());
}
