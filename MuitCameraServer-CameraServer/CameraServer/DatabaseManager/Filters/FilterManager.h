#ifndef FILTERMANAGER_H
#define FILTERMANAGER_H

#include "IFilter.h"
#include "EyeCubFilter.h"

enum class FilterType {
    Auditory,
    AuditoryJournal,
    CameraCab,
    CabFind,
    CamFinId
};

inline QString getTableName(FilterType type) {
    switch (type) {
    case FilterType::Auditory:        return "auditory";
    case FilterType::AuditoryJournal: return "auditory_journal";
    case FilterType::CameraCab:       return "camera_cab_journal";
    default:                          return "";
    }
}

class FilterManager : public QObject {
    Q_OBJECT
public:
    explicit FilterManager(QObject *parent = nullptr) : QObject(parent) {}

    // Шаблонный метод для получения фильтра
    template <typename T>
    static IQuerryFilter<T>* getFilter(FilterType type, QObject* parent = nullptr) {
        switch (type) {
        case FilterType::Auditory:
            return reinterpret_cast<IQuerryFilter<T>*>(new AuditoryFilter(parent));
        case FilterType::AuditoryJournal:
            return reinterpret_cast<IQuerryFilter<T>*>(new AuditoryJournalFilter(parent));
        case FilterType::CameraCab:
            return reinterpret_cast<IQuerryFilter<T>*>(new CamerCabFilter(parent));
        case FilterType::CabFind:
            return reinterpret_cast<IQuerryFilter<T>*>(new CabFindFilter(parent));
        case FilterType::CamFinId:
            return reinterpret_cast<IQuerryFilter<T>*>(new CamFindFilterByCabId(parent));
        default:
            return nullptr;
        }
    }
};
#endif // FILTERMANAGER_H
