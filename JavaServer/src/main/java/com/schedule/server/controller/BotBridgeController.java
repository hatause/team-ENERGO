package com.schedule.server.controller;

import com.schedule.server.dto.CancelBookingRequest;
import com.schedule.server.dto.FindRoomRequest;
import com.schedule.server.dto.FindRoomResponse;
import com.schedule.server.service.BotBridgeService;
import com.schedule.server.tcp.CppTcpClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class BotBridgeController {

    private final CppTcpClient cppTcpClient;
    private final BotBridgeService botBridgeService;

    @PostMapping("/bridge")
    public ResponseEntity<?> bridge(@RequestBody FindRoomRequest request) {
        try {
            log.info("Bridge request: location_id={}, date={}, start_at={}, duration={}, floor={}, user={}",
                    request.getLocationId(), request.getDate(), request.getStartAt(),
                    request.getDurationMinutes(), request.getFloor(),
                    request.getTelegramUserId());

            FindRoomResponse response = botBridgeService.findRooms(request);

            log.info("Bridge response: {} free rooms, {} alternatives",
                    response.getFreeRooms() != null ? response.getFreeRooms().size() : 0,
                    response.getAlternatives() != null ? response.getAlternatives().size() : 0);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Bridge bad request: {}", e.getMessage());

            Map<String, String> errorBody = new LinkedHashMap<>();
            errorBody.put("status", "error");
            errorBody.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorBody);

        } catch (Exception e) {
            log.error("Bridge error: {}", e.getMessage(), e);

            Map<String, String> errorBody = new LinkedHashMap<>();
            errorBody.put("status", "error");
            errorBody.put("message", e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody);
        }
    }

    @GetMapping("/bridge")
    public ResponseEntity<Map<String, Object>> bridgeHealth() {
        log.info("Health check: GET /api/bridge");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("service", "schedule-server");
        body.put("cppServer", cppTcpClient != null ? "configured" : "not configured");
        body.put("pendingCppRequests", cppTcpClient.getPendingCount());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/bridge/cancel")
    public ResponseEntity<Map<String, Object>> cancelBooking(@RequestBody CancelBookingRequest request) {
        try {
            log.info("Cancel booking request: user={}, auditory={}, corpus={}, time={}-{}",
                    request.getTelegramUserId(), request.getAuditoryName(),
                    request.getCorpus(), request.getStartTime(), request.getEndTime());

            Map<String, Object> result = botBridgeService.cancelBooking(request);
            String status = String.valueOf(result.getOrDefault("status", "error"));

            if ("ok".equals(status)) {
                return ResponseEntity.ok(result);
            } else if ("not_found".equals(status)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }

        } catch (Exception e) {
            log.error("Cancel booking error: {}", e.getMessage(), e);

            Map<String, Object> errorBody = new LinkedHashMap<>();
            errorBody.put("status", "error");
            errorBody.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody);
        }
    }

}

