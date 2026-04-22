package com.medsafe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    /**
     * Temporary password set during "forgot password" flow.
     * Stored as a BCrypt hash. Cleared when user successfully
     * changes their password using this temp password.
     * Both this AND the main password are valid for login simultaneously
     * — until this is used to trigger a real password change.
     */
    private String tempPassword;

    /** Expiry time for the temp password. After this time it is no longer valid. */
    private LocalDateTime tempPasswordExpiry;

    private String role; // "USER" or "ADMIN"

    private String phone;

    private String bloodGroup; // e.g. "A+", "O-", "B+", "AB+"

    private String allergies;         // free text — e.g. "Penicillin, Nuts"
    private String medicalConditions; // chronic conditions — e.g. "Type 2 Diabetes"

    private LocalDateTime createdAt;

    // null = pre-OTP user (treated as verified), false = pending, true = verified
    private Boolean emailVerified;

    private String verificationOtp;

    private LocalDateTime otpExpiry;


    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
