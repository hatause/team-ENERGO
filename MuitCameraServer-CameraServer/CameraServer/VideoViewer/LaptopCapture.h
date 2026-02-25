#ifndef LAPTOPCAPTURE_H
#define LAPTOPCAPTURE_H

#include <QObject>
#include <QDebug>
#include <opencv2/opencv.hpp>
#include <string>

class LocalCapture {
public:
    LocalCapture();
    ~LocalCapture();

    // url здесь может быть индексом камеры "0" или путем к файлу
    bool open(const std::string& url);
    void close();
    bool read(cv::Mat& output);
    bool isBroken() const { return broken; }

private:
    cv::VideoCapture cap;
    bool broken = true;
};

#endif // LAPTOPCAPTURE_H
