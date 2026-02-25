#ifndef SETTINGS_DICTIONARY_H
#define SETTINGS_DICTIONARY_H

#include <QString>

struct DatabaseSettings
{
private:
    QString dbName;
    QString host;
    QString password;
    QString user;
public:
    QString DbName() const { return dbName; }
    QString Host() const { return host; }
    QString Password() const { return password; }
    QString User() const { return user; }

    // Сеттеры
    void SetDbName(const QString &v) { dbName = v; }
    void SetHost(const QString &v) { host = v; }
    void SetPassword(const QString &v) { password = v; }
    void SetUser(const QString &v) { user = v; }

};

struct CameraSettings
{
private:
    QString startRtcp;
    QString endRtcp;
    QString cameraIndex;
public:
    QString StartRtcp() const { return startRtcp; }
    QString EndRtcp() const { return endRtcp; }
    QString CameraIndex() const { return cameraIndex; }
    // Сеттеры
    void SetStartRtcp(const QString &v) { startRtcp = v; }
    void SetEndRtcp(const QString &v) { endRtcp = v; }
    void SetCameraIndex(const QString &v) {cameraIndex = v; }
};


struct UdpSettings
{
private:
    QString IP_PythonServer;
    int IP_Port_Listen;
    int IP_Port_Send;
    int IP_Port_Remote;
public:
    // Геттеры
    QString IpPythonServer() const { return IP_PythonServer; }
    int IpPortListen() const { return IP_Port_Listen; }
    int IpPortSend() const { return IP_Port_Send; }
    int IpPortRemote() const { return IP_Port_Remote; }

    // Сеттеры
    void SetIpPythonServer(const QString &v) { IP_PythonServer = v; }
    void SetIpPortListen(int v) { IP_Port_Listen = v; }
    void SetIpPortSend(int v) { IP_Port_Send = v; }
    void SetIpPortRemote(int v) { IP_Port_Remote = v; }
};


struct NeuroModelSettings
{
private:
    QString cfg="";
    QString wghts="";
    QString names="";
public:
    QString ConfigFilePath()const {return cfg;}
    QString WeightsFilePath()const {return wghts;}
    QString CocoNamesFilePath()const {return names;}

    void SetConfigFilePath(const QString& v) {cfg=v;}
    void SetWeightsFilePath(const QString& v) {wghts=v;}
    void SetCocoNamesFilePath(const QString& v) {names=v;}

};


struct TCPSettings
{
private:
    QString tcp_ip_java = "";
    int tcp_port_java = 0;
    QString tcp_ip_esp = "";
    int tcp_port_esp = 0;
public:
    QString IpJava() const { return tcp_ip_java; }
    int PortJava() const {return tcp_port_java; }
    QString IpESP() const { return tcp_ip_esp; }
    int PortESP() const { return tcp_port_esp; }

    void SetIpJava(QString v) {tcp_ip_java=v;}
    void SetPortJava(int v) {tcp_port_java=v;}
    void SetIpESP(QString v) {tcp_ip_esp=v;}
    void SetPortESP(int v) {tcp_port_esp=v;}
};

#endif // SETTINGS_DICTIONARY_H
