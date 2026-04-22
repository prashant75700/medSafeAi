package com.medsafe.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class MedicineRequest {
    private Long familyMemberId;
    private String brandName;
    private String genericName;
    private String dosage;
    private String frequency;
    private String timeSlots;
    private LocalDate startDate;
    private LocalDate endDate;
    private String notes;
}

