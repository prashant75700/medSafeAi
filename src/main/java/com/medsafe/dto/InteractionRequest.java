package com.medsafe.dto;

import lombok.Data;
import java.util.List;

@Data
public class InteractionRequest {
    private List<String> drugs;
}
