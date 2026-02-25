package com.schedule.server.tcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.json.simple.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Slf4j
public class CppTcpClient {

    private final String host;
    private final int port;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ExecutorService queue = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "cpp-tcp-queue");
        t.setDaemon(true);
        return t;
    });

    private final AtomicInteger pendingCount = new AtomicInteger(0);

    private static final long TOTAL_TIMEOUT_SECONDS = 30;

    public CppTcpClient(
            @Value("${cpp.server.host}") String host,
            @Value("${cpp.server.port}") int port) {
        this.host = host;
        this.port = port;
    }

    public JsonNode send(Map<String, Object> requestPayload) {
        int position = pendingCount.incrementAndGet();
        log.info("Enqueued C++ request: payload={}, queuePosition={}", requestPayload, position);

        Future<JsonNode> future = queue.submit(() -> {
            try {
                return doSend(requestPayload);
            } finally {
                pendingCount.decrementAndGet();
            }
        });

        try {
            return future.get(TOTAL_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new RuntimeException(
                    "Р СћР В°Р в„–Р СР В°РЎС“РЎвЂљ Р С•Р В¶Р С‘Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С•РЎвЂљР Р†Р ВµРЎвЂљР В° Р С•РЎвЂљ C++ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚Р В° (Р С•РЎвЂЎР ВµРЎР‚Р ВµР Т‘РЎРЉ + РЎРѓР С•Р ВµР Т‘Р С‘Р Р…Р ВµР Р…Р С‘Р Вµ > "
                            + TOTAL_TIMEOUT_SECONDS + " РЎРѓР ВµР С”)", e);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof RuntimeException re) throw re;
            throw new RuntimeException("Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С—РЎР‚Р С‘ Р В·Р В°Р С—РЎР‚Р С•РЎРѓР Вµ Р С” C++ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚РЎС“: " + cause.getMessage(), cause);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Р вЂ”Р В°Р С—РЎР‚Р С•РЎРѓ Р С” C++ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚РЎС“ Р С—РЎР‚Р ВµРЎР‚Р Р†Р В°Р Р…", e);
        }
    }

    public int getPendingCount() {
        return pendingCount.get();
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down C++ TCP queue, pending={}", pendingCount.get());
        queue.shutdown();
        try {
            if (!queue.awaitTermination(10, TimeUnit.SECONDS)) {
                queue.shutdownNow();
                log.warn("C++ TCP queue did not terminate in time, forced shutdown");
            }
        } catch (InterruptedException e) {
            queue.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    @SuppressWarnings("unchecked")
    private JsonNode doSend(Map<String, Object> payload) {
        log.info("Sending to C++ server {}:{} РІР‚вЂќ payload={}", host, port, payload);
        JSONObject request = new JSONObject();
        request.putAll(payload);

        byte[] jsonBytes = request.toJSONString().getBytes(StandardCharsets.UTF_8);

        try (Socket socket = new Socket(host, port)) {
            socket.setSoTimeout(10_000); // 10 РЎРѓР ВµР С”РЎС“Р Р…Р Т‘ РЎвЂљР В°Р в„–Р СР В°РЎС“РЎвЂљ Р Р…Р В° РЎвЂЎРЎвЂљР ВµР Р…Р С‘Р Вµ

            DataOutputStream out = new DataOutputStream(
                    new BufferedOutputStream(socket.getOutputStream()));
            out.writeInt(jsonBytes.length);
            out.write(jsonBytes);
            out.flush();
            log.debug("Sent {} bytes to C++ server: {}", jsonBytes.length, request.toJSONString());

            String responseJson = readResponse(socket);
            log.debug("Received from C++ server: {}", responseJson);

            try {
                return objectMapper.readTree(responseJson);
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                log.warn("Invalid JSON received from C++ server: {}", e.getMessage());
                return objectMapper.createObjectNode();
            }

        } catch (IOException e) {
            throw new RuntimeException("Р С›РЎв‚¬Р С‘Р В±Р С”Р В° TCP-РЎРѓР С•Р ВµР Т‘Р С‘Р Р…Р ВµР Р…Р С‘РЎРЏ РЎРѓ C++ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚Р С•Р С: " + e.getMessage(), e);
        }
    }

    private static String readResponse(Socket socket) throws IOException {
        DataInputStream in = new DataInputStream(
                new BufferedInputStream(socket.getInputStream()));
        int responseLength = in.readInt();
        if (responseLength <= 0 || responseLength > 1_000_000) {
            throw new IOException("Р СњР ВµР С”Р С•РЎР‚РЎР‚Р ВµР С”РЎвЂљР Р…Р В°РЎРЏ Р Т‘Р В»Р С‘Р Р…Р В° Р С•РЎвЂљР Р†Р ВµРЎвЂљР В° Р С•РЎвЂљ C++ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚Р В°: " + responseLength);
        }

        byte[] responseBytes = new byte[responseLength];
        in.readFully(responseBytes);
        return new String(responseBytes, StandardCharsets.UTF_8);
    }
}

