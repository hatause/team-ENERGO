// #ifndef FFMPEG_CAPTURE_H
// #define FFMPEG_CAPTURE_H

// extern "C" {
// #include <libavformat/avformat.h>
// #include <libswscale/swscale.h>
// #include <libavcodec/avcodec.h>
// }

// #include <opencv2/opencv.hpp>
// #include <string>

// class FFmpegCapture {
// public:
//     FFmpegCapture();
//     ~FFmpegCapture();

//     bool open(const std::string& url);
//     void close();
//     bool read(cv::Mat& output);
//     bool isBroken() const {return broken;}

// private:
//     AVFormatContext* fmtCtx = nullptr;
//     AVCodecContext* codecCtx = nullptr;
//     AVFrame* frame = nullptr;
//     AVPacket* packet = nullptr;
//     SwsContext* swsCtx = nullptr;

//     bool broken = true;
//     int videoStreamIndex = -1;
//     int width = 0;
//     int height = 0;
// };

// #endif // FFMPEG_CAPTURE_H
#ifndef FFMPEGCAPTURE_H
#define FFMPEGCAPTURE_H

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libswscale/swscale.h>
}

#include <opencv2/opencv.hpp>
#include <string>

class FFmpegCapture
{
public:
    FFmpegCapture();
    ~FFmpegCapture();

    bool open(const std::string& url);
    void close();

    // Блокирующее чтение: ждёт ближайший декодированный кадр
    bool read(cv::Mat& output);

    // Realtime-чтение: берёт кадр и "сливает" хвост, оставляя самый свежий
    bool readLatest(cv::Mat& output);

    bool isBroken() const { return broken; }

private:
    bool convertFrame(cv::Mat& output);
    bool decodeCurrentPacket(cv::Mat& output, bool& gotFrame);

    static bool isAgain(int err);

private:
    AVFormatContext* fmtCtx = nullptr;
    AVCodecContext*  codecCtx = nullptr;
    AVFrame*         frame = nullptr;
    AVPacket*        packet = nullptr;
    SwsContext*      swsCtx = nullptr;

    bool broken = true;
    int videoStreamIndex = -1;

    // Для логики обновления swsCtx
    int width = 0;
    int height = 0;
    AVPixelFormat lastPixFmt = AV_PIX_FMT_NONE;
    int lastSrcRange = -1;
    int lastColorSpace = -1;
};

#endif // FFMPEGCAPTURE_H
