package com.medsafe.controller;

import com.medsafe.dto.AiQuestionRequest;
import com.medsafe.dto.AiQuestionResponse;
import com.medsafe.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @PostMapping("/ask")
    public ResponseEntity<AiQuestionResponse> askQuestion(@RequestBody AiQuestionRequest request) {
        String answer = aiService.askQuestion(request.getQuestion());
        return ResponseEntity.ok(AiQuestionResponse.builder()
                .question(request.getQuestion())
                .answer(answer)
                .build());
    }
}
