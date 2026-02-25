// #include "FFmpegCapture.h"
// #include <QDebug>
// #include <QThread>

// FFmpegCapture::FFmpegCapture() {
//     avformat_network_init();
//     //qDebug() << "FFmpegCapture";
// }

// FFmpegCapture::~FFmpegCapture() {
//     close();
// }

// bool FFmpegCapture::open(const std::string& url) {
//     close();
//     //qDebug() << "FFmpegCapture open.";

//     AVDictionary* opts = nullptr;
//     av_dict_set(&opts, "timeout", "1000000", 0);
//     av_dict_set(&opts, "stimeout", "1000000", 0);       // 3 сек таймаут
//     av_dict_set(&opts, "rtsp_transport", "tcp", 0);
//     av_dict_set(&opts, "fflags", "nobuffer", 0);
//     av_dict_set(&opts, "flags", "low_delay", 0);
//     av_dict_set(&opts, "framedrop", "1", 0);

//     if (avformat_open_input(&fmtCtx, url.c_str(), nullptr, &opts) < 0) {
//         qWarning() << "Не удалось открыть поток по RTSP (timeout)";
//         av_dict_free(&opts);
//         return false;
//     }

//     av_dict_free(&opts);

//     if (avformat_find_stream_info(fmtCtx, nullptr) < 0)
//         return false;

//     videoStreamIndex = -1;
//     for (unsigned i = 0; i < fmtCtx->nb_streams; ++i) {
//         if (fmtCtx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
//             videoStreamIndex = i;
//             break;
//         }
//     }

//     if (videoStreamIndex == -1)
//         return false;

//     AVCodecParameters* codecPar = fmtCtx->streams[videoStreamIndex]->codecpar;
//     const AVCodec *decoder = avcodec_find_decoder(codecPar->codec_id);
//     if (!decoder) return false;

//     codecCtx = avcodec_alloc_context3(decoder);
//     avcodec_parameters_to_context(codecCtx, codecPar);
//     if (avcodec_open2(codecCtx, decoder, nullptr) < 0)
//         return false;

//     frame = av_frame_alloc();
//     packet = av_packet_alloc();
//     width = codecCtx->width;
//     height = codecCtx->height;

//     swsCtx = sws_getContext(width, height, codecCtx->pix_fmt,
//                             width, height, AV_PIX_FMT_BGR24,
//                             SWS_FAST_BILINEAR, nullptr, nullptr, nullptr);

//     broken = false;
//     return true;
// }


// void FFmpegCapture::close() {
//     //qDebug() << "FFmpegCapture close.";
//     if (swsCtx) sws_freeContext(swsCtx), swsCtx = nullptr;
//     if (frame) av_frame_free(&frame), frame = nullptr;
//     if (packet) av_packet_free(&packet), packet = nullptr;
//     if (codecCtx) avcodec_free_context(&codecCtx), codecCtx = nullptr;
//     if (fmtCtx) avformat_close_input(&fmtCtx), fmtCtx = nullptr;
// }

// bool FFmpegCapture::read(cv::Mat& output) {
//     //qDebug() << "FFmpegCapture read.";
//     int ret = 0;
//     int attempts = 0;
//     const int maxAttempts = 100;

//     do {
//         ret = av_read_frame(fmtCtx, packet);
//         if (ret == AVERROR_EOF || ret < 0) {
//             qDebug() << "broken EOF";
//             broken = true;
//             return false;
//         }
//         QThread::msleep(1);
//         attempts++;
//     } while (ret < 0 && attempts < maxAttempts);

//     if (ret < 0) {
//         broken = true;
//         qDebug() << "broken 0";
//         return false;
//     }

//     if (packet->stream_index == videoStreamIndex) {
//         if (avcodec_send_packet(codecCtx, packet) == 0 &&
//             avcodec_receive_frame(codecCtx, frame) == 0) {

//             cv::Mat rgb(height, width, CV_8UC3);
//             uint8_t* dst[] = { rgb.data };
//             int linesize[] = { static_cast<int>(rgb.step) };
//             sws_scale(swsCtx, frame->data, frame->linesize, 0, height, dst, linesize);

//             output = rgb.clone();
//             av_packet_unref(packet);
//             return true;
//         }
//     }

//     broken = true;
//     qDebug() << "broken true";
//     av_packet_unref(packet);
//     return false;
// }
#include "FFmpegCapture.h"

#include <QDebug>
#include <QThread>
#include <QElapsedTimer>

namespace {
constexpr int kOpenTimeoutUs   = 3000000; // 3 сек
constexpr int kReadMaxPackets  = 1000;    // лимит пакетов в read()
constexpr int kDrainMaxPackets = 12;      // лимит пакетов для "слива хвоста"
constexpr int kDrainBudgetMs   = 6;       // бюджет времени на drain (мс)
}

bool FFmpegCapture::isAgain(int err)
{
    return err == AVERROR(EAGAIN);
}

FFmpegCapture::FFmpegCapture()
{
    avformat_network_init();

    // Чтобы не душил лог (можешь временно AV_LOG_WARNING если нужно отлаживать ffmpeg)
    av_log_set_level(AV_LOG_ERROR);
}

FFmpegCapture::~FFmpegCapture()
{
    close();
}

bool FFmpegCapture::open(const std::string& url)
{
    close();

    AVDictionary* opts = nullptr;

    // Стабильные настройки RTSP (без агрессивных low-latency флагов для HEVC)
    av_dict_set(&opts, "rtsp_transport", "tcp", 0);
    av_dict_set(&opts, "timeout",  "3000000", 0); // microseconds
    av_dict_set(&opts, "stimeout", "3000000", 0); // для совместимости со старыми сборками

    // Специально НЕ включаем (ломают HEVC на части камер):
    // av_dict_set(&opts, "fflags", "nobuffer", 0);
    // av_dict_set(&opts, "flags", "low_delay", 0);
    // av_dict_set(&opts, "framedrop", "1", 0);

    int ret = avformat_open_input(&fmtCtx, url.c_str(), nullptr, &opts);
    av_dict_free(&opts);

    if (ret < 0 || !fmtCtx) {
        qWarning() << "[FFMPEG] Не удалось открыть поток:"
                   << QString::fromStdString(url)
                   << "ret =" << ret;
        broken = true;
        return false;
    }

    ret = avformat_find_stream_info(fmtCtx, nullptr);
    if (ret < 0) {
        qWarning() << "[FFMPEG] avformat_find_stream_info failed, ret =" << ret;
        close();
        return false;
    }

    videoStreamIndex = av_find_best_stream(fmtCtx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    if (videoStreamIndex < 0) {
        qWarning() << "[FFMPEG] Видеопоток не найден";
        close();
        return false;
    }

    AVCodecParameters* codecPar = fmtCtx->streams[videoStreamIndex]->codecpar;
    if (!codecPar) {
        qWarning() << "[FFMPEG] codecpar == nullptr";
        close();
        return false;
    }

    const AVCodec* decoder = avcodec_find_decoder(codecPar->codec_id);
    if (!decoder) {
        qWarning() << "[FFMPEG] Декодер не найден для codec_id =" << codecPar->codec_id;
        close();
        return false;
    }

    codecCtx = avcodec_alloc_context3(decoder);
    if (!codecCtx) {
        qWarning() << "[FFMPEG] avcodec_alloc_context3 failed";
        close();
        return false;
    }

    ret = avcodec_parameters_to_context(codecCtx, codecPar);
    if (ret < 0) {
        qWarning() << "[FFMPEG] avcodec_parameters_to_context failed, ret =" << ret;
        close();
        return false;
    }

    // Для HEVC стабильнее не резать NONREF кадры на старте
    codecCtx->skip_frame = AVDISCARD_DEFAULT;

    // Авто-подбор потоков декодера
    codecCtx->thread_count = 0;

    ret = avcodec_open2(codecCtx, decoder, nullptr);
    if (ret < 0) {
        qWarning() << "[FFMPEG] avcodec_open2 failed, ret =" << ret;
        close();
        return false;
    }

    frame = av_frame_alloc();
    packet = av_packet_alloc();
    if (!frame || !packet) {
        qWarning() << "[FFMPEG] Не удалось выделить frame/packet";
        close();
        return false;
    }

    width = codecCtx->width;
    height = codecCtx->height;
    lastPixFmt = AV_PIX_FMT_NONE;
    lastSrcRange = -1;
    lastColorSpace = -1;

    if (swsCtx) {
        sws_freeContext(swsCtx);
        swsCtx = nullptr;
    }

    broken = false;

    qDebug() << "[FFMPEG] Открыт поток. codec=" << (decoder->name ? decoder->name : "unknown")
             << "size=" << width << "x" << height
             << "streamIndex=" << videoStreamIndex;

    return true;
}

void FFmpegCapture::close()
{
    if (swsCtx) {
        sws_freeContext(swsCtx);
        swsCtx = nullptr;
    }

    if (frame) {
        av_frame_free(&frame);
        frame = nullptr;
    }

    if (packet) {
        av_packet_free(&packet);
        packet = nullptr;
    }

    if (codecCtx) {
        avcodec_free_context(&codecCtx);
        codecCtx = nullptr;
    }

    if (fmtCtx) {
        avformat_close_input(&fmtCtx);
        fmtCtx = nullptr;
    }

    broken = true;
    videoStreamIndex = -1;
    width = 0;
    height = 0;
    lastPixFmt = AV_PIX_FMT_NONE;
    lastSrcRange = -1;
    lastColorSpace = -1;
}

bool FFmpegCapture::convertFrame(cv::Mat& output)
{
    if (!frame) {
        qWarning() << "[FFMPEG] convertFrame: frame == nullptr";
        broken = true;
        return false;
    }

    const int fw = frame->width;
    const int fh = frame->height;

    if (fw <= 0 || fh <= 0) {
        qWarning() << "[FFMPEG] convertFrame: invalid frame size" << fw << "x" << fh;
        return false;
    }

    AVPixelFormat rawFmt = static_cast<AVPixelFormat>(frame->format);
    AVPixelFormat srcFmt = rawFmt;

    // Диапазон цвета (full vs limited)
    int srcRange = (frame->color_range == AVCOL_RANGE_JPEG) ? 1 : 0;

    // Убираем deprecated yuvj* и явно фиксируем full-range
    switch (rawFmt) {
    case AV_PIX_FMT_YUVJ420P:
        srcFmt = AV_PIX_FMT_YUV420P;
        srcRange = 1;
        break;
    case AV_PIX_FMT_YUVJ422P:
        srcFmt = AV_PIX_FMT_YUV422P;
        srcRange = 1;
        break;
    case AV_PIX_FMT_YUVJ444P:
        srcFmt = AV_PIX_FMT_YUV444P;
        srcRange = 1;
        break;
#ifdef AV_PIX_FMT_YUVJ440P
    case AV_PIX_FMT_YUVJ440P:
        srcFmt = AV_PIX_FMT_YUV440P;
        srcRange = 1;
        break;
#endif
    default:
        break;
    }

    SwsContext* newCtx = sws_getCachedContext(
        swsCtx,
        fw, fh, srcFmt,
        fw, fh, AV_PIX_FMT_BGR24,
        SWS_FAST_BILINEAR,
        nullptr, nullptr, nullptr
        );

    if (!newCtx) {
        qWarning() << "[FFMPEG] sws_getCachedContext failed. fmt =" << static_cast<int>(srcFmt);
        broken = true;
        return false;
    }

    swsCtx = newCtx;

    const int csNow = static_cast<int>(frame->colorspace);

    const bool changed =
        (fw != width) ||
        (fh != height) ||
        (srcFmt != lastPixFmt) ||
        (srcRange != lastSrcRange) ||
        (csNow != lastColorSpace);

    if (changed) {
        // Выбор коэффициентов цветового пространства
        int cs = SWS_CS_DEFAULT;
        switch (frame->colorspace) {
        case AVCOL_SPC_BT709:
            cs = SWS_CS_ITU709;
            break;
        case AVCOL_SPC_SMPTE170M:
        case AVCOL_SPC_BT470BG:
            cs = SWS_CS_SMPTE170M;
            break;
        default:
            cs = SWS_CS_DEFAULT;
            break;
        }

        const int* invTable = sws_getCoefficients(cs);
        const int* fwdTable = sws_getCoefficients(cs);

        // RGB/BGR на выходе считаем full-range
        const int dstRange = 1;

        int retCs = sws_setColorspaceDetails(
            swsCtx,
            invTable, srcRange,
            fwdTable, dstRange,
            0,       // brightness
            1 << 16, // contrast
            1 << 16  // saturation
            );

        if (retCs < 0) {
            qWarning() << "[FFMPEG] sws_setColorspaceDetails failed, ret =" << retCs;
            // не fatal
        }

        width = fw;
        height = fh;
        lastPixFmt = srcFmt;
        lastSrcRange = srcRange;
        lastColorSpace = csNow;

        qDebug() << "[FFMPEG] swsCtx обновлён:"
                 << "rawFmt=" << static_cast<int>(rawFmt)
                 << "srcFmt=" << static_cast<int>(srcFmt)
                 << "range=" << srcRange
                 << "cs=" << csNow
                 << "size=" << width << "x" << height;
    }

    // ВАЖНО: без clone() — пишем сразу в output
    output.create(fh, fw, CV_8UC3);

    uint8_t* dstData[4] = { output.data, nullptr, nullptr, nullptr };
    int dstLinesize[4]  = { static_cast<int>(output.step), 0, 0, 0 };

    int scaled = sws_scale(
        swsCtx,
        frame->data,
        frame->linesize,
        0,
        fh,
        dstData,
        dstLinesize
        );

    if (scaled <= 0) {
        qWarning() << "[FFMPEG] sws_scale failed, scaled =" << scaled;
        output.release();
        return false;
    }

    return true;
}

bool FFmpegCapture::decodeCurrentPacket(cv::Mat& output, bool& gotFrame)
{
    gotFrame = false;

    if (!codecCtx || !packet) {
        broken = true;
        return false;
    }

    int ret = avcodec_send_packet(codecCtx, packet);
    if (ret < 0 && !isAgain(ret)) {
        // Нефатальная ошибка конкретного пакета (для RTSP/HEVC бывает)
        qWarning() << "[FFMPEG] avcodec_send_packet failed, ret =" << ret << "(packet skipped)";
        return true;
    }

    while (true) {
        ret = avcodec_receive_frame(codecCtx, frame);

        if (ret == 0) {
            cv::Mat tmp;
            if (convertFrame(tmp)) {
                output = std::move(tmp); // забираем без лишней копии
                gotFrame = true;
            } else {
                qWarning() << "[FFMPEG] convertFrame failed (frame dropped)";
            }
            continue; // вдруг декодер отдаст ещё кадры из того же пакета
        }

        if (isAgain(ret)) {
            return true; // пока больше кадров нет
        }

        if (ret == AVERROR_EOF) {
            qWarning() << "[FFMPEG] Decoder EOF";
            broken = true;
            return false;
        }

        // decode error конкретного кадра — не валим весь поток
        qWarning() << "[FFMPEG] avcodec_receive_frame failed, ret =" << ret << "(frame dropped)";
        return true;
    }
}

bool FFmpegCapture::read(cv::Mat& output)
{
    output.release();

    if (!fmtCtx || !codecCtx || !packet || !frame) {
        qWarning() << "[FFMPEG] read(): capture not opened";
        broken = true;
        return false;
    }

    for (int i = 0; i < kReadMaxPackets; ++i) {
        int ret = av_read_frame(fmtCtx, packet);

        if (ret == AVERROR_EOF) {
            qWarning() << "[FFMPEG] av_read_frame EOF";
            broken = true;
            return false;
        }

        if (isAgain(ret)) {
            // временно нет данных в сокете
            QThread::msleep(1);
            continue;
        }

        if (ret < 0) {
            qWarning() << "[FFMPEG] av_read_frame failed, ret =" << ret;
            broken = true;
            return false;
        }

        if (packet->stream_index != videoStreamIndex) {
            av_packet_unref(packet);
            continue;
        }

        bool gotFrame = false;
        bool ok = decodeCurrentPacket(output, gotFrame);
        av_packet_unref(packet);

        if (!ok) {
            return false; // fatal внутри decodeCurrentPacket
        }

        if (gotFrame && !output.empty()) {
            return true;
        }
    }

    qWarning() << "[FFMPEG] read(): exceeded packet scan limit without decoded frame";
    // не fatal — просто в этот раз не получили кадр
    return false;
}

bool FFmpegCapture::readLatest(cv::Mat& output)
{
    output.release();

    if (!fmtCtx || !codecCtx || !packet || !frame) {
        qWarning() << "[FFMPEG] readLatest(): capture not opened";
        broken = true;
        return false;
    }

    cv::Mat latest;

    // 1) Гарантированно получаем хотя бы один кадр (блокирующе)
    if (!read(latest) || latest.empty()) {
        return false;
    }

    // 2) Сливаем хвост быстро, но с ограничением по времени
    int oldFmtFlags = fmtCtx->flags;
    fmtCtx->flags |= AVFMT_FLAG_NONBLOCK;

    QElapsedTimer drainTimer;
    drainTimer.start();

    for (int drain = 0; drain < kDrainMaxPackets; ++drain) {
        if (drainTimer.elapsed() > kDrainBudgetMs) {
            break;
        }

        int ret = av_read_frame(fmtCtx, packet);

        if (isAgain(ret)) {
            break; // буфер пуст
        }

        if (ret == AVERROR_EOF) {
            break; // поток закрылся, latest уже есть
        }

        if (ret < 0) {
            // transient error во время drain не делаем fatal
            break;
        }

        if (packet->stream_index != videoStreamIndex) {
            av_packet_unref(packet);
            continue;
        }

        cv::Mat candidate;
        bool gotFrame = false;
        bool ok = decodeCurrentPacket(candidate, gotFrame);
        av_packet_unref(packet);

        if (!ok) {
            // если уже есть latest — лучше вернуть его
            break;
        }

        if (gotFrame && !candidate.empty()) {
            latest = std::move(candidate);
        }
    }

    fmtCtx->flags = oldFmtFlags;

    if (!latest.empty()) {
        output = std::move(latest);
        return true;
    }

    return false;
}
