#include "mainwindow.h"

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    file = new SettingsFile(this);
    file->ReadConfigFile();

    m_algoManager = new AlgorithmManager(file, this);
    m_proxy = new ProxyManager(file, this);

    connect(m_proxy->JavaProxy(), &JavaServerProxy::signalFindRequest, m_algoManager, &AlgorithmManager::slotGetFindRequest);
    connect(m_algoManager->getFinderInstance(), &AuditoryFinder::signalAuditoryFound, m_proxy, &ProxyManager::slotCabinetAnswer);

    // 3. Создаем QML движок и настраиваем окно камеры
    m_qmlEngine = new QQmlApplicationEngine(this);
    m_objManager = new ObjectManager(m_algoManager, this);

    m_qmlEngine->addImageProvider(QLatin1String("camera"), m_objManager->ImgProviderObj());
    m_qmlEngine->rootContext()->setContextProperty("cameraWindowObject", m_objManager->CameraWindowObj());
    m_qmlEngine->rootContext()->setContextProperty("requestObject", m_objManager->RequestWindowObj());

    // Загружаем QML компоненты
    m_qmlEngine->load(QUrl(QStringLiteral("qrc:qml/CameraCheckerWindow.qml")));
    m_qmlEngine->load(QUrl(QStringLiteral("qrc:qml/RequestWindow.qml")));

    // 7. Достаем окно из загруженного QML и показываем его
    if (!m_qmlEngine->rootObjects().isEmpty()) {
        m_qmlWindow = qobject_cast<QQuickWindow*>(m_qmlEngine->rootObjects().first());
        if (m_qmlWindow) {
            m_qmlWindow->show();
        }
    }

}

MainWindow::~MainWindow() {

}
