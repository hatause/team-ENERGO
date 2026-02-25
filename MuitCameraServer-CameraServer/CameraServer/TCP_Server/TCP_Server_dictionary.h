#ifndef TCP_SERVER_DICTIONARY_H
#define TCP_SERVER_DICTIONARY_H

#include <QString>
#include <QTime>

struct C2JavaPacket{
private:
    int id=0;
    int cab_number=0;
public:
    int Id() const {return id;}
    int Cabinet() const {return cab_number;}

    void SetId(int v) {id = v;}
    void SetCabinet(int v) {cab_number=v;}
};

struct Java2CPacket{
private:
    int id=0;
    QTime startTime;
    QString corpus="";
    int duration=0;
public:
    int Id()const { return id; }
    QTime Time() const { return startTime; }
    QString Corpus() const { return corpus; }
    int Duration() const { return duration; }

    void SetId(int v) { id = v; }
    void SetTime(QTime v) { startTime = v; }
    void SetCorpus(QString v) { corpus = v; }
    void SetDuration(int v) { duration = v; }
};

struct C2EspPacket{
private:
    int id=0;
    int cabNum=0;
    bool isBusy=false;
public:
    int Id() const { return id; }
    int Cabinet() const { return cabNum; }
    bool IsBusy() const { return isBusy; }

    void SetId(int v) { id = v; }
    void SetCabinet(int v) { cabNum= v; }
    void SetBusy(bool v) { isBusy= v; }

};

#endif // TCP_SERVER_DICTIONARY_H
