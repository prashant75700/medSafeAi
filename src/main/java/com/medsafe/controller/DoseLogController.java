package com.medsafe.controller;

import com.medsafe.dto.DoseLogRequest;
import com.medsafe.dto.MessageResponse;
import com.medsafe.model.DoseLog;
import com.medsafe.model.FamilyMember;
import com.medsafe.model.Medicine;
import com.medsafe.model.User;
import com.medsafe.repository.DoseLogRepository;
import com.medsafe.repository.FamilyMemberRepository;
import com.medsafe.repository.MedicineRepository;
import com.medsafe.repository.UserRepository;
import com.medsafe.security.UserDetailsImpl;
import com.medsafe.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/doses")
@RequiredArgsConstructor
public class DoseLogController {

    private final DoseLogRepository doseLogRepository;
    private final MedicineRepository medicineRepository;
    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final EmailService emailService;

    /**
     * POST /api/doses/taken
     * Mark a medicine dose as taken.
     */
    @PostMapping("/taken")
    public ResponseEntity<?> markDoseTaken(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody DoseLogRequest request) {

        Long userId = userDetails.getId();

        Optional<DoseLog> pendingLog = doseLogRepository
                .findByUserIdAndStatus(userId, "PENDING")
                .stream()
                .filter(log -> log.getMedicineId().equals(request.getMedicineId()))
                .findFirst();

        if (pendingLog.isPresent()) {
            DoseLog log = pendingLog.get();
            log.setStatus("TAKEN");
            log.setLoggedAt(LocalDateTime.now());
            doseLogRepository.save(log);
            return ResponseEntity.ok(new MessageResponse("Dose marked as TAKEN. Great job! 💊"));
        }

        Medicine medicine = medicineRepository.findById(request.getMedicineId())
                .orElseThrow(() -> new RuntimeException("Medicine not found"));

        DoseLog log = new DoseLog();
        log.setUserId(userId);
        log.setMedicineId(medicine.getId());
        log.setMedicineName(medicine.getBrandName());
        log.setScheduledTime(LocalDateTime.now());
        log.setStatus("TAKEN");
        doseLogRepository.save(log);

        return ResponseEntity.ok(new MessageResponse("Dose manually logged as TAKEN."));
    }

    /**
     * POST /api/doses/missed
     * Mark a dose as missed and optionally trigger a caregiver alert.
     */
    @PostMapping("/missed")
    public ResponseEntity<?> markDoseMissed(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody DoseLogRequest request) {

        Long userId = userDetails.getId();

        Optional<DoseLog> pendingLog = doseLogRepository
                .findByUserIdAndStatus(userId, "PENDING")
                .stream()
                .filter(log -> log.getMedicineId().equals(request.getMedicineId()))
                .findFirst();

        DoseLog missedLog;

        if (pendingLog.isPresent()) {
            missedLog = pendingLog.get();
            missedLog.setStatus("MISSED");
            missedLog.setLoggedAt(LocalDateTime.now());
        } else {
            Medicine medicine = medicineRepository.findById(request.getMedicineId())
                    .orElseThrow(() -> new RuntimeException("Medicine not found"));

            missedLog = new DoseLog();
            missedLog.setUserId(userId);
            missedLog.setMedicineId(medicine.getId());
            missedLog.setMedicineName(medicine.getBrandName());
            missedLog.setScheduledTime(LocalDateTime.now());
            missedLog.setStatus("MISSED");
        }

        doseLogRepository.save(missedLog);

        if (request.getCaregiverFamilyMemberId() != null) {
            triggerCaregiverAlert(userId, missedLog, request.getCaregiverFamilyMemberId());
        }

        return ResponseEntity.ok(new MessageResponse("Dose marked as MISSED."));
    }

    /**
     * GET /api/doses/history
     */
    @GetMapping("/history")
    public ResponseEntity<List<DoseLog>> getDoseHistory(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<DoseLog> history = doseLogRepository
                .findByUserIdOrderByScheduledTimeDesc(userDetails.getId());
        return ResponseEntity.ok(history);
    }

    // -- private helpers --
    private void triggerCaregiverAlert(Long userId, DoseLog missedLog, Long caregiverFamilyMemberId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            Optional<FamilyMember> caregiverOpt = familyMemberRepository.findById(caregiverFamilyMemberId);

            if (userOpt.isEmpty() || caregiverOpt.isEmpty())
                return;
            FamilyMember caregiver = caregiverOpt.get();
            if (caregiver.getEmail() == null || caregiver.getEmail().isBlank())
                return;

            User accountHolder = userOpt.get();

            // -- Determine the actual PATIENT name --
            // The patient is the person whose medicine was missed.
            // If the medicine is assigned to a specific family member, that's the patient.
            // Otherwise, it's the account holder.
            String patientName = accountHolder.getName();
            String dosage = "Not specified";

            Optional<Medicine> medicineOpt = medicineRepository.findById(missedLog.getMedicineId());
            if (medicineOpt.isPresent()) {
                Medicine med = medicineOpt.get();

                // Use the medicine's dosage (includes unit like "500mg")
                if (med.getDosage() != null && !med.getDosage().isBlank()) {
                    dosage = med.getDosage();
                }

                // If this medicine belongs to a family member, that member IS the patient
                if (med.getFamilyMemberId() != null) {
                    Optional<FamilyMember> patientMemberOpt = familyMemberRepository.findById(med.getFamilyMemberId());
                    if (patientMemberOpt.isPresent()) {
                        patientName = patientMemberOpt.get().getName();
                    }
                }
            }

            // Use caregiverName for email greeting; fall back to family member name
            String caregiverDisplayName = (caregiver.getCaregiverName() != null
                    && !caregiver.getCaregiverName().isBlank())
                            ? caregiver.getCaregiverName()
                            : caregiver.getName();

            emailService.sendCaregiverAlert(
                    caregiver.getEmail(),
                    caregiverDisplayName,
                    patientName,
                    missedLog.getMedicineName(),
                    dosage,
                    missedLog.getScheduledTime()
                            .format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm")));
        } catch (Exception e) {
            // Don't crash the request if email fails
        }
    }
}
