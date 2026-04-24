package com.medsafe.repository;

import com.medsafe.model.DoseLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoseLogRepository extends JpaRepository<DoseLog, Long> {

    List<DoseLog> findByUserId(Long userId);

    List<DoseLog> findByUserIdOrderByScheduledTimeDesc(Long userId);

    // Check if a PENDING log already exists for this medicine + timeslot
    Optional<DoseLog> findByMedicineIdAndScheduledTimeBetween(
            Long medicineId, LocalDateTime start, LocalDateTime end);

    // All pending logs for a user (used by scheduler)
    List<DoseLog> findByUserIdAndStatus(Long userId, String status);

    // All PENDING logs whose scheduled time has passed a given cutoff
    // Used by autoMarkMissedAndNotify() to detect forgotten doses
    List<DoseLog> findByStatusAndScheduledTimeBefore(String status, LocalDateTime cutoff);
}
