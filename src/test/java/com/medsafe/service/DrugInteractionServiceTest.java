package com.medsafe.service;

import com.medsafe.dto.InteractionResult;
import com.medsafe.dto.OpenFdaResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DrugInteractionServiceTest {

    @Mock
    private OpenFdaService openFdaService;

    @Mock
    private AiService aiService;

    @InjectMocks
    private DrugInteractionService drugInteractionService;

    @Test
    void checkInteractions_ShouldReturnMajor_WhenFDAHasMatch() {
        // Setup FDA match for Aspirin + Warfarin
        OpenFdaResponse.Result result = new OpenFdaResponse.Result();
        result.setDrug_interactions(List.of("Do not use aspirin alongside warfarin."));
        OpenFdaResponse fdaResponse = new OpenFdaResponse();
        fdaResponse.setResults(List.of(result));

        // Aspirin has the warning about warfarin
        when(openFdaService.getInteractionWarnings("aspirin")).thenReturn(fdaResponse);
        // We might not even call warfarin, but mock it just in case
        // The service stops checking B against A if A against B is found

        when(aiService.explainInteraction(anyString(), anyString(), anyString()))
                .thenReturn("AI: Bleeding risk increased.");

        List<InteractionResult> findings = drugInteractionService.checkInteractions(List.of("Aspirin", "Warfarin"));

        assertEquals(1, findings.size(), "Should detect 1 interaction pair");
        InteractionResult finding = findings.get(0);
        assertEquals("aspirin", finding.getDrugA());
        assertEquals("warfarin", finding.getDrugB());
        assertEquals("MAJOR", finding.getSeverity());
        assertEquals("AI: Bleeding risk increased.", finding.getAiExplanation());
    }

    @Test
    void checkInteractions_ShouldIgnoreMinor_WhenFDANoMatch() {
        when(openFdaService.getInteractionWarnings(anyString())).thenReturn(null);

        List<InteractionResult> findings = drugInteractionService.checkInteractions(List.of("Vitamin C", "Aspirin"));

        // With current logic, if OpenFDA has NO interaction match, finding is skipped completely in findings list.
        assertEquals(0, findings.size(), "Should report 0 interactions for empty/non-matching FDA labels");
    }
}
