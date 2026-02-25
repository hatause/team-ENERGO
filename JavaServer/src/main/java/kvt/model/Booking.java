package kvt.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record Booking(
        int id,
        long telegramUserId,
        String auditoryName,
        String corpus,
        Integer floor,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        LocalDateTime bookedAt
) {
}
