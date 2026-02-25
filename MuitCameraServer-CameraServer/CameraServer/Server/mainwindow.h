#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QQuickWidget>
#include <QQmlContext>
#include <QMainWindow>
#include <QQmlApplicationEngine>
#include <QThread>
#include "../Settings/SettingsFile.h"
#include "../Algorithms/AlgorithmManager.h" // Подключаем наш новый супер-менеджер
#include "../ViewModels/Managers/ObjectManager.h"
#include "../Proxy/ProxyManager.h"

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();
private:
    SettingsFile* file=nullptr;
    AlgorithmManager* m_algoManager=nullptr; // Управляет базой, поиском и камерой

    // Указатели на QML
    ObjectManager* m_objManager=nullptr;
    QQmlApplicationEngine* m_qmlEngine=nullptr;
    QQuickWindow* m_qmlWindow=nullptr;

    ProxyManager* m_proxy=nullptr;
};
#endif // MAINWINDOW_H
