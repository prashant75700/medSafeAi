package com.medsafe.service;

import com.medsafe.dto.OpenFdaResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class OpenFdaService {

    private final RestTemplate restTemplate;
    private static final String FDA_API_URL = "https://api.fda.gov/drug/label.json";

    // Rely on Spring (and Mockito) to inject the RestTemplate
    public OpenFdaService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public OpenFdaResponse getInteractionWarnings(String drugName) {
        try {
            String genericUrl = UriComponentsBuilder.fromHttpUrl(FDA_API_URL)
                    .queryParam("search", "openfda.generic_name:\"" + drugName + "\"")
                    .queryParam("limit", 1)
                    .build().toUriString();

            return restTemplate.getForObject(genericUrl, OpenFdaResponse.class);
        } catch (Exception e) {
            try {
                String brandUrl = UriComponentsBuilder.fromHttpUrl(FDA_API_URL)
                        .queryParam("search", "openfda.brand_name:\"" + drugName + "\"")
                        .queryParam("limit", 1)
                        .build().toUriString();
                return restTemplate.getForObject(brandUrl, OpenFdaResponse.class);
            } catch (Exception ex) {
                return null;
            }
        }
    }
}
