package com.medsafe.service;

import com.medsafe.dto.OpenFdaResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OpenFdaServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private OpenFdaService openFdaService;

    @BeforeEach
    void setUp() {
        // OpenFdaService might normally inject RestTemplate, make sure it matches constructor
    }

    @Test
    void getDrugInteractions_ShouldReturnConcatenatedWarnings() {
        // Create Mock Response
        OpenFdaResponse.Result result = new OpenFdaResponse.Result();
        result.setDrug_interactions(List.of("Warning: Avoid using with Warfarin.", "May increase sedation."));
        
        OpenFdaResponse mockResponse = new OpenFdaResponse();
        mockResponse.setResults(List.of(result));

        when(restTemplate.getForObject(anyString(), eq(OpenFdaResponse.class)))
                .thenReturn(mockResponse);

        OpenFdaResponse response = openFdaService.getInteractionWarnings("Aspirin");

        assertNotNull(response);
        String interactionsText = String.join(" ", response.getResults().get(0).getDrug_interactions());
        assertTrue(interactionsText.contains("Warning: Avoid using with Warfarin."));
    }

    @Test
    void getDrugInteractions_ShouldHandleNullResponse() {
        when(restTemplate.getForObject(anyString(), eq(OpenFdaResponse.class)))
                .thenReturn(null);

        OpenFdaResponse response = openFdaService.getInteractionWarnings("UnknownDrug");

        assertNull(response);
    }
}
