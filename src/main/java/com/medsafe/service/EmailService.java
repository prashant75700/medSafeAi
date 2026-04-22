package com.medsafe.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    /** Send a medicine reminder email to the user. */
    public void sendMedicineReminder(String toEmail, String userName,
                                     String medicineName, String dosage, String scheduledTime) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("💊 MedSafe Reminder: Time to take " + medicineName);
            message.setText(
                    "Hello " + userName + ",\n\n" +
                    "This is a reminder from MedSafe to take your medicine:\n\n" +
                    "  Medicine : " + medicineName + "\n" +
                    "  Dosage   : " + formatDosage(dosage) + "\n" +
                    "  Time     : " + scheduledTime + "\n\n" +
                    "Please log in to MedSafe and mark your dose as taken.\n\n" +
                    "Stay healthy! 🌿\n" +
                    "— The MedSafe AI Team"
            );
            mailSender.send(message);
            log.info("Reminder email sent to {} for medicine {}", toEmail, medicineName);
        } catch (Exception e) {
            log.error("Failed to send reminder email to {}: {}", toEmail, e.getMessage());
        }
    }

    /** Send a caregiver alert when a dose is marked as missed. */
    public void sendCaregiverAlert(String caregiverEmail, String caregiverName,
                                   String patientName, String medicineName,
                                   String dosage, String scheduledTime) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(caregiverEmail);
            message.setSubject("⚠️ MedSafe Alert: " + patientName + " missed a dose");
            message.setText(
                    "Hello " + caregiverName + ",\n\n" +
                    "This is an alert from MedSafe.\n\n" +
                    patientName + " has missed a scheduled dose:\n\n" +
                    "  Medicine       : " + medicineName + "\n" +
                    "  Dosage         : " + formatDosage(dosage) + "\n" +
                    "  Scheduled Time : " + scheduledTime + "\n\n" +
                    "Please follow up with them to ensure they receive their medication.\n\n" +
                    "— The MedSafe AI Team"
            );
            mailSender.send(message);
            log.info("Caregiver alert sent to {} for patient {}", caregiverEmail, patientName);
        } catch (Exception e) {
            log.error("Failed to send caregiver alert to {}: {}", caregiverEmail, e.getMessage());
        }
    }

    /** Send password reset temporary password email — HTML with highlighted code box. */
    public void sendPasswordReset(String toEmail, String userName, String tempPassword) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🔐 MedSafe — Your Temporary Password");
            String html = buildStyledEmail(
                    userName,
                    "You requested a password reset for your MedSafe account.",
                    "Your temporary password is:",
                    tempPassword,
                    "You can log in using <strong>either</strong> your original password OR this temporary one.<br><br>" +
                    "To set a new permanent password, log in and go to:<br>" +
                    "<strong>Profile → Change Password</strong><br><br>" +
                    "Use this temporary password as the 'Current Password' when changing it.<br>" +
                    "The temporary password will be cleared automatically after your new password is set.<br><br>" +
                    "If you did not request this, you can safely ignore this email.<br>" +
                    "Your original password remains unchanged."
            );
            helper.setText(html, true);
            mailSender.send(mimeMessage);
            log.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    /** Send OTP verification email — HTML with highlighted code box. */
    public void sendOtpVerification(String toEmail, String userName, String otp) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("✉️ MedSafe — Verify Your Email Address");
            String html = buildStyledEmail(
                    userName,
                    "Welcome to MedSafe! Please verify your email address.",
                    "Your 4-digit OTP is:",
                    otp,
                    "This OTP expires in <strong>10 minutes</strong>.<br><br>" +
                    "If you did not create a MedSafe account, please ignore this email."
            );
            helper.setText(html, true);
            mailSender.send(mimeMessage);
            log.info("OTP verification email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException(e);
        }
    }

    /** Send a medicine reminder for a family member. */
    public void sendFamilyMedicineReminder(String toEmail, String userName,
                                            String familyMemberName, String medicineName,
                                            String dosage, String scheduledTime,
                                            String caregiverName) {
        try {
            String greeting = (caregiverName != null && !caregiverName.isBlank())
                    ? caregiverName.trim()
                    : userName;
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("💊 MedSafe Reminder: " + familyMemberName + " — Time to take " + medicineName);
            message.setText(
                    "Hello " + greeting + ",\n\n" +
                    "This is a reminder from MedSafe for your family member:\n\n" +
                    "  Family Member : " + familyMemberName + "\n" +
                    "  Medicine      : " + medicineName + "\n" +
                    "  Dosage        : " + formatDosage(dosage) + "\n" +
                    "  Time          : " + scheduledTime + "\n\n" +
                    "Please ensure they take their medicine on time.\n\n" +
                    "Stay healthy! 🌿\n" +
                    "— The MedSafe AI Team"
            );
            mailSender.send(message);
            log.info("Family reminder email sent to {} for member {}", toEmail, familyMemberName);
        } catch (Exception e) {
            log.error("Failed to send family reminder to {}: {}", toEmail, e.getMessage());
        }
    }

    /**
     * Notify a caregiver when they have been added to oversee a family member.
     * Sent when a caregiver email is first set (or changed) on a FamilyMember record.
     */
    public void sendCaregiverWelcome(String caregiverEmail, String caregiverDisplayName,
                                     String accountHolderName, String patientName,
                                     String relation) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(caregiverEmail);
            message.setSubject("💙 MedSafe AI — You've been added as a Caregiver");
            message.setText(
                    "Hello " + caregiverDisplayName + ",\n\n" +
                    accountHolderName + " has added you as a caregiver for " +
                    patientName + " (" + relation + ") on MedSafe AI.\n\n" +
                    "What this means for you:\n" +
                    "  • You will receive an alert if " + patientName + " misses a scheduled dose.\n" +
                    "  • You can view " + patientName + "'s full dose history at any time.\n\n" +
                    "MedSafe AI helps families stay safe and healthy together. 💙\n\n" +
                    "If you have any concerns about being added, please contact\n" +
                    accountHolderName + " directly.\n\n" +
                    "Stay healthy! 🌿\n" +
                    "— The MedSafe AI Team"
            );
            mailSender.send(message);
            log.info("Caregiver welcome email sent to {} for patient {}", caregiverEmail, patientName);
        } catch (Exception e) {
            log.error("Failed to send caregiver welcome email to {}: {}", caregiverEmail, e.getMessage());
        }
    }

    /** Formats dosage — ensures it reads clearly. */
    private String formatDosage(String dosage) {
        if (dosage == null || dosage.isBlank() || dosage.equals("—")) {
            return "Not specified";
        }
        return dosage.trim();
    }

    /** Build a styled HTML email with a highlighted code/OTP box. */
    private String buildStyledEmail(String userName, String intro, String codeLabel,
                                     String code, String footer) {
        return "<!DOCTYPE html>" +
                "<html><head><meta charset='UTF-8'></head>" +
                "<body style='margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#f8fafc;'>" +
                "<div style='max-width:520px;margin:0 auto;padding:32px 24px;'>" +
                "<div style='background:linear-gradient(135deg,#6366f1,#ec4899);padding:18px 24px;border-radius:14px 14px 0 0;text-align:center;'>" +
                "<h1 style='margin:0;font-size:22px;color:white;letter-spacing:-0.5px;'>💊 MedSafe AI</h1>" +
                "</div>" +
                "<div style='background:#1e293b;padding:28px 24px;border-radius:0 0 14px 14px;border:1px solid rgba(255,255,255,0.08);border-top:none;'>" +
                "<p style='font-size:15px;margin:0 0 16px;'>Hello <strong>" + userName + "</strong>,</p>" +
                "<p style='font-size:14px;color:#94a3b8;margin:0 0 20px;'>" + intro + "</p>" +
                "<p style='font-size:14px;color:#94a3b8;margin:0 0 12px;'>" + codeLabel + "</p>" +
                "<div style='background:linear-gradient(135deg,#6366f1,#7c3aed);padding:18px;border-radius:12px;text-align:center;margin:0 0 20px;'>" +
                "<span style='font-size:32px;font-weight:800;letter-spacing:8px;color:white;font-family:monospace;'>" + code + "</span>" +
                "</div>" +
                "<p style='font-size:13px;color:#94a3b8;margin:0 0 20px;line-height:1.6;'>" + footer + "</p>" +
                "<hr style='border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0;'>" +
                "<p style='font-size:12px;color:#64748b;margin:0;text-align:center;'>Stay healthy! 🌿<br>— The MedSafe AI Team</p>" +
                "</div>" +
                "</div></body></html>";
    }
}
