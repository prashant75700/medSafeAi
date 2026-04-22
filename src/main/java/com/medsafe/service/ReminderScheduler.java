package com.medsafe.service;

import com.medsafe.model.DoseLog;
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
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {

    private final MedicineRepository medicineRepository;
    private final DoseLogRepository doseLogRepository;
    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final EmailService emailService;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DISPLAY_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    @Scheduled(cron = "0 * * * * *")
    public void checkAndSendReminders() {
        log.debug("ReminderScheduler running at {}", LocalDateTime.now());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowEnd = now.plusMinutes(5);

        for (Medicine medicine : medicineRepository.findAll()) {
            if (medicine.getTimeSlots() == null || medicine.getTimeSlots().isBlank()) continue;
            if (medicine.getEndDate() != null && medicine.getEndDate().isBefore(LocalDate.now())) continue;

            for (String slot : medicine.getTimeSlots().split(",")) {
                processSlot(medicine, slot.trim(), now, windowEnd);
            }
        }
    }

    private void processSlot(Medicine medicine, String timeSlot,
                              LocalDateTime now, LocalDateTime windowEnd) {
        try {
            LocalTime slotTime = LocalTime.parse(timeSlot, TIME_FMT);
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

            // Send reminder email — with family member context if applicable
            userRepository.findById(medicine.getUserId()).ifPresent(user -> {
                String dosageLabel = medicine.getDosage() != null ? medicine.getDosage() : "as prescribed";
                String timeLabel   = scheduledDateTime.format(DISPLAY_FMT);

                if (medicine.getFamilyMemberId() != null) {
                    // Medicine belongs to a family member — mention them clearly
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
                    // Personal medicine
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
}
