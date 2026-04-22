package com.medsafe.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import com.medsafe.dto.InteractionResult;
import com.medsafe.model.FamilyMember;
import com.medsafe.model.Medicine;
import com.medsafe.model.User;
import com.medsafe.repository.FamilyMemberRepository;
import com.medsafe.repository.MedicineRepository;
import com.medsafe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PdfReportService {

    private final MedicineRepository medicineRepository;
    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final DrugInteractionService interactionService;

    // Brand colors
    private static final Color PRIMARY       = new Color(99, 102, 241);
    private static final Color PRIMARY_LIGHT = new Color(224, 225, 255);
    private static final Color SECONDARY     = new Color(236, 72, 153);
    private static final Color DANGER        = new Color(239, 68, 68);
    private static final Color DANGER_LIGHT  = new Color(254, 226, 226);
    private static final Color SUCCESS       = new Color(16, 185, 129);
    private static final Color DARK          = new Color(15, 23, 42);
    private static final Color GREY_LIGHT    = new Color(241, 245, 249);
    private static final Color GREY_MID      = new Color(148, 163, 184);
    private static final Color WHITE         = Color.WHITE;

    // Account-holder report (personal medicines only)
    public byte[] generateUserReport(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Exclude family-member medicines
        List<Medicine> medicines = medicineRepository.findByUserId(userId)
                .stream()
                .filter(m -> m.getFamilyMemberId() == null)
                .collect(Collectors.toList());

        List<InteractionResult> interactions = fetchInteractions(medicines);

        String reportTitle = "Patient Health Report";
        PatientInfo info = new PatientInfo(
                safe(user.getName()),
                safe(user.getEmail()),
                safe(user.getPhone()),
                safe(user.getBloodGroup()),
                "—",    // allergies not on User model
                "—"     // conditions not on User model
        );

        return buildPdf(info, medicines, interactions, reportTitle);
    }

    // Family-member report
    public byte[] generateFamilyMemberReport(Long userId, Long familyMemberId) {
        // Security: ensure family member belongs to this user
        FamilyMember member = familyMemberRepository.findById(familyMemberId)
                .orElseThrow(() -> new RuntimeException("Family member not found"));
        if (!member.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        List<Medicine> medicines = medicineRepository.findByFamilyMemberId(familyMemberId);
        List<InteractionResult> interactions = fetchInteractions(medicines);

        String reportTitle = member.getName() + " — Health Report";
        PatientInfo info = new PatientInfo(
                safe(member.getName()),
                safe(member.getEmail()),
                member.getAge() != null ? String.valueOf(member.getAge()) + " yrs" : "—",
                safe(member.getBloodGroup()),
                safe(member.getAllergies()),
                safe(member.getMedicalConditions())
        );

        return buildPdf(info, medicines, interactions, reportTitle);
    }

    // Core PDF builder
    private byte[] buildPdf(PatientInfo patient, List<Medicine> medicines,
                             List<InteractionResult> interactions, String reportTitle) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 56, 60);
            PdfWriter writer = PdfWriter.getInstance(doc, out);

            // Footer / page number
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter w, Document d) {
                    try {
                        PdfContentByte cb = w.getDirectContent();
                        cb.setColorStroke(new Color(226, 232, 240));
                        cb.setLineWidth(0.5f);
                        cb.moveTo(40, 44);
                        cb.lineTo(PageSize.A4.getWidth() - 40, 44);
                        cb.stroke();
                        Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 8, GREY_MID);
                        Phrase footer = new Phrase(
                            "MedSafe AI  ·  Confidential Health Report  ·  Page " + w.getPageNumber() +
                            "  |  For medical use — show this report to your doctor or pharmacist.", footerFont);
                        ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, footer,
                                PageSize.A4.getWidth() / 2, 30, 0);
                    } catch (Exception ignored) {}
                }
            });

            doc.open();
            PdfContentByte canvas = writer.getDirectContent();

            // Header background
            canvas.setColorFill(DARK);
            canvas.rectangle(0, PageSize.A4.getHeight() - 96, PageSize.A4.getWidth(), 96);
            canvas.fill();

            canvas.setColorFill(PRIMARY);
            canvas.rectangle(0, PageSize.A4.getHeight() - 100, PageSize.A4.getWidth() / 2, 6);
            canvas.fill();
            canvas.setColorFill(SECONDARY);
            canvas.rectangle(PageSize.A4.getWidth() / 2, PageSize.A4.getHeight() - 100, PageSize.A4.getWidth() / 2, 6);
            canvas.fill();

            // Logo image (clipped to rounded rect)
            float headerTop = PageSize.A4.getHeight();
            float logoSize = 42, logoRadius = 9;
            float logoX = 44;
            float logoY = headerTop - 76; // vertically centered in the 96px header
            try (InputStream logoStream = getClass().getResourceAsStream("/static/logo.png")) {
                if (logoStream != null) {
                    byte[] logoBytes = logoStream.readAllBytes();
                    Image logoImg = Image.getInstance(logoBytes);
                    logoImg.scaleToFit(logoSize, logoSize);
                    float scaledW = logoImg.getScaledWidth();
                    float scaledH = logoImg.getScaledHeight();

                    // Save state → clip to rounded rect → draw image → restore
                    canvas.saveState();
                    canvas.roundRectangle(logoX, logoY, scaledW, scaledH, logoRadius);
                    canvas.clip();
                    canvas.newPath();
                    canvas.addImage(logoImg, scaledW, 0, 0, scaledH, logoX, logoY);
                    canvas.restoreState();
                } else {
                    log.warn("logo.png not found in classpath /static/");
                    canvas.setColorFill(PRIMARY);
                    canvas.roundRectangle(logoX, logoY, logoSize, logoSize, logoRadius);
                    canvas.fill();
                }
            } catch (Exception logoEx) {
                log.warn("Could not load logo for PDF: {}", logoEx.getMessage());
                canvas.setColorFill(PRIMARY);
                canvas.roundRectangle(logoX, logoY, logoSize, logoSize, logoRadius);
                canvas.fill();
            }

            // Text positioned to the right of logo, vertically aligned
            float textX = logoX + logoSize + 14;
            Font logoFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, WHITE);
            Font logoSub  = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(148, 163, 184));
            ColumnText.showTextAligned(canvas, Element.ALIGN_LEFT,
                new Phrase("MedSafe AI", logoFont), textX, logoY + logoSize - 12, 0);
            ColumnText.showTextAligned(canvas, Element.ALIGN_LEFT,
                new Phrase(reportTitle, logoSub), textX, logoY + logoSize - 28, 0);

            Font dateFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(148, 163, 184));
            String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMMM yyyy"));
            ColumnText.showTextAligned(canvas, Element.ALIGN_RIGHT,
                new Phrase("Generated: " + dateStr, dateFont),
                PageSize.A4.getWidth() - 44, logoY + logoSize - 12, 0);

            doc.add(new Paragraph(" "));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph(" "));

            // Patient information
            addSectionHeader(doc, "Patient Information");
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setSpacingBefore(8);
            infoTable.setSpacingAfter(20);
            addInfoRow(infoTable, "Full Name",           patient.name);
            addInfoRow(infoTable, "Email / Contact",     patient.email);
            addInfoRow(infoTable, "Age / Phone",         patient.ageOrPhone);
            addInfoRow(infoTable, "Blood Group",         patient.bloodGroup);
            addInfoRow(infoTable, "Known Allergies",     patient.allergies);
            addInfoRow(infoTable, "Medical Conditions",  patient.conditions);
            addInfoRow(infoTable, "Report Date",         dateStr);
            addInfoRow(infoTable, "Medicines Listed",    String.valueOf(medicines.size()));
            doc.add(infoTable);

            // Current medications
            addSectionHeader(doc, "Current Medications");
            if (medicines.isEmpty()) {
                addInfoBox(doc, "No medications recorded. Please add medicines via the MedSafe app.", SUCCESS);
            } else {
                PdfPTable medTable = new PdfPTable(5);
                medTable.setWidthPercentage(100);
                medTable.setWidths(new float[]{2.5f, 2f, 1.5f, 2f, 2f});
                medTable.setSpacingBefore(8);
                medTable.setSpacingAfter(20);
                for (String h : new String[]{"Brand Name", "Generic Name", "Dosage", "Frequency", "Time Slots"}) {
                    PdfPCell cell = new PdfPCell(new Phrase(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, WHITE)));
                    cell.setBackgroundColor(PRIMARY);
                    cell.setPadding(8);
                    cell.setBorder(Rectangle.NO_BORDER);
                    medTable.addCell(cell);
                }
                boolean alt = false;
                for (Medicine med : medicines) {
                    Color rowBg = alt ? GREY_LIGHT : WHITE;
                    Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9, DARK);
                    for (String v : new String[]{
                            med.getBrandName(), safe(med.getGenericName()),
                            safe(med.getDosage()), safe(med.getFrequency()), safe(med.getTimeSlots())}) {
                        PdfPCell c = new PdfPCell(new Phrase(v, cellFont));
                        c.setBackgroundColor(rowBg);
                        c.setPadding(7);
                        c.setBorderColor(new Color(226, 232, 240));
                        c.setBorderWidth(0.5f);
                        medTable.addCell(c);
                    }
                    alt = !alt;
                }
                doc.add(medTable);
            }

            // Drug interactions
            addSectionHeader(doc, "Drug Interaction Analysis (FDA + AI)");
            if (interactions.isEmpty()) {
                addInfoBox(doc, "✓  No significant drug interactions detected among the listed medications. Always consult your doctor for personalised advice.", SUCCESS);
            } else {
                Font warnHeader = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, DANGER);
                Font warnBody   = FontFactory.getFont(FontFactory.HELVETICA, 9, DARK);
                Font aiFont     = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9, new Color(55, 65, 81));
                for (InteractionResult ix : interactions) {
                    PdfPTable ixTable = new PdfPTable(1);
                    ixTable.setWidthPercentage(100);
                    ixTable.setSpacingBefore(8);
                    ixTable.setSpacingAfter(4);
                    PdfPCell headerCell = new PdfPCell();
                    headerCell.setBackgroundColor(DANGER_LIGHT);
                    headerCell.setBorderColor(DANGER);
                    headerCell.setBorderWidth(0.8f);
                    headerCell.setPadding(10);
                    Paragraph headerPara = new Paragraph();
                    headerPara.add(new Chunk("⚠  " + ix.getDrugA().toUpperCase() + "  +  " + ix.getDrugB().toUpperCase(), warnHeader));
                    String sev = ix.getSeverity();
                    Color sevBg = "MAJOR".equals(sev) ? DANGER : "MODERATE".equals(sev) ? new Color(245, 158, 11) : SUCCESS;
                    headerPara.add(new Chunk("   [" + sev + "]", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, sevBg)));
                    headerCell.addElement(headerPara);
                    ixTable.addCell(headerCell);
                    PdfPCell fdaCell = new PdfPCell();
                    fdaCell.setPadding(10);
                    fdaCell.setBorderColor(new Color(226, 232, 240));
                    fdaCell.setBorderWidth(0.5f);
                    Paragraph fdaPara = new Paragraph();
                    fdaPara.add(new Chunk("FDA Warning:  ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, DARK)));
                    fdaPara.add(new Chunk(safe(ix.getDescription()), warnBody));
                    fdaCell.addElement(fdaPara);
                    ixTable.addCell(fdaCell);
                    if (ix.getAiExplanation() != null && !ix.getAiExplanation().isBlank()) {
                        PdfPCell aiCell = new PdfPCell();
                        aiCell.setBackgroundColor(PRIMARY_LIGHT);
                        aiCell.setPadding(10);
                        aiCell.setBorderColor(PRIMARY);
                        aiCell.setBorderWidth(0.5f);
                        Paragraph aiPara = new Paragraph();
                        aiPara.add(new Chunk("MedSafe AI:  ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, PRIMARY)));
                        aiPara.add(new Chunk(ix.getAiExplanation(), aiFont));
                        aiCell.addElement(aiPara);
                        ixTable.addCell(aiCell);
                    }
                    doc.add(ixTable);
                }
            }

            // Disclaimer
            doc.add(Chunk.NEWLINE);
            doc.add(Chunk.NEWLINE);
            PdfPTable disclaimer = new PdfPTable(1);
            disclaimer.setWidthPercentage(100);
            PdfPCell dc = new PdfPCell();
            dc.setBackgroundColor(GREY_LIGHT);
            dc.setPadding(12);
            dc.setBorderColor(new Color(226, 232, 240));
            dc.setBorderWidth(0.5f);
            dc.addElement(new Paragraph(
                "DISCLAIMER: This report is generated by MedSafe AI for informational purposes only. " +
                "It is not a substitute for professional medical advice, diagnosis, or treatment. " +
                "Always consult a qualified healthcare professional before making any changes to your " +
                "medication regimen. Drug interaction information is sourced from the US FDA OpenFDA database.",
                FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(71, 85, 105))));
            disclaimer.addCell(dc);
            doc.add(disclaimer);

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Error generating PDF report", e);
            throw new RuntimeException("Error generating PDF: " + e.getMessage());
        }
    }



    /** Simple value-object to carry patient display info into buildPdf */
    private record PatientInfo(String name, String email, String ageOrPhone,
                                String bloodGroup, String allergies, String conditions) {}

    private void addSectionHeader(Document doc, String title) throws DocumentException {
        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, DARK);
        Paragraph p = new Paragraph(title, f);
        p.setSpacingBefore(16);
        p.setSpacingAfter(4);
        LineSeparator ls = new LineSeparator();
        ls.setLineColor(PRIMARY);
        ls.setLineWidth(2f);
        ls.setPercentage(100f);
        doc.add(p);
        doc.add(new Chunk(ls));
    }

    private void addInfoRow(PdfPTable table, String key, String value) {
        Font keyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(71, 85, 105));
        Font valFont = FontFactory.getFont(FontFactory.HELVETICA, 9, DARK);
        PdfPCell kc = new PdfPCell(new Phrase(key, keyFont));
        kc.setPadding(7); kc.setBackgroundColor(GREY_LIGHT);
        kc.setBorderColor(new Color(226, 232, 240)); kc.setBorderWidth(0.5f);
        table.addCell(kc);
        PdfPCell vc = new PdfPCell(new Phrase(value != null ? value : "—", valFont));
        vc.setPadding(7);
        vc.setBorderColor(new Color(226, 232, 240)); vc.setBorderWidth(0.5f);
        table.addCell(vc);
    }

    private void addInfoBox(Document doc, String message, Color color) throws DocumentException {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        t.setSpacingBefore(8);
        t.setSpacingAfter(16);
        PdfPCell c = new PdfPCell(new Phrase(message, FontFactory.getFont(FontFactory.HELVETICA, 9.5f, color)));
        c.setPadding(12);
        c.setBorderColor(color);
        c.setBorderWidth(0.8f);
        c.setBackgroundColor(new Color(
            Math.min(255, color.getRed() + 210),
            Math.min(255, color.getGreen() + 210),
            Math.min(255, color.getBlue() + 210)));
        t.addCell(c);
        doc.add(t);
    }

    private String safe(String s) { return (s == null || s.isBlank()) ? "—" : s; }

    private List<InteractionResult> fetchInteractions(List<Medicine> medicines) {
        List<InteractionResult> results = new ArrayList<>();
        if (medicines.size() < 2) return results;
        List<String> drugNames = medicines.stream()
                .map(Medicine::getBrandName).collect(Collectors.toList());
        for (int i = 0; i < drugNames.size(); i++) {
            for (int j = i + 1; j < drugNames.size(); j++) {
                List<InteractionResult> pair = interactionService.checkInteractions(
                        List.of(drugNames.get(i), drugNames.get(j)));
                if (!pair.isEmpty() && !"MINOR".equalsIgnoreCase(pair.get(0).getSeverity())) {
                    results.add(pair.get(0));
                }
            }
        }
        return results;
    }
}
