package com.schedule.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindRoomResponse {

    @JsonProperty("free_rooms")
    private List<RoomInfo> freeRooms;

    private List<RoomInfo> alternatives;

    private String reason;
}

