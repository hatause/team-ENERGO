#ifndef CAMERA_DICTIONARY_H
#define CAMERA_DICTIONARY_H

#include <opencv2/opencv.hpp>
#include <QImage>

struct CameraImage
{
private:
    cv::Mat frame;
    QImage qFrame;
public:
    cv::Mat Frame() const {return frame; }
    QImage QFrame() const { return qFrame; }

    void SetFrame(cv::Mat mat) {frame=mat;}
    void SetQFrame( QImage qimg) {qFrame = qimg; }
};


struct ModelOutput
{
private:
    int count_people=0;
public:
    int People(){return count_people;}

    void SetPeople(int p) {count_people=p;}
};

struct CameraProcessPacket
{
public:
    CameraImage image;
    ModelOutput modelOut;

};


#endif // CAMERA_DICTIONARY_H
