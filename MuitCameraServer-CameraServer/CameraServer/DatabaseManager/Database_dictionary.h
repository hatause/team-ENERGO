#ifndef DATABASE_DICTIONARY_H
#define DATABASE_DICTIONARY_H

#include <QString>
#include <QDate>
#include <QTime>
#include <stdint.h>

// ========== Auditory ==============

struct Auditory
{
private:
    QString name="";
    int number=0;
    QString corpus="";
    QString category="";
public:
    QString Name() const {return name;}
    int Number() const {return number;}
    QString Corpus() const {return corpus;}
    QString Category() const {return category;}

    void SetName(QString v) { name=v;}
    void SetNumber(int v) { number=v;}
    void SetCorpus(QString v) { corpus=v;}
    void SetCategory(QString v) { category=v;}
};

struct AuditoryNote
{
private:
    int id=0;
    Auditory auditory;
public:
    int Id() const {return id;}
    QString AudName() const {return auditory.Name();}
    int AudNumber() const {return auditory.Number();}
    QString AudCorpus() const {return auditory.Corpus();}
    QString AudCategory() const {return auditory.Category();}

    void SetId(int v) {id=v;}
    void SetAudName(QString v) {auditory.SetName(v);}
    void SetAudNumber(int v) {auditory.SetNumber(v);}
    void SetAudCorpus(QString v) {auditory.SetCorpus(v);}
    void SetAudCategory(QString v) {auditory.SetCategory(v);}
};

// ================== AuditoryJournal ===============

struct AuditoryTimePart
{
private:
    int durationMin=0;
    QTime startTime;
    QTime endTime;
    int dayOfWeek=0;
    int timeStatus=0;
public:
    QTime StartTime() const { return startTime; }
    QTime EndTime() const { return endTime; }
    int Duration() const { return durationMin; }
    int TimeStatus() const { return timeStatus; }
    int DayOfWeek() const { return dayOfWeek; }

    void SetStartTime(QTime v) { startTime = v; }
    void SetEndTime(QTime v) { endTime = v; }
    void SetDuration(int v) { durationMin = v; }
    void SetTimeStatus(int v) { timeStatus = v; }
    void SetDayOfWeek(int v) { dayOfWeek = v; }
};

struct AuditoryJournalNote
{
private:
    int id=0;
    int aud_id=0;
    AuditoryTimePart time_part;

public:
    int Id() const { return id; }
    int AudId() const { return aud_id; }
    QTime AudStartTime() const { return time_part.StartTime(); }
    QTime AudEndTime() const { return time_part.EndTime(); }
    int AudDuration() const { return time_part.Duration(); }
    int AudTimeStatus() const { return time_part.TimeStatus(); }
    int AudDayOfWeek() const { return time_part.DayOfWeek(); }

    void SetId(int v) { id = v; }
    void SetAudId(int v) { aud_id = v; }
    void SetAudStartTime(QTime v) { time_part.SetStartTime(v); }
    void SetAudEndTime(QTime v) {time_part.SetEndTime(v); }
    void SetAudDuration(int v) { time_part.SetDuration(v); }
    void SetAudTimeStatus(int v) { time_part.SetTimeStatus(v); }
    void SetAudDayOfWeek(int v) { time_part.SetDayOfWeek(v); }
};


// =================== Camera ==================

struct IpCamera
{
private:
    QString camera_ip="";
    QString login_camera="";
    QString password_camera="";
    QString port_camera="";
public:
    QString CameraIp() const { return camera_ip; }
    QString LoginCamera() const { return login_camera; }
    QString PasswordCamera() const { return password_camera; }
    QString PortCamera() const { return port_camera; }

    void SetCameraIp(const QString &v) { camera_ip = v; }
    void SetLoginCamera(const QString &v) { login_camera = v; }
    void SetPasswordCamera(const QString &v) { password_camera = v; }
    void SetPortCamera(const QString &v) { port_camera = v; }
};

struct CameraCabJournalNote
{
private:
    int id=0;
    int id_cab=0;
    int is_busy = 0;
    IpCamera camera;

public:
    int Id() const { return id; }
    QString CameraIp() const { return camera.CameraIp(); }
    int IdCab() const { return id_cab; }
    QString LoginCamera() const { return camera.LoginCamera(); }
    QString PasswordCamera() const { return camera.PasswordCamera(); }
    QString PortCamera() const { return camera.PortCamera(); }
    bool IsBusy() const { return is_busy; }

    void SetId(int v) { id = v; }
    void SetCameraIp(const QString &v) { camera.SetCameraIp(v); }
    void SetIdCab(int v) { id_cab = v; }
    void SetLoginCamera(const QString &v) { camera.SetLoginCamera(v); }
    void SetPasswordCamera(const QString &v) { camera.SetPasswordCamera(v); }
    void SetPortCamera(const QString &v) { camera.SetPortCamera(v); }
    void SetBusy(const bool &v) {is_busy =v;}
};

// ====================== Custom Requests ========================
struct FindCabinetReq
{
public:
    Auditory auditory;
    AuditoryTimePart timePart;
};



#endif // DATABASE_DICTIONARY_H
