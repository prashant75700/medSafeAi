package com.medsafe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "dose_logs")
@Data
@NoArgsConstructor
public class DoseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long medicineId;

    // The brand name snapshot — kept here so the log is readable even if medicine deleted
    private String medicineName;

    // Scheduled time for this dose slot (e.g. 08:00 today)
    @Column(nullable = false)
    private LocalDateTime scheduledTime;

    // PENDING / TAKEN / MISSED
    @Column(nullable = false)
    private String status;

    private LocalDateTime loggedAt;

    @PrePersist
    protected void onCreate() {
        this.loggedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "PENDING";
        }
    }
}
