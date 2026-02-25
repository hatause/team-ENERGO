#ifndef EYECUBFILTER_H
#define EYECUBFILTER_H

#include "IFilter.h"
#include "../Database_dictionary.h"

class AuditoryFilter : public IQuerryFilter<AuditoryNote>
{
public:
    explicit AuditoryFilter(QObject* parent = nullptr) : IQuerryFilter<AuditoryNote>(parent){}

    AuditoryNote mappingFilter(const QSqlQuery& query) override;

    void mappingUpdateFilter(QSqlQuery& query, AuditoryNote&) override;
};

class AuditoryJournalFilter : public IQuerryFilter<AuditoryJournalNote>
{
public:
    explicit AuditoryJournalFilter(QObject* parent = nullptr) : IQuerryFilter<AuditoryJournalNote>(parent){}

    AuditoryJournalNote mappingFilter(const QSqlQuery& query) override;

    void mappingUpdateFilter(QSqlQuery& query, AuditoryJournalNote&) override;
};

class CamerCabFilter : public IQuerryFilter<CameraCabJournalNote>
{
public:
    explicit CamerCabFilter(QObject* parent = nullptr) : IQuerryFilter<CameraCabJournalNote>(parent){}

    CameraCabJournalNote mappingFilter(const QSqlQuery& query) override;

    void mappingUpdateFilter(QSqlQuery& query, CameraCabJournalNote&) override;
};

class CabFindFilter : public IQuerryFilter<FindCabinetReq>
{
public:
    explicit CabFindFilter(QObject* parent = nullptr) : IQuerryFilter<FindCabinetReq>(parent){}

    FindCabinetReq mappingFilter(const QSqlQuery& query) override;

    void mappingUpdateFilter(QSqlQuery& query, FindCabinetReq&) override;
};


class CamFindFilterByCabId :  public IQuerryFilter<CameraCabJournalNote>
{
public:
    explicit CamFindFilterByCabId(QObject* parent = nullptr) : IQuerryFilter<CameraCabJournalNote>(parent){}

    CameraCabJournalNote mappingFilter(const QSqlQuery& query) override;

    void mappingUpdateFilter(QSqlQuery& query, CameraCabJournalNote&) override;
};
#endif // EYECUBFILTER_H
