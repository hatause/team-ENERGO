#ifndef JAVASERVERPROXY_H
#define JAVASERVERPROXY_H

#include "../TCP_Server/TCP_Manager.h"
#include "../Settings/SettingsFile.h"
#include "../DatabaseManager/Database_dictionary.h"

class JavaServerProxy : public TCP_Manager
{
    Q_OBJECT
private:
    QString Ip="";
private slots:
    void slotPacketJavaReceived(const Java2CPacket& packet);
public:
    JavaServerProxy(SettingsFile* file, QObject* parent=nullptr);
public slots:
    void slotCabinetAnswer(const AuditoryNote& note);

signals:
    void signalFindRequest(const QString& targetCorpus, const QTime& startTime, const int& longness);
};

#endif // JAVASERVERPROXY_H
