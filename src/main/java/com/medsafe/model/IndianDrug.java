package com.medsafe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "indian_drugs")
@Data
@NoArgsConstructor
public class IndianDrug {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String brandName;

    @Column(nullable = false)
    private String genericName;
    
    public IndianDrug(String brandName, String genericName) {
        this.brandName = brandName;
        this.genericName = genericName;
    }
}
