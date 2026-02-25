#include "AuditoryFinder.h"

AuditoryFinder::AuditoryFinder(DatabaseManager* database, QObject *parent)
    :QObject{parent},  m_database(database)
{

}

// void AuditoryFinder::BookAuditory(const AuditoryNote& note, const QTime& startTime, const int& longness) {
//     AuditoryJournalNote journalRecord;
//     journalRecord.SetAudId(note.Id());
//     journalRecord.SetAudStartTime(startTime);
//     journalRecord.SetAudEndTime(startTime.addSecs(longness * 60));
//     journalRecord.SetAudDuration(longness);
//     journalRecord.SetAudDayOfWeek(1/*QDate::currentDate().dayOfWeek()*/);
//     journalRecord.SetAudTimeStatus(1);

//     m_database->InsertNote<AuditoryJournalNote>(FilterType::AuditoryJournal, journalRecord);
// }

AuditoryNote AuditoryFinder::FindAuditory(const QString& targetCorpus, const QTime& startTime, const int& dayOfWeek, const int& longness) {
    if (!m_database) return AuditoryNote();

    QTime endTime = startTime.addSecs(longness * 60);

    FindCabinetReq req;
    req.timePart.SetStartTime(startTime);
    req.timePart.SetEndTime(endTime);
    req.timePart.SetDuration(longness);
    req.auditory.SetCorpus(targetCorpus);
    req.timePart.SetDayOfWeek(dayOfWeek);


    return m_database->Execute<AuditoryNote, FindCabinetReq>(
        AlgoRequester::CabinetFindRequest(),
        req,
        FilterType::CabFind,
        FilterType::Auditory
        );
}

void AuditoryFinder::CompleteBooking(const AuditoryNote& note, const QTime& startTime, const int& dayOfWeek, const int& longness) {
    if (!m_database) return;

    AuditoryJournalNote journalRecord;
    journalRecord.SetAudId(note.Id());
    journalRecord.SetAudStartTime(startTime);
    journalRecord.SetAudEndTime(startTime.addSecs(longness * 60));
    journalRecord.SetAudDayOfWeek(dayOfWeek);
    journalRecord.SetAudTimeStatus(1);

    // Status 2 -> 1 выполняется внутри SQL запроса CabinetBookComplete

    m_database->Execute<AuditoryJournalNote, AuditoryJournalNote>(
        AlgoRequester::CabinetBookComplete(),
        journalRecord,
        FilterType::AuditoryJournal, // Входной фильтр для биндинга параметров
        FilterType::AuditoryJournal  // Выходной (не используется, но нужен для шаблона Execute)
        );
}

void AuditoryFinder::ClearTemporaryBookings() {
    if (!m_database) return;

    m_database->Execute(AlgoRequester::CleanTemporaryCabinetRequest());
}
