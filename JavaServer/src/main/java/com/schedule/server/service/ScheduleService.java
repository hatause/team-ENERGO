package com.schedule.server.service;

import com.schedule.server.dto.ScheduleFileDto;
import kvt.db.AuditoryRepository;
import kvt.db.AuditoryJournalRepository;
import kvt.model.Auditory;
import kvt.model.AuditoryJournal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleService {
    private final AuditoryRepository auditoryRepository;
    private final AuditoryJournalRepository auditoryJournalRepository;
    private final SubjectService subjectService;

    @Transactional
    public Map<String, Object> saveSchedule(ScheduleFileDto dto) {
        log.info("Saving schedule from file: {}", dto.getFileName());

        int auditoriesAdded = 0;
        int journalEntriesAdded = 0;
        int rowsSkipped = 0;

        List<List<String>> rows = dto.getRows();
        if (rows == null || rows.size() < 2) {
            log.warn("No data rows in schedule file: {}", dto.getFileName());
        } else {
            List<String> header = rows.get(0);
            int colDay = findColumnIndex(header, "Р Т‘Р ВµР Р…РЎРЉ");
            int colTime = findColumnIndex(header, "Р Р†РЎР‚Р ВµР СРЎРЏ");
            int colSubject = findColumnIndex(header, "Р С—РЎР‚Р ВµР Т‘Р СР ВµРЎвЂљ");
            int colTeacher = findColumnIndex(header, "Р С—РЎР‚Р ВµР С—Р С•Р Т‘Р В°Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ");
            int colRoom = findColumnIndex(header, "Р С”Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљ");

            log.info("Header columns detected: day={}, time={}, subject={}, teacher={}, room={}",
                    colDay, colTime, colSubject, colTeacher, colRoom);

            if (colDay < 0 || colTime < 0 || colRoom < 0) {
                log.error("Missing required columns (Р вЂќР ВµР Р…РЎРЉ/Р вЂ™РЎР‚Р ВµР СРЎРЏ/Р С™Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљ) in header: {}", header);
            } else {
                Map<String, Auditory> auditoryCache = new HashMap<>();
                for (Auditory a : auditoryRepository.findAll()) {
                    auditoryCache.put(a.name(), a);
                }
                for (int i = 1; i < rows.size(); i++) {
                    List<String> row = rows.get(i);
                    String dayStr = safeGet(row, colDay);
                    String timeStr = safeGet(row, colTime);
                    String roomStr = safeGet(row, colRoom);

                    if (dayStr == null || dayStr.isBlank()) {
                        log.debug("Row {} skipped: empty day", i);
                        rowsSkipped++;
                        continue;
                    }
                    if (roomStr == null || roomStr.isBlank()) {
                        log.debug("Row {} skipped: empty room", i);
                        rowsSkipped++;
                        continue;
                    }

                    int dayOfWeek = parseDayOfWeek(dayStr);
                    if (dayOfWeek == 0) {
                        log.debug("Row {} skipped: unknown day '{}'", i, dayStr);
                        rowsSkipped++;
                        continue;
                    }

                    String roomName = roomStr.trim();
                    String corpus = extractCorpus(roomName);
                    Auditory auditory = auditoryCache.get(roomName);
                    if (auditory == null) {
                        Integer roomNumber = extractNumber(roomName);
                        Auditory toInsert = new Auditory(0, roomName, roomNumber, corpus, null);
                        int generatedId = auditoryRepository.insert(toInsert);
                        auditory = new Auditory(generatedId, roomName, roomNumber, corpus, null);
                        auditoryCache.put(roomName, auditory);
                        auditoriesAdded++;
                        log.debug("Created auditory: id={}, name={}, corpus={}", generatedId, roomName, corpus);
                    }
                    String subjectName = colSubject >= 0 ? safeGet(row, colSubject) : null;
                    String teacherName = colTeacher >= 0 ? safeGet(row, colTeacher) : null;
                    if (subjectName != null && !subjectName.isBlank()) {
                        try {
                            subjectService.addOrUpdateSubject(subjectName.trim(), teacherName == null ? null : teacherName.trim());
                        } catch (Exception e) {
                            log.warn("Failed to save subject '{}' teacher='{}' : {}", subjectName, teacherName, e.getMessage());
                        }
                    }
                    LocalTime[] times = parseTime(timeStr);
                    if (times != null) {
                        int duration = (int) Duration.between(times[0], times[1]).toMinutes();
                        AuditoryJournal journal = new AuditoryJournal(
                                0,
                                auditory.id(),
                                dayOfWeek,
                                times[0],
                                times[1],
                                duration,
                                1  // timeStatus = 1 (Р В°Р С”РЎвЂљР С‘Р Р†Р Р…Р С•)
                        );
                        auditoryJournalRepository.insert(journal);
                        journalEntriesAdded++;
                    } else {
                        log.warn("Row {} skipped time: could not parse '{}'", i, timeStr);
                    }
                }
            }
        }

        log.info("Schedule saved: {} auditories added, {} journal entries added, {} rows skipped",
                auditoriesAdded, journalEntriesAdded, rowsSkipped);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fileName", dto.getFileName());
        result.put("sheet", dto.getSheet());
        result.put("totalRows", rows != null ? rows.size() - 1 : 0);
        result.put("auditoriesAdded", auditoriesAdded);
        result.put("journalEntriesAdded", journalEntriesAdded);
        result.put("rowsSkipped", rowsSkipped);
        return result;
    }

    public List<Auditory> getAllAuditories() {
        return auditoryRepository.findAll();
    }

    public List<AuditoryJournal> getJournalByAuditoryId(int audId) {
        return auditoryJournalRepository.findByAudId(audId);
    }

    public List<AuditoryJournal> getAllJournal() {
        return auditoryJournalRepository.findAll();
    }

    private int findColumnIndex(List<String> header, String keyword) {
        for (int i = 0; i < header.size(); i++) {
            if (header.get(i) != null && header.get(i).toLowerCase().contains(keyword)) {
                return i;
            }
        }
        return -1;
    }

    private String safeGet(List<String> row, int index) {
        if (index < 0 || index >= row.size()) return null;
        return row.get(index);
    }

    private String extractCorpus(String roomName) {
        if (roomName == null || roomName.isBlank()) return null;
        Matcher m = CORPUS_PATTERN.matcher(roomName.trim());
        if (m.find()) {
            return m.group(1).toUpperCase();
        }
        Matcher m2 = CORPUS_ALT_PATTERN.matcher(roomName.trim());
        if (m2.find()) {
            return m2.group(1).toUpperCase();
        }
        return null;
    }

    private static final Pattern CORPUS_PATTERN =
            Pattern.compile("^([Р С’-Р Р‡Р В°-РЎРЏA-Za-z])\\s*[-РІР‚вЂњРІР‚вЂќ]");

    private static final Pattern CORPUS_ALT_PATTERN =
            Pattern.compile("(?:Р В»Р В°Р В±|Р С”Р С•РЎР‚Р С—РЎС“РЎРѓ)\\s+([Р С’-Р Р‡Р В°-РЎРЏA-Za-z])", Pattern.CASE_INSENSITIVE);

    private static final Pattern TIME_PATTERN =
            Pattern.compile("(\\d{1,2}[.:;]\\d{2})\\s*[-РІР‚вЂњРІР‚вЂќ]\\s*(\\d{1,2}[.:;]\\d{2})");

    private LocalTime[] parseTime(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) return null;
        Matcher m = TIME_PATTERN.matcher(timeStr.trim());
        if (!m.find()) return null;
        try {
            String startStr = m.group(1).replaceAll("[.;]", ":");
            String endStr = m.group(2).replaceAll("[.;]", ":");
            if (startStr.length() == 4) startStr = "0" + startStr;
            if (endStr.length() == 4) endStr = "0" + endStr;
            LocalTime start = LocalTime.parse(startStr);
            LocalTime end = LocalTime.parse(endStr);
            return new LocalTime[]{start, end};
        } catch (Exception e) {
            log.warn("Cannot parse time: {}", timeStr);
            return null;
        }
    }

    private int parseDayOfWeek(String day) {
        if (day == null) return 0;
        return switch (day.trim().toLowerCase()) {
            case "Р С—Р С•Р Р…Р ВµР Т‘Р ВµР В»РЎРЉР Р…Р С‘Р С”" -> 1;
            case "Р Р†РЎвЂљР С•РЎР‚Р Р…Р С‘Р С”" -> 2;
            case "РЎРѓРЎР‚Р ВµР Т‘Р В°" -> 3;
            case "РЎвЂЎР ВµРЎвЂљР Р†Р ВµРЎР‚Р С–" -> 4;
            case "Р С—РЎРЏРЎвЂљР Р…Р С‘РЎвЂ Р В°" -> 5;
            case "РЎРѓРЎС“Р В±Р В±Р С•РЎвЂљР В°" -> 6;
            case "Р Р†Р С•РЎРѓР С”РЎР‚Р ВµРЎРѓР ВµР Р…РЎРЉР Вµ" -> 7;
            default -> 0;
        };
    }

    private Integer extractNumber(String roomName) {
        if (roomName == null) return null;
        Matcher m = Pattern.compile("(\\d+)").matcher(roomName);
        return m.find() ? Integer.parseInt(m.group(1)) : null;
    }
}

