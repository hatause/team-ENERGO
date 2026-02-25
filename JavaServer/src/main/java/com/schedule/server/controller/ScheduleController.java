package com.schedule.server.controller;

import com.schedule.server.dto.ScheduleFileDto;
import kvt.model.Subject;
import com.schedule.server.service.ScheduleService;
import com.schedule.server.service.SubjectService;
import com.schedule.server.tcp.SubjectTcpSender;
import kvt.model.Auditory;
import kvt.model.AuditoryJournal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
@Slf4j
public class ScheduleController {

    private final ScheduleService scheduleService;
    private final SubjectService subjectService;
    private final SubjectTcpSender subjectTcpSender;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadSchedule(@RequestBody ScheduleFileDto dto) {
        log.info("Received schedule upload: {}", dto.getFileName());

        Map<String, Object> saveResult = scheduleService.saveSchedule(dto);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("message", "Р В Р В°РЎРѓР С—Р С‘РЎРѓР В°Р Р…Р С‘Р Вµ РЎС“РЎРѓР С—Р ВµРЎв‚¬Р Р…Р С• Р С•Р В±РЎР‚Р В°Р В±Р С•РЎвЂљР В°Р Р…Р С•");
        response.putAll(saveResult);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/auditories")
    public ResponseEntity<List<Map<String, Object>>> getAllAuditories() {
        List<Auditory> auditories = scheduleService.getAllAuditories();

        List<Map<String, Object>> result = auditories.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.id());
            m.put("name", a.name());
            m.put("number", a.number());
            m.put("corpus", a.corpus());
            m.put("category", a.category());
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/journal")
    public ResponseEntity<List<Map<String, Object>>> getAllJournal() {
        List<AuditoryJournal> journal = scheduleService.getAllJournal();
        List<Map<String, Object>> result = journal.stream().map(this::mapJournalToResponse).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/journal/{audId}")
    public ResponseEntity<List<Map<String, Object>>> getJournalByAuditory(@PathVariable int audId) {
        List<AuditoryJournal> journal = scheduleService.getJournalByAuditoryId(audId);
        List<Map<String, Object>> result = journal.stream().map(this::mapJournalToResponse).toList();
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> mapJournalToResponse(AuditoryJournal j) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", j.id());
        m.put("audId", j.audId());
        m.put("dayOfWeek", j.dayOfWeek());
        m.put("startTime", j.startTime());
        m.put("endTime", j.endTime());
        m.put("duration", j.duration());
        m.put("timeStatus", j.timeStatus());
        return m;
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<Map<String, Object>>> getAllSubjects() {
        List<Subject> subjects = subjectService.getAllSubjects();

        List<Map<String, Object>> result = subjects.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getIdSub());
            m.put("subName", s.getSubName());
            m.put("teacherName", s.getTeacherName());
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/subjects/push")
    public ResponseEntity<Map<String, Object>> pushSubjects(@RequestParam String ip, @RequestParam int port) {
        subjectTcpSender.sendSubjects(ip, port);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("status", "sent");
        resp.put("ip", ip);
        resp.put("port", port);
        return ResponseEntity.ok(resp);
    }
}

