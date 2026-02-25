package com.schedule.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomInfo {

    private String name;

    @JsonProperty("location_name")
    private String locationName;

    @JsonProperty("location_id")
    private String locationId;

    private Integer floor;

    private Integer capacity;

    @JsonProperty("schedule_free")
    private Boolean scheduleFree;

    @JsonProperty("camera_free")
    private Boolean cameraFree;

    @JsonProperty("camera_status")
    private String cameraStatus;

    @JsonProperty("auditory_id")
    private Integer auditoryId;

    @JsonProperty("available_from")
    private String availableFrom;

    @JsonProperty("available_until")
    private String availableUntil;
}

