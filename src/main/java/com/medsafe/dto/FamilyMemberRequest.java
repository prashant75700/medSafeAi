package com.medsafe.dto;

import lombok.Data;

@Data
public class FamilyMemberRequest {
    private String name;
    private String relation;
    private Integer age;
    private String email;           // caregiver email for missed-dose alerts
    private String caregiverName;   // display name for email greetings (e.g. "Dr. Sharma")
    private String bloodGroup;
    private String allergies;
    private String medicalConditions;
}
