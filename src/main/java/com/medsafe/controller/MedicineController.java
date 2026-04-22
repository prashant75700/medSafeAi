package com.medsafe.controller;

import com.medsafe.dto.MedicineRequest;
import com.medsafe.dto.MessageResponse;
import com.medsafe.model.Medicine;
import com.medsafe.security.UserDetailsImpl;
import com.medsafe.service.MedicineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
public class MedicineController {

    @Autowired
    private MedicineService medicineService;

    @PostMapping
    public ResponseEntity<Medicine> addMedicine(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody MedicineRequest request) {
        Medicine medicine = medicineService.addMedicine(userDetails.getId(), request);
        return ResponseEntity.ok(medicine);
    }

    @GetMapping
    public ResponseEntity<List<Medicine>> getMedicines(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<Medicine> medicines = medicineService.getMedicines(userDetails.getId());
        return ResponseEntity.ok(medicines);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Medicine> updateMedicine(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id,
            @RequestBody MedicineRequest request) {
        Medicine medicine = medicineService.updateMedicine(userDetails.getId(), id, request);
        return ResponseEntity.ok(medicine);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteMedicine(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id) {
        medicineService.deleteMedicine(userDetails.getId(), id);
        return ResponseEntity.ok(new MessageResponse("Medicine deleted successfully!"));
    }
}
