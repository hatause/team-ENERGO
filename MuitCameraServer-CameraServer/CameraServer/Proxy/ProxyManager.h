#ifndef PROXYMANAGER_H
#define PROXYMANAGER_H

#include <QObject>
#include "../Settings/SettingsFile.h"
#include "../Proxy/JavaServerProxy.h"
#include "../Proxy/EspServerProxy.h"

class ProxyManager : public QObject
{
    Q_OBJECT
private:
    JavaServerProxy* m_javaServer=nullptr;
    EspServerProxy* m_espServer=nullptr;
public:
    ProxyManager(SettingsFile* file, QObject* parent=nullptr);
    ~ProxyManager(){
        delete m_javaServer;
        delete m_espServer;
    }

    JavaServerProxy* JavaProxy() {return m_javaServer; }
    EspServerProxy* EspProxy() {return m_espServer; }

public slots:
    void slotCabinetAnswer(const AuditoryNote& note){
        m_javaServer->slotCabinetAnswer(note);
        m_espServer->slotCabinetAnswer(note);
    }
};

#endif // PROXYMANAGER_H
