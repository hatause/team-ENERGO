#ifndef IFILTER_H
#define IFILTER_H

#include <QObject>
#include <QSqlQuery>

template <typename T>
class IQuerryFilter : public QObject {

public:
    explicit IQuerryFilter(QObject *parent = nullptr) : QObject(parent) {}

    virtual T mappingFilter(const QSqlQuery& query) = 0;

    virtual void mappingUpdateFilter(QSqlQuery& query, T&) = 0;
};



#endif // IFILTER_H
