package com.schedule.server.tcp;

import kvt.model.Subject;
import kvt.db.SubjectRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.OutputStream;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@Slf4j
public class SubjectTcpSender {
    private final SubjectRepository subjectRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public SubjectTcpSender(SubjectRepository subjectRepository) {
        this.subjectRepository = subjectRepository;
    }

    public void sendSubjects(String ip, int port) {
        List<Subject> subjects = subjectRepository.findAll();
        try (Socket socket = new Socket(ip, port)) {
            OutputStream os = socket.getOutputStream();
            String json = mapper.writeValueAsString(subjects);
            os.write(json.getBytes(StandardCharsets.UTF_8));
            os.flush();
        } catch (Exception e) {
            log.error("Failed to send subjects to {}:{} РІР‚вЂќ {}", ip, port, e.getMessage(), e);
        }
    }
}

