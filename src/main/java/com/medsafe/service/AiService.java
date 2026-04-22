package com.medsafe.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Calls NVIDIA NIM (OpenAI-compatible) for drug-interaction explanations and Q&A. */
@Service
public class AiService {

    @Value("${ai.api.key}")
    private String apiKey;

    @Value("${ai.api.url:https://integrate.api.nvidia.com/v1/chat/completions}")
    private String apiUrl;

    @Value("${ai.api.model:meta/llama-3.1-8b-instruct}")
    private String model;

    private final RestTemplate restTemplate;

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public AiService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15_000);
        factory.setReadTimeout(30_000);
        restTemplate = new RestTemplate(factory);
    }



    /**
     * Explain a drug interaction in plain language (English + Hindi).
     * Results are cached by the sorted drug pair.
     */
    public String explainInteraction(String drugA, String drugB, String clinicalWarning) {
        String[] pair = drugA.compareTo(drugB) < 0
                ? new String[]{drugA, drugB}
                : new String[]{drugB, drugA};
        String cacheKey = (pair[0] + "_" + pair[1]).toLowerCase();

        if (cache.containsKey(cacheKey)) {
            return cache.get(cacheKey);
        }

        String prompt = String.format(
                "You are a friendly medical AI assistant for patients in India. "
                + "Explain the FDA drug interaction between %s and %s in simple, "
                + "plain language that a non-medical person can understand. "
                + "Keep it very short (3-4 sentences). "
                + "First give the English explanation, then a brief Hindi translation. "
                + "FDA data: %s",
                drugA, drugB, clinicalWarning);

        String result = callNvidiaApi(prompt, 300);
        if (result != null) {
            cache.put(cacheKey, result);
            return result;
        }
        return "Unable to generate AI explanation. Please consult a doctor or pharmacist.";
    }

    /**
     * Answer a general medicine/health question.
     * maxTokens enforced at 400 to limit API usage.
     */
    public String askQuestion(String question) {
        // Basic sanitisation / length cap
        if (question == null || question.isBlank()) {
            return "Please ask a valid question.";
        }
        if (question.length() > 500) {
            question = question.substring(0, 500);
        }

        String prompt = String.format(
                "You are MedSafe AI, a helpful medical assistant focused on patients in India. "
                + "Reply in a friendly, concise way (max 4 sentences). "
                + "Always add: 'I am an AI, not a doctor — please consult a qualified healthcare professional.' "
                + "Keep Indian brand names and context in mind. "
                + "Question: %s",
                question);

        String result = callNvidiaApi(prompt, 400);
        return result != null
                ? result
                : "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
    }

    // -- private helpers --

    /**
     * Calls NVIDIA NIM API (OpenAI-compatible chat/completions endpoint).
     */
    @SuppressWarnings({"unchecked", "rawtypes"})
    private String callNvidiaApi(String prompt, int maxOutputTokens) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            // Build OpenAI-compatible request body
            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("messages", List.of(message));
            body.put("max_tokens", maxOutputTokens);
            body.put("temperature", 0.5);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, request, Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices =
                        (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, Object> responseMessage = (Map<String, Object>) choice.get("message");
                    if (responseMessage != null) {
                        return (String) responseMessage.get("content");
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("NVIDIA API error: " + e.getMessage());
        }
        return null;
    }
}
