package com.medsafe.dto;

import lombok.Data;
import java.util.List;

@Data
public class OpenFdaResponse {
    private Meta meta;
    private List<Result> results;

    @Data
    public static class Meta {
        private String disclaimer;
    }

    @Data
    public static class Result {
        private List<String> drug_interactions;
        private List<String> food_interactions;
    }
}
