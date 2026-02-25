#ifndef REQUESTSWINDOWOBJECT_H
#define REQUESTSWINDOWOBJECT_H


#include <QObject>
#include <QVariantMap>
#include "../../Algorithms/AuditoryFinder.h"

class RequestsWindowObject : public QObject
{
    Q_OBJECT
    // Свойства для отображения результата в QML
    Q_PROPERTY(QString lastFoundName READ lastFoundName NOTIFY lastFoundChanged)
    Q_PROPERTY(int lastFoundNumber READ lastFoundNumber NOTIFY lastFoundChanged)
    Q_PROPERTY(bool hasResult READ hasResult NOTIFY lastFoundChanged)

public:
    explicit RequestsWindowObject(AuditoryFinder* finder, QObject *parent = nullptr)
        : QObject(parent), m_finder(finder)
    {
        // Коннектим сигнал финдера к нашему внутреннему слоту
        connect(m_finder, &AuditoryFinder::signalAuditoryFound,
                this, &RequestsWindowObject::handleAuditoryFound);
        connect(m_finder, &AuditoryFinder::signalAuditoryNotFound,
                this, &RequestsWindowObject::errorOccurred);
    }

    // Методы для вызова из QML
    Q_INVOKABLE void findCabinet(QString corpus, QString timeStr, int duration) {
        QTime time = QTime::fromString(timeStr, "HH:mm");
        if (!time.isValid()) {
            qDebug() << "Invalid time format!";
            return;
        }
        emit findRequest(corpus, time, duration);
    }

    Q_INVOKABLE void bookCurrent(QString timeStr, int duration) {
        if (m_lastNote.Id() <= 0) return;

        QTime time = QTime::fromString(timeStr, "HH:mm");

        m_finder->CompleteBooking(m_lastNote, time, 1, duration);

        // Сбрасываем результат после брони
        m_lastNote = AuditoryNote();
        emit lastFoundChanged();
    }

    Q_INVOKABLE void clearAllTemporary() {
        m_finder->ClearTemporaryBookings();
    }

    // Геттеры для Q_PROPERTY
    QString lastFoundName() const { return m_lastNote.AudName(); }
    int lastFoundNumber() const { return m_lastNote.AudNumber(); }
    bool hasResult() const { return m_lastNote.Id() > 0; }

signals:
    void lastFoundChanged();
    void errorOccurred(QString msg);
    void findRequest(const QString& corpus, const QTime& timeStr, const int &duration);
private slots:
    void handleAuditoryFound(const AuditoryNote note) {
        m_lastNote = note;
        if (m_lastNote.Id() <= 0) {
            emit errorOccurred("Кабинет не найден");
        }
        emit lastFoundChanged();
    }

private:
    AuditoryFinder* m_finder;
    AuditoryNote m_lastNote;
};


#endif // REQUESTSWINDOWOBJECT_H
