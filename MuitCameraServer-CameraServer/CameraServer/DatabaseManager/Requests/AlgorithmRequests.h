#ifndef ALGORITHMREQUESTS_H
#define ALGORITHMREQUESTS_H


#include <QObject>

class AlgoRequester
{
public:
    static QString CabinetFindRequest() {
        return  QString(
            // "SELECT TOP 1 a.[id], a.[name], a.[number], a.[corpus], a.[category] "
            // "FROM [dbo].[auditory] a "
            // "WHERE NOT EXISTS ("
            // "    SELECT 1 FROM [dbo].[auditory_journal] aj "
            // "    WHERE aj.[aud_id] = a.[id] "
            // "      AND aj.[dayOfWeek] = :dayOfWeek"
            // "      AND aj.[startTime] < :endTime "
            // "      AND aj.[endTime] > :startTime "
            // ") "
            // "ORDER BY "
            // "    CASE WHEN a.[corpus] = :targetCorpus THEN 0 ELSE 1 END ASC, "
            // "    a.[number] ASC"
            "SET NOCOUNT ON; "
            "SET XACT_ABORT ON; "
            "BEGIN TRAN; "
            "DECLARE @InsertedId TABLE (id INT); " // Таблица для хранения ID

            "INSERT INTO dbo.auditory_journal (aud_id, startTime, endTime, dayOfWeek, timeStatus, duration) "
            "OUTPUT INSERTED.aud_id INTO @InsertedId(id) " // Запоминаем, что вставили
            "SELECT TOP (1) a.id, :startTime, :endTime, :dayOfWeek, 2, :duration "
            "FROM dbo.auditory AS a WITH (UPDLOCK, HOLDLOCK) "

            // --- НОВЫЙ БЛОК ---
            "LEFT JOIN dbo.camera_cab_journal AS cam ON a.id = cam.id_cab "
            // ------------------

            "WHERE "
            // --- НОВОЕ УСЛОВИЕ ---
            "      (cam.is_busy = 0 OR cam.is_busy IS NULL) " // Берем только пустые (0) или те, где камер вообще нет (NULL)
            "  AND "
            // ---------------------
            "      NOT EXISTS ( "
            "    SELECT 1 FROM dbo.auditory_journal AS aj "
            "    WHERE aj.aud_id = a.id "
            "      AND aj.dayOfWeek = :dayOfWeek "
            "      AND aj.startTime < :endTime "
            "      AND aj.endTime > :startTime "
            "      AND aj.timeStatus IN (0, 1, 2) "
            ") "
            "ORDER BY CASE WHEN a.corpus = :targetCorpus THEN 0 ELSE 1 END, a.number; "

            // Возвращаем полные данные аудитории, чтобы Filter мог их распарсить
            "SELECT a.id, a.name, a.number, a.corpus, a.category "
            "FROM dbo.auditory a "
            "INNER JOIN @InsertedId i ON a.id = i.id; "
            "COMMIT;"
            );
    };

    static QString CleanTemporaryCabinetRequest() {
        return QString(
                "DELETE FROM auditory_journal WHERE timeStatus = 1"
            );
    };


    static QString CabinetCameraFindReques(){
        return QString(
            "SELECT [id], [id_cab], [login_camera], [password_camera], [camera_ip], [port_camera] "
            "FROM [dbo].[camera_cab_journal] "
            "WHERE [id_cab] = :id"
            );
    }

    static QString CabinetBookComplete(){
        return QString(
            "UPDATE dbo.auditory_journal "
            "SET timeStatus = :timeStatus "
            "WHERE aud_id     = :aud_id "
            "  AND dayOfWeek  = :dayOfWeek "
            "  AND startTime  = :startTime "
            "  AND endTime    = :endTime "
            "  AND timeStatus = 2;"
            );
    }
};

#endif // ALGORITHMREQUESTS_H
