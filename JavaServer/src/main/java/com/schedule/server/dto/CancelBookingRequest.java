package com.schedule.server.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CancelBookingRequest {

    @JsonProperty("telegram_user_id")
    private Long telegramUserId;

    @JsonProperty("auditory_name")
    private String auditoryName;

    @JsonProperty("corpus")
    private String corpus;

    @JsonProperty("start_time")
    private String startTime;

    @JsonProperty("end_time")
    private String endTime;
}

