package com.medsafe.component;

import com.medsafe.model.IndianDrug;
import com.medsafe.repository.IndianDrugRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class IndianDrugSeeder implements CommandLineRunner {

    @Autowired
    private IndianDrugRepository indianDrugRepository;

    @Override
    public void run(String... args) throws Exception {
        if (indianDrugRepository.count() == 0) {
            List<IndianDrug> drugs = Arrays.asList(
                    new IndianDrug("Crocin", "Paracetamol"),
                    new IndianDrug("Dolo", "Paracetamol"),
                    new IndianDrug("Combiflam", "Ibuprofen and Paracetamol"),
                    new IndianDrug("Allegra", "Fexofenadine"),
                    new IndianDrug("Augmentin", "Amoxicillin and Clavulanate"),
                    new IndianDrug("Aciloc", "Ranitidine"),
                    new IndianDrug("Ecosprin", "Aspirin"),
                    new IndianDrug("Pan 40", "Pantoprazole"),
                    new IndianDrug("Azee", "Azithromycin"),
                    new IndianDrug("Taxim-O", "Cefixime")
            );
            indianDrugRepository.saveAll(drugs);
            System.out.println("Seeded Indian Drug mappings!");
        }
    }
}
