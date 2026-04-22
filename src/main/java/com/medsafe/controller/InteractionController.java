package com.medsafe.controller;

import com.medsafe.dto.InteractionRequest;
import com.medsafe.dto.InteractionResult;
import com.medsafe.service.DrugInteractionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interactions")
public class InteractionController {

    @Autowired
    private DrugInteractionService drugInteractionService;

    @PostMapping("/check")
    public ResponseEntity<List<InteractionResult>> checkInteractions(@RequestBody InteractionRequest request) {
        List<InteractionResult> results = drugInteractionService.checkInteractions(request.getDrugs());
        return ResponseEntity.ok(results);
    }
}
