#include "SettingsFile.h"

SettingsFile::SettingsFile(QObject *parent)
    : QObject{parent}
{}


void SettingsFile::ReadConfigFile()
{
    QString settingsPath = QCoreApplication::applicationDirPath() + "/settings.ini";
    QSettings settings(settingsPath, QSettings::IniFormat);

    // --- Чтение настроек Базы Данных ---
    settings.beginGroup("Database");
    databaseSettings.SetDbName(settings.value("dbName", "MUIT_hakaton").toString());
    databaseSettings.SetHost(settings.value("host", "DIMA-NOUT\\SQLEXPRESS02").toString());
    databaseSettings.SetUser(settings.value("user", "DIMA-NOUT\Dima").toString());
    databaseSettings.SetPassword(settings.value("password", "").toString());
    settings.endGroup();

    // --- Чтение настроек Камеры ---
    settings.beginGroup("Camera");
    cameraSettings.SetStartRtcp(settings.value("startRtcp", "rtsp://192.168.1.10").toString());
    cameraSettings.SetEndRtcp(settings.value("endRtcp", "rtsp://192.168.1.11").toString());
    cameraSettings.SetCameraIndex(settings.value("cameraIndex", "0").toString());
    settings.endGroup();

    // --- Чтение настроек UDP ---
    settings.beginGroup("UDP");
    udpSettings.SetIpPythonServer(settings.value("IP_PythonServer", "127.0.0.1").toString());
    udpSettings.SetIpPortListen(settings.value("IP_Port_Listen", 5000).toInt());
    udpSettings.SetIpPortSend(settings.value("IP_Port_Send", 5001).toInt());
    udpSettings.SetIpPortRemote(settings.value("IP_Port_Remote", 5002).toInt());
    settings.endGroup();

    settings.beginGroup("NEUROMODEL");
    neuromodelSettings.SetConfigFilePath(settings.value("ConfigPath", "...").toString());
    neuromodelSettings.SetWeightsFilePath(settings.value("WeightsPath", "YOLOv11/yolov8n.onnx").toString());
    neuromodelSettings.SetCocoNamesFilePath(settings.value("CocoNamesPath", "...").toString());
    settings.endGroup();

    settings.beginGroup("TCP_Servers");
    tcpSettings.SetIpJava(settings.value("IP_Java", "192.168.7.14").toString());
    tcpSettings.SetPortJava(settings.value("PORT_Java", "2222").toInt());
    tcpSettings.SetIpESP(settings.value("IP_ESP", "192.168.7.17").toString());
    tcpSettings.SetPortESP(settings.value("PORT_ESP", "4444").toInt());
    settings.endGroup();


    qDebug() << "Settings loaded from:" << settingsPath;

    // Оповещаем систему, что настройки готовы
    emit signalSettingsReady();
}
