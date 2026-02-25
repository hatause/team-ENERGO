package kvt.model;

import java.time.LocalTime;

public record AuditoryJournal(
        int id,
        int audId,
        int dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        Integer duration,
        Integer timeStatus
) {
}
