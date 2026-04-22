package com.medsafe.dto;

import lombok.Data;

@Data
public class DoseLogRequest {
    private Long medicineId;
    // Optional: for caregiver alert, pass the family member id whose email to notify
    private Long caregiverFamilyMemberId;
}
