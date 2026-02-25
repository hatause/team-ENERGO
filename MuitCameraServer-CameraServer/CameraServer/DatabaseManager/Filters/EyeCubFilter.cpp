#include "EyeCubFilter.h"

// --- AuditoryFilter ---

AuditoryNote AuditoryFilter::mappingFilter(const QSqlQuery& query) {
    AuditoryNote note;

    if (!query.isActive() || !query.isValid())
        return note;

    // Используем сеттеры, которые мы создали ранее
    note.SetId(query.value("id").toInt());
    note.SetAudName(query.value("name").toString());
    note.SetAudNumber(query.value("number").toInt());
    note.SetAudCorpus(query.value("corpus").toString());
    note.SetAudCategory(query.value("category").toString());

    return note;
}

void AuditoryFilter::mappingUpdateFilter(QSqlQuery& query, AuditoryNote& note) {
    // Привязываем значения объекта к именованным параметрам SQL запроса
    // query.bindValue(":id", note.Id()); // auto insert
    query.bindValue(":name", note.AudName());
    query.bindValue(":number", note.AudNumber());
    query.bindValue(":corpus", note.AudCorpus());
    query.bindValue(":category", note.AudCategory());
}

// --- AuditoryJournalFilter ---

AuditoryJournalNote AuditoryJournalFilter::mappingFilter(const QSqlQuery& query) {
    AuditoryJournalNote note;

    if (!query.isActive() || !query.isValid())
        return note;

    note.SetId(query.value("id").toInt());
    note.SetAudId(query.value("aud_id").toInt());
    note.SetAudStartTime(query.value("startTime").toTime());
    note.SetAudEndTime(query.value("endTime").toTime());
    note.SetAudDuration(query.value("duration").toInt());
    note.SetAudDayOfWeek(query.value("dayOfWeek").toInt());
    note.SetAudTimeStatus(query.value("timeStatus").toInt());

    return note;
}

void AuditoryJournalFilter::mappingUpdateFilter(QSqlQuery& query, AuditoryJournalNote& note) {
    // query.bindValue(":id", note.Id()); auto insert
    query.bindValue(":aud_id", note.AudId());
    query.bindValue(":startTime", note.AudStartTime());
    query.bindValue(":endTime", note.AudEndTime());
    query.bindValue(":duration", note.AudDuration());
    query.bindValue(":dayOfWeek", note.AudDayOfWeek());
    query.bindValue(":timeStatus", note.AudTimeStatus());
}

// --- CamerCabFilter ---

CameraCabJournalNote CamerCabFilter::mappingFilter(const QSqlQuery& query) {
    CameraCabJournalNote note;

    if (!query.isActive() || !query.isValid())
        return note;

    note.SetId(query.value("id").toInt());
    note.SetCameraIp(query.value("camera_ip").toString());
    note.SetIdCab(query.value("id_cab").toInt());
    note.SetLoginCamera(query.value("login_camera").toString());
    note.SetPasswordCamera(query.value("password_camera").toString());
    note.SetPortCamera(query.value("port_camera").toString());
    note.SetBusy(query.value("is_busy").toInt());

    return note;
}

void CamerCabFilter::mappingUpdateFilter(QSqlQuery& query, CameraCabJournalNote& note) {
    query.bindValue(":id", note.Id()); // auto insert
    query.bindValue(":camera_ip", note.CameraIp());
    query.bindValue(":id_cab", note.IdCab());
    query.bindValue(":login_camera", note.LoginCamera());
    query.bindValue(":password_camera", note.PasswordCamera());
    query.bindValue(":port_camera", note.PortCamera());
    query.bindValue(":is_busy", note.IsBusy());
}


FindCabinetReq CabFindFilter::mappingFilter(const QSqlQuery& query) {
    FindCabinetReq note;

    if (!query.isActive() || !query.isValid())
        return note;

    return note;
}

void CabFindFilter::mappingUpdateFilter(QSqlQuery& query, FindCabinetReq& note) {
    query.bindValue(":startTime", note.timePart.StartTime());
    query.bindValue(":endTime", note.timePart.EndTime());
    query.bindValue(":dayOfWeek", note.timePart.DayOfWeek());
    query.bindValue(":targetCorpus", note.auditory.Corpus());
    query.bindValue(":duration", note.timePart.Duration());
}


CameraCabJournalNote CamFindFilterByCabId::mappingFilter(const QSqlQuery& query) {
    CameraCabJournalNote note;

    return note;

}

void CamFindFilterByCabId::mappingUpdateFilter(QSqlQuery& query, CameraCabJournalNote& note) {
    query.bindValue(":id", note.IdCab());

}
