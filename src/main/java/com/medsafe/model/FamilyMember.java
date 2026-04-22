package com.medsafe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "family_members")
@Data
@NoArgsConstructor
public class FamilyMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String name;

    private String relation;
    private Integer age;

    /** Email of the caregiver — receives missed-dose alerts and can view dose history */
    private String email;

    /**
     * Display name used in caregiver email greetings.
     * e.g. "Dr. Sharma" → "Hello Dr. Sharma, …"
     * Falls back to accountHolder name if blank.
     */
    private String caregiverName;

    // Medical details for the PDF report
    private String bloodGroup;        // e.g. "A+", "O-"
    private String allergies;         // free text
    private String medicalConditions; // chronic conditions
}
