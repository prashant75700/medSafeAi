package com.medsafe.service;

import com.medsafe.model.DoseLog;
import com.medsafe.model.FamilyMember;
import com.medsafe.model.Medicine;
import com.medsafe.repository.DoseLogRepository;
import com.medsafe.repository.FamilyMemberRepository;
import com.medsafe.repository.MedicineRepository;
import com.medsafe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {

    private final MedicineRepository    medicineRepository;
    private final DoseLogRepository     doseLogRepository;
    private final UserRepository        userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final EmailService          emailService;

    private static final DateTimeFormatter TIME_FMT    = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DISPLAY_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    // ────────────────────────────────────────────────────────────────
    // 1. Reminder scheduler — runs every minute
    //    Creates a PENDING dose log and sends a reminder email for any
    //    dose whose scheduled time falls in the next 0-5 minutes.
    // ────────────────────────────────────────────────────────────────
    @Scheduled(cron = "0 * * * * *")
    public void checkAndSendReminders() {
        log.debug("ReminderScheduler running at {}", LocalDateTime.now());

        LocalDateTime now       = LocalDateTime.now();
        LocalDateTime windowEnd = now.plusMinutes(5);

        for (Medicine medicine : medicineRepository.findAll()) {
            if (medicine.getTimeSlots() == null || medicine.getTimeSlots().isBlank()) continue;
            if (medicine.getEndDate() != null && medicine.getEndDate().isBefore(LocalDate.now())) continue;

            for (String slot : medicine.getTimeSlots().split(",")) {
                processSlot(medicine, slot.trim(), now, windowEnd);
            }
        }
    }

    // ────────────────────────────────────────────────────────────────
    // 2. Auto-missed detector — runs every 15 minutes
    //    Any dose log still PENDING more than 30 minutes after its
    //    scheduled time is automatically marked MISSED.
    //    • For personal medicines   → emails the account holder
    //    • For family-member meds   → emails the caregiver (member.email)
    // ────────────────────────────────────────────────────────────────
    @Scheduled(fixedDelay = 15 * 60 * 1000)   // 15 minutes, ms
    public void autoMarkMissedAndNotify() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(30);

        List<DoseLog> stalePending =
                doseLogRepository.findByStatusAndScheduledTimeBefore("PENDING", cutoff);

        if (stalePending.isEmpty()) return;
        log.info("Auto-missed check: {} stale PENDING log(s) found", stalePending.size());

        for (DoseLog log : stalePending) {
            // Mark MISSED
            log.setStatus("MISSED");
            log.setLoggedAt(LocalDateTime.now());
            doseLogRepository.save(log);
            log.info("Auto-marked MISSED: log={} medicine={}", log.getId(), log.getMedicineName());

            // Fire appropriate alert
            sendAutoMissedAlert(log);
        }
    }

    // ────────────────────────────────────────────────────────────────
    // Private helpers
    // ────────────────────────────────────────────────────────────────

    private void processSlot(Medicine medicine, String timeSlot,
                              LocalDateTime now, LocalDateTime windowEnd) {
        try {
            LocalTime     slotTime          = LocalTime.parse(timeSlot, TIME_FMT);
            LocalDateTime scheduledDateTime = LocalDateTime.of(LocalDate.now(), slotTime);

            if (scheduledDateTime.isBefore(now) || scheduledDateTime.isAfter(windowEnd)) return;

            // Avoid duplicate logs
            Optional<DoseLog> existing = doseLogRepository
                    .findByMedicineIdAndScheduledTimeBetween(
                            medicine.getId(),
                            scheduledDateTime.minusMinutes(1),
                            scheduledDateTime.plusMinutes(1));
            if (existing.isPresent()) return;

            // Create PENDING dose log
            DoseLog doseLog = new DoseLog();
            doseLog.setUserId(medicine.getUserId());
            doseLog.setMedicineId(medicine.getId());
            doseLog.setMedicineName(medicine.getBrandName());
            doseLog.setScheduledTime(scheduledDateTime);
            doseLog.setStatus("PENDING");
            doseLogRepository.save(doseLog);

            // Send reminder email
            userRepository.findById(medicine.getUserId()).ifPresent(user -> {
                String dosageLabel = medicine.getDosage() != null ? medicine.getDosage() : "as prescribed";
                String timeLabel   = scheduledDateTime.format(DISPLAY_FMT);

                if (medicine.getFamilyMemberId() != null) {
                    familyMemberRepository.findById(medicine.getFamilyMemberId()).ifPresent(member -> {
                        emailService.sendFamilyMedicineReminder(
                                user.getEmail(),
                                user.getName(),
                                member.getName(),
                                medicine.getBrandName(),
                                dosageLabel,
                                timeLabel,
                                member.getCaregiverName()
                        );
                    });
                } else {
                    emailService.sendMedicineReminder(
                            user.getEmail(),
                            user.getName(),
                            medicine.getBrandName(),
                            dosageLabel,
                            timeLabel
                    );
                }
            });

            log.info("Reminder sent for medicine '{}' at slot {}", medicine.getBrandName(), timeSlot);

        } catch (Exception e) {
            log.error("Error processing slot '{}' for medicine {}: {}", timeSlot, medicine.getId(), e.getMessage());
        }
    }

    /**
     * Sends the right alert for a log that was auto-marked MISSED.
     *
     * Logic:
     *  - Look up the medicine to find its owner and any family member assignment.
     *  - If the medicine belongs to a family member AND that member has a caregiver
     *    email → send caregiver alert naming the family member as the patient.
     *  - Otherwise → send a "you missed your dose" reminder back to the account holder.
     */
    private void sendAutoMissedAlert(DoseLog missedLog) {
        try {
            Optional<Medicine> medicineOpt = medicineRepository.findById(missedLog.getMedicineId());
            if (medicineOpt.isEmpty()) return;

            Medicine medicine = medicineOpt.get();
            String   dosage   = (medicine.getDosage() != null && !medicine.getDosage().isBlank())
                                ? medicine.getDosage() : "as prescribed";
            String   timeLabel = missedLog.getScheduledTime().format(DISPLAY_FMT);

            // Case A: medicine is for a family member → alert their caregiver
            if (medicine.getFamilyMemberId() != null) {
                familyMemberRepository.findById(medicine.getFamilyMemberId()).ifPresent(member -> {
                    if (member.getEmail() == null || member.getEmail().isBlank()) {
                        // No caregiver email set — fall back to notifying account holder
                        notifyAccountHolder(missedLog, medicine, dosage, timeLabel);
                        return;
                    }
                    String caregiverDisplayName = (member.getCaregiverName() != null
                            && !member.getCaregiverName().isBlank())
                            ? member.getCaregiverName()
                            : member.getEmail();

                    emailService.sendCaregiverAlert(
                            member.getEmail(),
                            caregiverDisplayName,
                            member.getName(),          // patient = the family member
                            missedLog.getMedicineName(),
                            dosage,
                            timeLabel
                    );
                    log.info("Caregiver alert sent to {} for patient {}",
                            member.getEmail(), member.getName());
                });
            } else {
                // Case B: personal medicine → remind the account holder they missed it
                notifyAccountHolder(missedLog, medicine, dosage, timeLabel);
            }

        } catch (Exception e) {
            log.error("Failed to send auto-missed alert for log {}: {}", missedLog.getId(), e.getMessage());
        }
    }

    /** Sends a plain reminder email to the account holder when they miss their own dose. */
    private void notifyAccountHolder(DoseLog missedLog, Medicine medicine,
                                      String dosage, String timeLabel) {
        userRepository.findById(missedLog.getUserId()).ifPresent(user -> {
            emailService.sendMedicineReminder(
                    user.getEmail(),
                    user.getName(),
                    missedLog.getMedicineName(),
                    dosage,
                    timeLabel + " (missed — please take it if still appropriate)"
            );
            log.info("Missed-dose reminder sent to {} for {}", user.getEmail(), missedLog.getMedicineName());
        });
    }
}
