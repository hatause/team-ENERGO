package com.schedule.server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.schedule.server.dto.CancelBookingRequest;
import com.schedule.server.dto.FindRoomRequest;
import com.schedule.server.dto.FindRoomResponse;
import com.schedule.server.dto.RoomInfo;
import com.schedule.server.tcp.CppTcpClient;
import com.schedule.server.util.TimeUtil;
import kvt.db.AuditoryJournalRepository;
import kvt.db.AuditoryRepository;
import kvt.model.Auditory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class BotBridgeService {

    private final CppTcpClient cppTcpClient;
    private final AuditoryRepository auditoryRepository;
    private final AuditoryJournalRepository auditoryJournalRepository;
    private final SubjectService subjectService;

    private static final List<LocalTime> CLASS_START_TIMES = List.of(
            LocalTime.of(8, 0),
            LocalTime.of(9, 30),
            LocalTime.of(11, 0),
            LocalTime.of(12, 40),
            LocalTime.of(14, 10),
            LocalTime.of(15, 30)
    );

    private static final int GRACE_PERIOD_MINUTES = 30;

    private static final Map<String, String> LOCATION_TO_CORPUS = Map.of(
            "corp_a", "Р С’",
            "corp_b", "Р вЂ",
            "corp_d", "Р вЂќ"
    );

    private final AtomicInteger requestIdCounter = new AtomicInteger(0);

    public FindRoomResponse findRooms(FindRoomRequest request) {
        log.info("findRooms: location_id={}, duration={}, floor={}, user={}",
                request.getLocationId(), request.getDurationMinutes(),
                request.getFloor(), request.getTelegramUserId());

        String corpus = resolveCorpus(request.getLocationId());
        int durationMinutes = request.getDurationMinutes();
        LocalTime now = TimeUtil.currentLocalTime();
        log.info("Current time: {}", TimeUtil.formatTime(now));
        LocalTime classStart = findNearestClassStart(now);

        if (classStart == null) {
            log.info("No more classes today after {}", TimeUtil.formatTime(now));
            return FindRoomResponse.builder()
                    .freeRooms(Collections.emptyList())
                    .alternatives(Collections.emptyList())
                    .reason("Р СњР В° РЎРѓР ВµР С–Р С•Р Т‘Р Р…РЎРЏ Р С—Р В°РЎР‚ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ Р Р…Р ВµРЎвЂљ. Р СџР С•РЎРѓР В»Р ВµР Т‘Р Р…РЎРЏРЎРЏ Р С—Р В°РЎР‚Р В° Р Р…Р В°РЎвЂЎР С‘Р Р…Р В°Р ВµРЎвЂљРЎРѓРЎРЏ Р Р† 15:30.")
                    .build();
        }

        log.info("Nearest valid class start: {} (now={})", TimeUtil.formatTime(classStart), TimeUtil.formatTime(now));
        return sendToCpp(request, corpus, classStart, durationMinutes);
    }

    public void addSubjectFromSchedule(String subName, String teacherName) {
        subjectService.addOrUpdateSubject(subName, teacherName);
    }

    LocalTime findNearestClassStart(LocalTime now) {
        for (LocalTime classStart : CLASS_START_TIMES) {
            LocalTime deadline = classStart.plusMinutes(GRACE_PERIOD_MINUTES);
            if (!now.isAfter(deadline)) {
                return classStart;
            }
        }
        return null; // Р Р†РЎРѓР Вµ Р С—Р В°РЎР‚РЎвЂ№ РЎС“Р В¶Р Вµ Р С—РЎР‚Р С•РЎв‚¬Р В»Р С‘
    }

    private FindRoomResponse sendToCpp(FindRoomRequest request, String corpus,
                                        LocalTime classStart, int durationMinutes) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("id", requestIdCounter.incrementAndGet());
            payload.put("start_time", TimeUtil.formatTime(classStart));
            payload.put("duration", durationMinutes);
            payload.put("corpus", corpus);

            log.info("Sending to C++: {}", payload);
            JsonNode cppResponse = cppTcpClient.send(payload);
            log.info("C++ response: {}", cppResponse);

            int cabinetNumber = cppResponse.has("cabinet") ? cppResponse.get("cabinet").asInt(0) : 0;
            String status = cppResponse.has("status") ? cppResponse.get("status").asText("") : "";

            if (cabinetNumber > 0 && "answer".equals(status)) {
                RoomInfo room = RoomInfo.builder()
                        .name(String.valueOf(cabinetNumber))
                        .locationName(corpus)
                        .locationId(request.getLocationId())
                        .floor(cabinetNumber / 100)
                        .cameraFree(true)
                        .cameraStatus("РЎРѓР Р†Р С•Р В±Р С•Р Т‘Р ВµР Р… (Р С”Р В°Р СР ВµРЎР‚Р В°)")
                        .scheduleFree(true)
                        .availableFrom(TimeUtil.formatTime(classStart))
                        .availableUntil(TimeUtil.formatTime(classStart.plusMinutes(durationMinutes)))
                        .build();

                return FindRoomResponse.builder()
                        .freeRooms(List.of(room))
                        .alternatives(Collections.emptyList())
                        .reason(null)
                        .build();
            }

            return FindRoomResponse.builder()
                    .freeRooms(Collections.emptyList())
                    .alternatives(Collections.emptyList())
                    .reason("C++ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚ Р Р…Р Вµ Р Р…Р В°РЎв‚¬РЎвЂР В» РЎРѓР Р†Р С•Р В±Р С•Р Т‘Р Р…РЎвЂ№Р в„– Р С”Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљ Р Р…Р В° " + TimeUtil.formatTime(classStart))
                    .build();

        } catch (Exception e) {
            log.error("C++ request failed: {}", e.getMessage(), e);
            return FindRoomResponse.builder()
                    .freeRooms(Collections.emptyList())
                    .alternatives(Collections.emptyList())
                    .reason("Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С—РЎР‚Р С‘ Р В·Р В°Р С—РЎР‚Р С•РЎРѓР Вµ Р С” C++ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚РЎС“: " + e.getMessage())
                    .build();
        }
    }

    private String resolveCorpus(String locationId) {
        if (locationId == null) return "Р вЂњР В»Р В°Р Р†Р Р…РЎвЂ№Р в„–";
        String corpus = LOCATION_TO_CORPUS.get(locationId.toLowerCase());
        return corpus != null ? corpus : locationId;
    }

    @Transactional
    public Map<String, Object> cancelBooking(CancelBookingRequest request) {
        log.info("cancelBooking: user={}, auditory={}, corpus={}, time={}-{}",
                request.getTelegramUserId(), request.getAuditoryName(),
                request.getCorpus(), request.getStartTime(), request.getEndTime());

        Map<String, Object> result = new LinkedHashMap<>();

        try {
            String auditoryName = request.getAuditoryName();
            if (auditoryName == null || auditoryName.isBlank()) {
                result.put("status", "error");
                result.put("message", "Р СњР Вµ РЎС“Р С”Р В°Р В·Р В°Р Р…Р С• Р С‘Р СРЎРЏ Р В°РЎС“Р Т‘Р С‘РЎвЂљР С•РЎР‚Р С‘Р С‘.");
                return result;
            }
            Optional<Auditory> auditoryOpt = auditoryRepository.findByName(auditoryName);

            if (auditoryOpt.isEmpty()) {
                String corpus = request.getCorpus();
                if (corpus != null && !corpus.isBlank()) {
                    String fullName = corpus + "-" + auditoryName;
                    auditoryOpt = auditoryRepository.findByName(fullName);
                }
            }

            if (auditoryOpt.isEmpty()) {
                log.warn("cancelBooking: auditory not found: {}", auditoryName);
                result.put("status", "not_found");
                result.put("message", "Р С’РЎС“Р Т‘Р С‘РЎвЂљР С•РЎР‚Р С‘РЎРЏ " + auditoryName + " Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В° Р Р† Р В±Р В°Р В·Р Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦.");
                result.put("deleted_count", 0);
                return result;
            }

            Auditory auditory = auditoryOpt.get();
            LocalTime start = LocalTime.parse(request.getStartTime());
            LocalTime end = LocalTime.parse(request.getEndTime());
            int dayOfWeek = TimeUtil.currentDayOfWeek();
            log.info("Found auditory: id={}, name={}", auditory.id(), auditory.name());
            int deleted = auditoryJournalRepository.deleteById(auditory.id());
            log.info("DELETE WHERE audId={}, day={}, start={}, end={}", auditory.id(), dayOfWeek, start, end);
            if (deleted > 0) {
                log.info("cancelBooking: deleted {} record(s) for auditory {} (id={}), day={}, {}-{}",
                        deleted, auditory.name(), auditory.id(), dayOfWeek, start, end);
                result.put("status", "ok");
                result.put("message", "Р вЂРЎР‚Р С•Р Р…РЎРЉ Р В°РЎС“Р Т‘Р С‘РЎвЂљР С•РЎР‚Р С‘Р С‘ " + auditory.name() + " РЎС“РЎРѓР С—Р ВµРЎв‚¬Р Р…Р С• Р С•РЎвЂљР СР ВµР Р…Р ВµР Р…Р В°.");
                result.put("deleted_count", deleted);
            } else {
                log.info("cancelBooking: no matching records for auditory {} (id={}), day={}, {}-{}",
                        auditory.name(), auditory.id(), dayOfWeek, start, end);
                result.put("status", "not_found");
                result.put("message", "Р вЂ”Р В°Р С—Р С‘РЎРѓРЎРЉ Р С• Р В±РЎР‚Р С•Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р С‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В° Р Р† Р В¶РЎС“РЎР‚Р Р…Р В°Р В»Р Вµ.");
                result.put("deleted_count", 0);
            }

            return result;

        } catch (Exception e) {
            log.error("cancelBooking failed: {}", e.getMessage(), e);
            result.put("status", "error");
            result.put("message", "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С—РЎР‚Р С‘ Р С•РЎвЂљР СР ВµР Р…Р Вµ: " + e.getMessage());
            result.put("deleted_count", 0);
            return result;
        }
    }
}

