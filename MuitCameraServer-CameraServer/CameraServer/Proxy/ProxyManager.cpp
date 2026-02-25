#include "ProxyManager.h"

ProxyManager::ProxyManager(SettingsFile* file, QObject* parent) {
    m_javaServer = new JavaServerProxy(file, this);
    m_espServer = new EspServerProxy(file, this);

    m_javaServer->startServer(file->tcpSettings.PortJava());
    m_espServer->startServer(file->tcpSettings.PortESP());
}
