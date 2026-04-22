package com.medsafe.repository;

import com.medsafe.model.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    List<Medicine> findByUserId(Long userId);
    List<Medicine> findByFamilyMemberId(Long familyMemberId);
}

