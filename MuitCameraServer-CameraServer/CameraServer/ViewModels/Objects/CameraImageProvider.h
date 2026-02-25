#ifndef CAMERAIMAGEPROVIDER_H
#define CAMERAIMAGEPROVIDER_H

#include <QQuickImageProvider>
#include "CameraCheckerObjectWindow.h"

class CameraImageProvider : public QQuickImageProvider {
public:
    CameraImageProvider(CameraCheckWindowObject* obj)
        : QQuickImageProvider(QQuickImageProvider::Image), m_obj(obj) {}

    QImage requestImage(const QString&, QSize*, const QSize&) override {
        return m_obj->currentFrame(); // Тянем кадр напрямую
    }
private:
    CameraCheckWindowObject* m_obj;
};

#endif // CAMERAIMAGEPROVIDER_H
