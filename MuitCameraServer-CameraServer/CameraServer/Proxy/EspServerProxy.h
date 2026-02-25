#ifndef ESPSERVERPROXY_H
#define ESPSERVERPROXY_H

#include "../TCP_Server/TCP_Manager.h"
#include "../Settings/SettingsFile.h"
#include "../DatabaseManager/Database_dictionary.h"

class EspServerProxy : public TCP_Manager
{
    Q_OBJECT
private:
    QString Ip="";
public:
    EspServerProxy(SettingsFile* file, QObject* parent=nullptr);
public slots:
    void slotCabinetAnswer(const AuditoryNote& note);
};

#endif // ESPSERVERPROXY_H
