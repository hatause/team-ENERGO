#include "DatabaseManager.h"

DatabaseManager::DatabaseManager(SettingsFile* file, QObject* parent)
    : DatabaseConnector(file->databaseSettings.Host(), file->databaseSettings.DbName(), file->databaseSettings.User(), file->databaseSettings.Password(), parent)
{
    m_file = file;
}

QString DatabaseManager::getInsertQuery(FilterType type) {
    QString table = getTableName(type);
    switch (type) {
    case FilterType::Auditory:
        return QString("INSERT INTO %1 (name, number, corpus, category) "
                       "VALUES (:name, :number, :corpus, :category)").arg(table);
    case FilterType::AuditoryJournal:
        return QString("INSERT INTO %1 (aud_id, startTime, endTime, duration, dayOfWeek, timeStatus) "
                       "VALUES (:aud_id, :startTime, :endTime, :duration, :dayOfWeek, :timeStatus)").arg(table);
    case FilterType::CameraCab:
        return QString("INSERT INTO %1 (camera_ip, id_cab, login_camera, password_camera, port_camera) "
                       "VALUES (:camera_ip, :id_cab, :login_camera, :password_camera, :port_camera)").arg(table);
    default: return "";
    }
}

QString DatabaseManager::getUpdateQuery(FilterType type) {
    QString table = getTableName(type);
    switch (type) {
    case FilterType::Auditory:
        return QString("UPDATE %1 SET name=:name, number=:number, corpus=:corpus, category=:category "
                       "WHERE id=:id").arg(table);
    case FilterType::AuditoryJournal:
        return QString("UPDATE %1 SET aud_id=:aud_id, startTime=:startTime, endTime=:endTime, duration=:duration, timeStatus=:timeStatus, dayOfWeek=:dayOfWeek "
                       "WHERE id=:id").arg(table);
    case FilterType::CameraCab:
        return QString("UPDATE %1 SET camera_ip=:camera_ip, id_cab=:id_cab, login_camera=:login_camera, "
                       "password_camera=:password_camera, port_camera=:port_camera, is_busy=:is_busy "
                       "WHERE id=:id").arg(table);
    default: return "";
    }
}
