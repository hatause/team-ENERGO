#ifndef OBJECTMANAGER_H
#define OBJECTMANAGER_H

#include <QObject>
#include "../../Algorithms/AlgorithmManager.h"
#include "../Objects/CameraImageProvider.h"
#include "../Objects/CameraCheckerObjectWindow.h"
#include "../Objects/RequestsWindowObject.h"

class ObjectManager : public QObject
{
    Q_OBJECT
private:
    CameraCheckWindowObject* m_cameraWindowObject=nullptr;
    RequestsWindowObject* m_bridge=nullptr;
    CameraImageProvider* imageProvider=nullptr;
public:
    explicit ObjectManager(AlgorithmManager* algo_manager, QObject *parent = nullptr);

    CameraCheckWindowObject* CameraWindowObj(){return m_cameraWindowObject;}
    RequestsWindowObject* RequestWindowObj(){return m_bridge;}
    CameraImageProvider* ImgProviderObj() {return imageProvider;}


signals:
};

#endif // OBJECTMANAGER_H
