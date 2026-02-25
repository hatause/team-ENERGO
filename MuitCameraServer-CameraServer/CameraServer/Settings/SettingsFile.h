#ifndef SETTINGSFILE_H
#define SETTINGSFILE_H

#include <QObject>
#include <QSettings>
#include <QCoreApplication>
#include <QDebug>

#include "Settings_dictionary.h"

class SettingsFile : public QObject
{
    Q_OBJECT
public:
    explicit SettingsFile(QObject *parent = nullptr);

    DatabaseSettings databaseSettings;
    CameraSettings cameraSettings;
    UdpSettings udpSettings;
    NeuroModelSettings neuromodelSettings;
    TCPSettings tcpSettings;

    void ReadConfigFile();
signals:
    void signalSettingsReady();
};

#endif // SETTINGSFILE_H
