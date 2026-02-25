#ifndef CAMERACHECKEROBJECTWINDOW_H
#define CAMERACHECKEROBJECTWINDOW_H

#include <QObject>
#include <QImage>
#include "../VideoViewer/Camera_dictionary.h"

class CameraCheckWindowObject : public QObject {
    Q_OBJECT
    Q_PROPERTY(int peopleCount READ peopleCount NOTIFY peopleCountChanged)

public:
    explicit CameraCheckWindowObject(QObject *parent = nullptr) : QObject(parent) {}

    int peopleCount() const { return m_count; }
    QImage currentFrame() const { return m_frame; }

public slots:
    void updateData(CameraProcessPacket packet) {
        m_frame = packet.image.QFrame();
        m_count = packet.modelOut.People();
        emit peopleCountChanged();
        emit frameReady(); // Сигнал для ImageProvider
    }

signals:
    void peopleCountChanged();
    void frameReady();

private:
    int m_count = 0;
    QImage m_frame;
};

#endif // CAMERACHECKEROBJECTWINDOW_H
