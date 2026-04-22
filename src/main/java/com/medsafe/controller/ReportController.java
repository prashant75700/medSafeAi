package com.medsafe.controller;

import com.medsafe.security.UserDetailsImpl;
import com.medsafe.service.PdfReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final PdfReportService pdfReportService;

    /**
     * GET /api/reports/my-report
     * Downloads a PDF report for the authenticated account holder.
     * Only includes medicines that belong directly to the account holder (no family medicines).
     */
    @GetMapping("/my-report")
    public ResponseEntity<byte[]> downloadMyReport(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        byte[] pdfBytes = pdfReportService.generateUserReport(userDetails.getId());
        return buildPdfResponse(pdfBytes, "medsafe-report.pdf");
    }

    /**
     * GET /api/reports/family/{memberId}
     * Downloads a PDF report for a specific family member.
     * Only accessible by the user who owns that family member record.
     */
    @GetMapping("/family/{memberId}")
    public ResponseEntity<byte[]> downloadFamilyMemberReport(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long memberId) {

        byte[] pdfBytes = pdfReportService.generateFamilyMemberReport(
                userDetails.getId(), memberId);
        return buildPdfResponse(pdfBytes, "medsafe-family-report.pdf");
    }

// -- private helper --

    private ResponseEntity<byte[]> buildPdfResponse(byte[] pdfBytes, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", filename);
        // Prevent caching of sensitive health information in the browser
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }
}
