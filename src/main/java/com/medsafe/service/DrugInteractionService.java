package com.medsafe.service;

import com.medsafe.dto.InteractionResult;
import com.medsafe.dto.OpenFdaResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DrugInteractionService {

    @Autowired
    private OpenFdaService openFdaService;

    @Autowired
    private AiService aiService;

    /**
     * Comprehensive Indian brand → generic name mapping.
     * Covers 120+ common Indian medicines.
     */
    private static final Map<String, String> INDIAN_BRAND_MAP = new LinkedHashMap<>();

    static {
        // Pain & Fever
        INDIAN_BRAND_MAP.put("crocin", "paracetamol");
        INDIAN_BRAND_MAP.put("dolo", "paracetamol");
        INDIAN_BRAND_MAP.put("dolo 650", "paracetamol");
        INDIAN_BRAND_MAP.put("calpol", "paracetamol");
        INDIAN_BRAND_MAP.put("paracip", "paracetamol");
        INDIAN_BRAND_MAP.put("combiflam", "ibuprofen");
        INDIAN_BRAND_MAP.put("brufen", "ibuprofen");
        INDIAN_BRAND_MAP.put("nise", "nimesulide");
        INDIAN_BRAND_MAP.put("nimulid", "nimesulide");
        INDIAN_BRAND_MAP.put("voveran", "diclofenac");
        INDIAN_BRAND_MAP.put("meftal", "mefenamic acid");
        INDIAN_BRAND_MAP.put("meftal-p", "mefenamic acid");
        INDIAN_BRAND_MAP.put("drotin", "drotaverine");
        INDIAN_BRAND_MAP.put("buscopan", "hyoscine");
        INDIAN_BRAND_MAP.put("spasmo-proxyvon", "dicyclomine");
        // Antibiotics
        INDIAN_BRAND_MAP.put("augmentin", "amoxicillin");
        INDIAN_BRAND_MAP.put("clavam", "amoxicillin");
        INDIAN_BRAND_MAP.put("mox", "amoxicillin");
        INDIAN_BRAND_MAP.put("wymox", "amoxicillin");
        INDIAN_BRAND_MAP.put("amoxil", "amoxicillin");
        INDIAN_BRAND_MAP.put("azee", "azithromycin");
        INDIAN_BRAND_MAP.put("zithromax", "azithromycin");
        INDIAN_BRAND_MAP.put("atm", "azithromycin");
        INDIAN_BRAND_MAP.put("cifran", "ciprofloxacin");
        INDIAN_BRAND_MAP.put("ciplox", "ciprofloxacin");
        INDIAN_BRAND_MAP.put("taxim-o", "cefixime");
        INDIAN_BRAND_MAP.put("zifi", "cefixime");
        INDIAN_BRAND_MAP.put("monocef", "ceftriaxone");
        INDIAN_BRAND_MAP.put("rocephin", "ceftriaxone");
        INDIAN_BRAND_MAP.put("metrogyl", "metronidazole");
        INDIAN_BRAND_MAP.put("flagyl", "metronidazole");
        INDIAN_BRAND_MAP.put("doxrid", "doxycycline");
        INDIAN_BRAND_MAP.put("vibramycin", "doxycycline");
        INDIAN_BRAND_MAP.put("dalacin", "clindamycin");
        INDIAN_BRAND_MAP.put("lizolid", "linezolid");
        // Antacids / GI
        INDIAN_BRAND_MAP.put("pan 40", "pantoprazole");
        INDIAN_BRAND_MAP.put("pantocid", "pantoprazole");
        INDIAN_BRAND_MAP.put("omez", "omeprazole");
        INDIAN_BRAND_MAP.put("ocid", "omeprazole");
        INDIAN_BRAND_MAP.put("rablet", "rabeprazole");
        INDIAN_BRAND_MAP.put("rabeloc", "rabeprazole");
        INDIAN_BRAND_MAP.put("aciloc", "ranitidine");
        INDIAN_BRAND_MAP.put("zinetac", "ranitidine");
        INDIAN_BRAND_MAP.put("neksium", "esomeprazole");
        INDIAN_BRAND_MAP.put("nexium", "esomeprazole");
        // Antihistamines
        INDIAN_BRAND_MAP.put("allegra", "fexofenadine");
        INDIAN_BRAND_MAP.put("okacet", "cetirizine");
        INDIAN_BRAND_MAP.put("cetrizine", "cetirizine");
        INDIAN_BRAND_MAP.put("levocet", "levocetirizine");
        INDIAN_BRAND_MAP.put("xyzal", "levocetirizine");
        INDIAN_BRAND_MAP.put("atarax", "hydroxyzine");
        INDIAN_BRAND_MAP.put("avil", "pheniramine");
        INDIAN_BRAND_MAP.put("phenergan", "promethazine");
        INDIAN_BRAND_MAP.put("benadryl", "diphenhydramine");
        INDIAN_BRAND_MAP.put("montair", "montelukast");
        INDIAN_BRAND_MAP.put("telekast", "montelukast");
        INDIAN_BRAND_MAP.put("montair lc", "montelukast");
        INDIAN_BRAND_MAP.put("sinarest", "paracetamol");
        // Cardiovascular
        INDIAN_BRAND_MAP.put("ecosprin", "aspirin");
        INDIAN_BRAND_MAP.put("loprin", "aspirin");
        INDIAN_BRAND_MAP.put("deplatt", "clopidogrel");
        INDIAN_BRAND_MAP.put("plavix", "clopidogrel");
        INDIAN_BRAND_MAP.put("telma", "telmisartan");
        INDIAN_BRAND_MAP.put("micardis", "telmisartan");
        INDIAN_BRAND_MAP.put("stamlo", "amlodipine");
        INDIAN_BRAND_MAP.put("norvasc", "amlodipine");
        INDIAN_BRAND_MAP.put("amlip", "amlodipine");
        INDIAN_BRAND_MAP.put("atorva", "atorvastatin");
        INDIAN_BRAND_MAP.put("lipitor", "atorvastatin");
        INDIAN_BRAND_MAP.put("rosuvas", "rosuvastatin");
        INDIAN_BRAND_MAP.put("crestor", "rosuvastatin");
        INDIAN_BRAND_MAP.put("cardace", "ramipril");
        INDIAN_BRAND_MAP.put("repace", "losartan");
        INDIAN_BRAND_MAP.put("olmat", "olmesartan");
        INDIAN_BRAND_MAP.put("metolar", "metoprolol");
        INDIAN_BRAND_MAP.put("tenormin", "atenolol");
        INDIAN_BRAND_MAP.put("lasix", "furosemide");
        INDIAN_BRAND_MAP.put("aldactone", "spironolactone");
        INDIAN_BRAND_MAP.put("lanoxin", "digoxin");
        INDIAN_BRAND_MAP.put("acitrom", "acenocoumarol");
        INDIAN_BRAND_MAP.put("clexane", "enoxaparin");
        INDIAN_BRAND_MAP.put("inderal", "propranolol");
        // Diabetes
        INDIAN_BRAND_MAP.put("glycomet", "metformin");
        INDIAN_BRAND_MAP.put("glucophage", "metformin");
        INDIAN_BRAND_MAP.put("amaryl", "glimepiride");
        INDIAN_BRAND_MAP.put("gemer", "glimepiride");
        INDIAN_BRAND_MAP.put("januvia", "sitagliptin");
        INDIAN_BRAND_MAP.put("jardiance", "empagliflozin");
        INDIAN_BRAND_MAP.put("forxiga", "dapagliflozin");
        INDIAN_BRAND_MAP.put("volix", "voglibose");
        INDIAN_BRAND_MAP.put("diamicron", "gliclazide");
        // Thyroid
        INDIAN_BRAND_MAP.put("thyronorm", "levothyroxine");
        INDIAN_BRAND_MAP.put("eltroxin", "levothyroxine");
        INDIAN_BRAND_MAP.put("thyrox", "levothyroxine");
        INDIAN_BRAND_MAP.put("neomercazole", "carbimazole");
        // Respiratory
        INDIAN_BRAND_MAP.put("asthalin", "salbutamol");
        INDIAN_BRAND_MAP.put("ventolin", "salbutamol");
        INDIAN_BRAND_MAP.put("seroflo", "fluticasone");
        INDIAN_BRAND_MAP.put("duolin", "levosalbutamol");
        // Psychiatric / Neuro
        INDIAN_BRAND_MAP.put("nexito", "escitalopram");
        INDIAN_BRAND_MAP.put("stalopam", "escitalopram");
        INDIAN_BRAND_MAP.put("stugeron", "cinnarizine");
        INDIAN_BRAND_MAP.put("vertin", "betahistine");
        INDIAN_BRAND_MAP.put("larpose", "lorazepam");
        INDIAN_BRAND_MAP.put("alprax", "alprazolam");
        INDIAN_BRAND_MAP.put("trika", "alprazolam");
        // Steroids
        INDIAN_BRAND_MAP.put("wysolone", "prednisolone");
        INDIAN_BRAND_MAP.put("dexa", "dexamethasone");
        INDIAN_BRAND_MAP.put("decadron", "dexamethasone");
        // Vitamins / Supplements
        INDIAN_BRAND_MAP.put("shelcal", "calcium");
        INDIAN_BRAND_MAP.put("becosules", "b complex");
        INDIAN_BRAND_MAP.put("revital", "multivitamin");
        INDIAN_BRAND_MAP.put("folvite", "folic acid");
        INDIAN_BRAND_MAP.put("zincovit", "zinc");
        // Anticoagulants
        INDIAN_BRAND_MAP.put("warfarin", "warfarin");
        INDIAN_BRAND_MAP.put("heparin", "heparin");
    }

    public String getGenericName(String name) {
        if (name == null) return "";
        String lower = name.toLowerCase().trim();
        // Direct lookup
        if (INDIAN_BRAND_MAP.containsKey(lower)) {
            return INDIAN_BRAND_MAP.get(lower);
        }
        // Partial match (e.g. "dolo 650mg" → "dolo 650")
        for (Map.Entry<String, String> entry : INDIAN_BRAND_MAP.entrySet()) {
            if (lower.startsWith(entry.getKey())) {
                return entry.getValue();
            }
        }
        return lower;
    }

    public List<InteractionResult> checkInteractions(List<String> rawDrugs) {
        List<InteractionResult> findings = new ArrayList<>();
        if (rawDrugs == null || rawDrugs.size() < 2) return findings;

        List<String> generics = rawDrugs.stream()
                .map(this::getGenericName)
                .distinct()
                .collect(Collectors.toList());

        for (int i = 0; i < generics.size(); i++) {
            for (int j = i + 1; j < generics.size(); j++) {
                String drugA = generics.get(i);
                String drugB = generics.get(j);

                boolean interactionFound = false;
                String description = "";
                String severity = "MODERATE";

                // Check A's label for B
                OpenFdaResponse responseA = openFdaService.getInteractionWarnings(drugA);
                if (hasMatch(responseA, drugB)) {
                    interactionFound = true;
                    description = extractDescription(responseA, drugB, drugA, drugB);
                    severity = "MAJOR";
                }

                // Check B's label for A
                if (!interactionFound) {
                    OpenFdaResponse responseB = openFdaService.getInteractionWarnings(drugB);
                    if (hasMatch(responseB, drugA)) {
                        interactionFound = true;
                        description = extractDescription(responseB, drugA, drugA, drugB);
                        severity = "MAJOR";
                    }
                }

                if (interactionFound) {
                    String aiExplanation = aiService.explainInteraction(drugA, drugB, description);
                    findings.add(InteractionResult.builder()
                            .drugA(drugA)
                            .drugB(drugB)
                            .severity(severity)
                            .description(description)
                            .foodWarnings("Please refer to the FDA label or consult a doctor or pharmacist.")
                            .aiExplanation(aiExplanation)
                            .build());
                }
            }
        }
        return findings;
    }

    private boolean hasMatch(OpenFdaResponse response, String targetDrug) {
        if (response == null || response.getResults() == null || response.getResults().isEmpty()) return false;
        OpenFdaResponse.Result result = response.getResults().get(0);
        if (result.getDrug_interactions() == null || result.getDrug_interactions().isEmpty()) return false;
        String text = String.join(" ", result.getDrug_interactions()).toLowerCase();
        return text.contains(targetDrug.toLowerCase());
    }

    private String extractDescription(OpenFdaResponse response, String matchTerm, String drugA, String drugB) {
        if (response == null || response.getResults() == null || response.getResults().isEmpty()) {
            return "Potential interaction between " + drugA + " and " + drugB + ".";
        }
        OpenFdaResponse.Result result = response.getResults().get(0);
        if (result.getDrug_interactions() == null) {
            return "Potential interaction between " + drugA + " and " + drugB + ".";
        }
        // Find the sentence containing the drug name
        for (String warning : result.getDrug_interactions()) {
            if (warning.toLowerCase().contains(matchTerm.toLowerCase())) {
                // Return first 400 chars of the relevant warning
                return warning.length() > 400 ? warning.substring(0, 400) + "…" : warning;
            }
        }
        return "Potential interaction found between " + drugA + " and " + drugB + ".";
    }
}
