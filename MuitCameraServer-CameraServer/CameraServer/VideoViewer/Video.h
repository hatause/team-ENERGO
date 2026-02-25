#ifndef VIDEO_H
#define VIDEO_H

#include <QObject>
#include <opencv2/opencv.hpp>
#include <opencv2/dnn.hpp>
#include <QDebug>
namespace drv
{
class Video : public QObject
{
    Q_OBJECT

private:
    cv::dnn::Net net;
    std::vector<cv::String> outNames;
    const float confThreshold = 0.65f;
    const float nmsThreshold = 0.45f;
    const int personClassId = 0; // Индекс класса "человек" в COCO

    std::vector<cv::Rect> lastBoxes;
    std::vector<float> lastConfidences;
public:
    explicit Video(QObject *parent = nullptr);
    // modelPath — это путь к твоему .onnx файлу
    Video(const cv::String& modelPath, QObject *parent = nullptr);
    ~Video();
    // Метод возвращает количество людей
    int processFrame(cv::Mat &frame);
};
}

#endif
