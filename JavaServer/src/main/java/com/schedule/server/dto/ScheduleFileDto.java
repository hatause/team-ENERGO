package com.schedule.server.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScheduleFileDto {

    @JsonProperty("fileName")
    private String fileName;

    @JsonProperty("sheet")
    private String sheet;

    @JsonProperty("rows")
    private List<List<String>> rows;
}

