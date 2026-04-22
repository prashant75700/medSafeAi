package com.medsafe.service;

import com.medsafe.dto.MedicineRequest;
import com.medsafe.model.Medicine;
import com.medsafe.repository.MedicineRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MedicineService {

    @Autowired
    private MedicineRepository medicineRepository;

    public Medicine addMedicine(Long userId, MedicineRequest request) {
        Medicine medicine = new Medicine();
        medicine.setUserId(userId);
        medicine.setFamilyMemberId(request.getFamilyMemberId());
        medicine.setFamilyMemberId(request.getFamilyMemberId());
        medicine.setBrandName(request.getBrandName());
        medicine.setGenericName(request.getGenericName());
        medicine.setDosage(request.getDosage());
        medicine.setFrequency(request.getFrequency());
        medicine.setTimeSlots(request.getTimeSlots());
        medicine.setStartDate(request.getStartDate());
        medicine.setEndDate(request.getEndDate());
        medicine.setNotes(request.getNotes());
        return medicineRepository.save(medicine);
    }

    public List<Medicine> getMedicines(Long userId) {
        return medicineRepository.findByUserId(userId);
    }

    public Medicine updateMedicine(Long userId, Long medicineId, MedicineRequest request) {
        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));
        if (!medicine.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        medicine.setFamilyMemberId(request.getFamilyMemberId());
        medicine.setBrandName(request.getBrandName());
        medicine.setGenericName(request.getGenericName());
        medicine.setDosage(request.getDosage());
        medicine.setFrequency(request.getFrequency());
        medicine.setTimeSlots(request.getTimeSlots());
        medicine.setStartDate(request.getStartDate());
        medicine.setEndDate(request.getEndDate());
        medicine.setNotes(request.getNotes());
        return medicineRepository.save(medicine);
    }

    public void deleteMedicine(Long userId, Long medicineId) {
        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));
        if (!medicine.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        medicineRepository.delete(medicine);
    }
}

