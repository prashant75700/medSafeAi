package com.medsafe.controller;

import com.medsafe.dto.FamilyMemberRequest;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/family")
public class FamilyMemberController {

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private DoseLogRepository doseLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @PostMapping
    public ResponseEntity<MessageResponse> addFamilyMember(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody FamilyMemberRequest request) {

        FamilyMember member = new FamilyMember();
        member.setUserId(userDetails.getId());
        member.setName(request.getName());
        member.setRelation(request.getRelation());
        member.setAge(request.getAge());
        member.setEmail(request.getEmail());
        member.setCaregiverName(request.getCaregiverName());
        member.setBloodGroup(request.getBloodGroup());
        member.setAllergies(request.getAllergies());
        member.setMedicalConditions(request.getMedicalConditions());
        familyMemberRepository.save(member);

        // Notify the caregiver by email when their email is first set
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            sendCaregiverWelcomeEmail(
                    userDetails.getId(),
                    request.getEmail(),
                    request.getCaregiverName(),
                    request.getName(),
                    request.getRelation() != null ? request.getRelation() : "Family Member"
            );
        }

        return ResponseEntity.ok(new MessageResponse("Family member added successfully!"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MessageResponse> updateFamilyMember(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id,
            @RequestBody FamilyMemberRequest request) {

        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Not found"));
        if (!member.getUserId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Unauthorized"));
        }

        // Detect email change
        String oldEmail = member.getEmail();

        member.setName(request.getName());
        member.setRelation(request.getRelation());
        member.setAge(request.getAge());
        member.setEmail(request.getEmail());
        member.setCaregiverName(request.getCaregiverName());
        member.setBloodGroup(request.getBloodGroup());
        member.setAllergies(request.getAllergies());
        member.setMedicalConditions(request.getMedicalConditions());
        familyMemberRepository.save(member);

        // Send welcome email only when the caregiver email is newly added or changed
        String newEmail = request.getEmail();
        boolean emailChanged = newEmail != null
                && !newEmail.isBlank()
                && !newEmail.equalsIgnoreCase(oldEmail);

        if (emailChanged) {
            sendCaregiverWelcomeEmail(
                    userDetails.getId(),
                    newEmail,
                    request.getCaregiverName(),
                    request.getName(),
                    request.getRelation() != null ? request.getRelation() : "Family Member"
            );
        }

        return ResponseEntity.ok(new MessageResponse("Family member updated!"));
    }

    @GetMapping
    public ResponseEntity<List<FamilyMember>> getFamilyMembers(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(familyMemberRepository.findByUserId(userDetails.getId()));
    }

    @GetMapping("/{id}/medicines")
    public ResponseEntity<List<Medicine>> getFamilyMedicines(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id) {
        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Not found"));
        if (!member.getUserId().equals(userDetails.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        return ResponseEntity.ok(medicineRepository.findByFamilyMemberId(id));
    }

    @GetMapping("/{id}/doses")
    public ResponseEntity<List<DoseLog>> getFamilyDoseLogs(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id) {
        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Not found"));

        String currentEmail = userDetails.getEmail();
        boolean isOwner     = member.getUserId().equals(userDetails.getId());
        boolean isCaregiver = member.getEmail() != null
                && member.getEmail().equalsIgnoreCase(currentEmail);

        if (!isOwner && !isCaregiver) {
            return ResponseEntity.status(403).build();
        }

        List<DoseLog> logs = doseLogRepository
                .findByUserIdOrderByScheduledTimeDesc(member.getUserId())
                .stream()
                .filter(l -> medicineRepository.findByFamilyMemberId(id)
                        .stream().anyMatch(m -> m.getId().equals(l.getMedicineId())))
                .toList();

        return ResponseEntity.ok(logs);
    }

    /** Returns family members where the current user is listed as caregiver. */
    @GetMapping("/caregiver/my-patients")
    public ResponseEntity<List<FamilyMember>> getMyPatients(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String email = userDetails.getEmail();
        List<FamilyMember> patients = familyMemberRepository.findAll().stream()
                .filter(m -> email.equalsIgnoreCase(m.getEmail()))
                .toList();
        return ResponseEntity.ok(patients);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteFamilyMember(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id) {
        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Family member not found"));
        if (!member.getUserId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Unauthorized"));
        }
        familyMemberRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Family member removed."));
    }

// -- private helpers --

    private void sendCaregiverWelcomeEmail(Long accountHolderId, String caregiverEmail,
                                           String caregiverName, String patientName,
                                           String relation) {
        try {
            Optional<User> userOpt = userRepository.findById(accountHolderId);
            String accountHolderName = userOpt.map(User::getName).orElse("Someone");

            // Use caregiverName if provided, fall back to their email address 😭😭
            String displayName = (caregiverName != null && !caregiverName.isBlank())
                    ? caregiverName
                    : caregiverEmail;

            emailService.sendCaregiverWelcome(
                    caregiverEmail, displayName, accountHolderName, patientName, relation);
        } catch (Exception e) {
            // Never crash the request — email is best-effort
        }
    }
}
