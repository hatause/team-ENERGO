#include "ObjectManager.h"

ObjectManager::ObjectManager(AlgorithmManager* algo_manager, QObject *parent)
    : QObject{parent}
{
    m_bridge = new RequestsWindowObject(algo_manager->getFinderInstance(), this);
    connect(m_bridge, &RequestsWindowObject::findRequest, algo_manager, &AlgorithmManager::slotGetFindRequest);

    m_cameraWindowObject = new CameraCheckWindowObject(this);
    imageProvider = new CameraImageProvider(m_cameraWindowObject);

    connect(algo_manager->getCheckerInstance(), &CameraChecker::dataUpdated,
            m_cameraWindowObject, &CameraCheckWindowObject::updateData);
}
