#ifndef DATABASEMANAGER_H
#define DATABASEMANAGER_H

#include <QObject>

#include "DatabaseConnector.h"
#include "Filters/FilterManager.h"

#include "../Settings/SettingsFile.h"

class DatabaseManager : public DatabaseConnector
{
    Q_OBJECT
private:
    SettingsFile* m_file=nullptr;

    QString getInsertQuery(FilterType type);

    QString getUpdateQuery(FilterType type);

public:
    DatabaseManager(SettingsFile* file, QObject* parent = nullptr);


    template<typename Output, typename Input>
    Output Execute(const QString& request, Input& inputStruct, FilterType input_filter, FilterType out_filter)
    {
        Output out;

        auto inputFilter = FilterManager::getFilter<Input>(input_filter, this);
        if (!inputFilter) return out;

        QSqlQuery query(m_db);


        if (request.isEmpty()) {
            qWarning() << "[DATABASEMANAGER]{EXECUTE} Unknown type for Execute";
            delete inputFilter;
            return out;
        }

        query.prepare(request);

        inputFilter->mappingUpdateFilter(query, inputStruct);

        delete inputFilter;

        if (query.exec() && query.next()) {
            auto outputFilter = FilterManager::getFilter<Output>(out_filter, this);

            out = outputFilter->mappingFilter(query);

            delete outputFilter;
        }

        return out;
    }

    template<typename I>
    void Exectue(const QString& request, const QString& cell, I& input){
        QSqlQuery query(m_db);

        if (request.isEmpty()) {
            qWarning() << "Unknown type for Execute";
            return;
        }

        query.prepare(request);

        query.bindValue(cell, input);
        query.exec();
    }

    void Execute(const QString& request){
        QSqlQuery query(m_db);

        if (request.isEmpty()) {
            qWarning() << "Unknown type for Execute";
            return;
        }

        query.prepare(request);

        if (!query.exec()) {
            qDebug() << "[EXECUTE] failed:" << query.lastError().text();
        } else {
            qDebug() << "[EXECUTE] SUCCESSSSSSS!";
        }
    }


    template<typename I>
    void InsertNote(FilterType type, I& note) {
        // 1. Создаем фильтр через твой FilterManager
        auto filter = FilterManager::getFilter<I>(type, this);
        if (!filter) return;

        // 2. Получаем готовый SQL запрос
        QSqlQuery query(m_db);
        QString sql = getInsertQuery(type);

        if (sql.isEmpty()) {
            qWarning() << "Unknown type for Insert";
            delete filter;
            return;
        }

        query.prepare(sql);

        // 3. Биндим данные из объекта в запрос (используя твой код)
        filter->mappingUpdateFilter(query, note);

        if (!query.exec()) {
            qDebug() << "Insert Error:" << query.lastError().text();
        }

        // Удаляем фильтр (так как он создан через new в FilterManager)
        delete filter;
    }

    // --- UPDATE ---
    template<typename U>
    void UpdateNote(FilterType type, U& note) {
        auto filter = FilterManager::getFilter<U>(type, this);
        if (!filter) return;

        QSqlQuery query(m_db);
        QString sql = getUpdateQuery(type);

        if (sql.isEmpty()) {
            qWarning() << "Unknown type for Update";
            delete filter;
            return;
        }

        query.prepare(sql);
        filter->mappingUpdateFilter(query, note);

        if (!query.exec()) {
            qDebug() << "Update Error:" << query.lastError().text();
        }
        delete filter;
    }

    // --- DELETE ---
    template<typename D>
    void DeleteNote(FilterType type, D& note) {
        auto filter = FilterManager::getFilter<D>(type, this);
        if (!filter) return;

        QString table = getTableName(type);
        QSqlQuery query(m_db);

        // Для удаления нам нужен только ID.
        // Но так как в твоем IFilter нет метода mappingIdFilter,
        // мы используем mappingUpdateFilter, который забиндит :id (и лишние поля, что не страшно).
        query.prepare(QString("DELETE FROM %1 WHERE id = :id").arg(table));

        filter->mappingUpdateFilter(query, note);

        if (!query.exec()) {
            qDebug() << "Delete Error:" << query.lastError().text();
        }
        delete filter;
    }

    // --- GET (Возвращает список) ---
    // G ожидается как QList<AuditoryNote> и т.д.
    template<typename G>
    G GetNote(FilterType type) {
        G resultList;

        // Определяем тип элемента внутри списка (например, AuditoryNote)
        using NoteType = typename G::value_type;

        auto filter = FilterManager::getFilter<NoteType>(type, this);
        if (!filter) return resultList;

        QString table = getTableName(type);
        QSqlQuery query(m_db);
        query.prepare(QString("SELECT * FROM %1 ORDER BY id").arg(table));

        if (query.exec()) {
            while (query.next()) {
                resultList.append(filter->mappingFilter(query));
            }
        } else {
            qDebug() << "Get Error:" << query.lastError().text();
        }

        delete filter;
        return resultList;
    }

};

#endif // DATABASEMANAGER_H
