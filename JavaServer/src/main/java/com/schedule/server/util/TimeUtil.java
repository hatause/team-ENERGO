package com.schedule.server.util;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public final class TimeUtil {

    private static final ZoneId ALMATY_ZONE = ZoneId.of("Asia/Almaty");
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private TimeUtil() {
    }

    public static int currentStartHour() {
        return ZonedDateTime.now(ALMATY_ZONE).getHour();
    }

    public static String currentStartTime() {
        return ZonedDateTime.now(ALMATY_ZONE).format(HH_MM);
    }

    public static LocalTime currentLocalTime() {
        return ZonedDateTime.now(ALMATY_ZONE).toLocalTime();
    }

    public static LocalDate currentDate() {
        return ZonedDateTime.now(ALMATY_ZONE).toLocalDate();
    }

    public static int currentDayOfWeek() {
        return ZonedDateTime.now(ALMATY_ZONE).getDayOfWeek().getValue();
    }

    public static String formatTime(LocalTime time) {
        return time.format(HH_MM);
    }
}
