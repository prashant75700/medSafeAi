package com.medsafe.repository;

import com.medsafe.model.IndianDrug;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IndianDrugRepository extends JpaRepository<IndianDrug, Long> {
    IndianDrug findByBrandNameIgnoreCase(String brandName);
}
