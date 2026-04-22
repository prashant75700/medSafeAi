package com.medsafe.controller;

import com.medsafe.dto.AuthRequest;
import com.medsafe.dto.AuthResponse;
import com.medsafe.dto.MessageResponse;
import com.medsafe.model.User;
import com.medsafe.repository.UserRepository;
import com.medsafe.security.JwtUtils;
import com.medsafe.security.UserDetailsImpl;
import com.medsafe.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    EmailService emailService;


    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody AuthRequest loginRequest) {

        Optional<User> userOpt = userRepository.findByEmail(loginRequest.getEmail());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (Boolean.FALSE.equals(user.getEmailVerified())) {
                return ResponseEntity.status(403).body(Map.of(
                    "message", "Please verify your email before signing in.",
                    "requiresVerification", true
                ));
            }
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(new AuthResponse(
                jwt, userDetails.getId(), userDetails.getEmail(),
                userDetails.getName(),
                userDetails.getAuthorities().iterator().next().getAuthority()));
    }


    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody AuthRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
        }
        User user = new User();
        user.setName(signUpRequest.getName());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));
        user.setRole("USER");


        String otp = String.format("%04d", new Random().nextInt(10000));
        user.setEmailVerified(false);
        user.setVerificationOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));

        userRepository.save(user);

        boolean emailSent = false;
        try {
            emailService.sendOtpVerification(signUpRequest.getEmail(), signUpRequest.getName(), otp);
            emailSent = true;
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "message", "Registration successful! Please verify your email.",
            "requiresVerification", true,
            "emailSent", emailSent
        ));
    }


    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Email and OTP are required."));
        }
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found."));
        }
        User user = userOpt.get();
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return ResponseEntity.ok(new MessageResponse("Email already verified."));
        }
        if (user.getOtpExpiry() != null && user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(new MessageResponse("OTP has expired. Please request a new one."));
        }
        if (!otp.equals(user.getVerificationOtp())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid OTP."));
        }
        user.setEmailVerified(true);
        user.setVerificationOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
        return ResponseEntity.ok(new MessageResponse("Email verified successfully!"));
    }


    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Email is required."));
        }

        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (Boolean.TRUE.equals(user.getEmailVerified())) {
                    return ResponseEntity.ok(new MessageResponse("Email already verified."));
                }
                String newOtp = String.format("%04d", new Random().nextInt(10000));
                user.setVerificationOtp(newOtp);
                user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
                userRepository.save(user);
                try {
                    emailService.sendOtpVerification(email, user.getName(), newOtp);
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok(new MessageResponse("If this email is registered and unverified, a new OTP has been sent."));
    }

    /** Accepts the current password or temporary password. Clears temp password on use. */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> body) {

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Invalid request. New password must be at least 8 characters."));
        }

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean matchesMain = encoder.matches(currentPassword, user.getPassword());


        boolean matchesTemp = user.getTempPassword() != null
                && (user.getTempPasswordExpiry() == null || user.getTempPasswordExpiry().isAfter(LocalDateTime.now()))
                && encoder.matches(currentPassword, user.getTempPassword());

        if (!matchesMain && !matchesTemp) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Current password is incorrect."));
        }


        user.setPassword(encoder.encode(newPassword));


        if (matchesTemp) {
            user.setTempPassword(null);
            user.setTempPasswordExpiry(null);
        }

        userRepository.save(user);
        return ResponseEntity.ok(new MessageResponse("Password changed successfully!"));
    }

    /** Sends a temporary password (valid 30 min) without overwriting the real password. */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Email is required."));
        }
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String tempPassword = UUID.randomUUID().toString().replace("-", "").substring(0, 10);


                user.setTempPassword(encoder.encode(tempPassword));
                user.setTempPasswordExpiry(LocalDateTime.now().plusMinutes(30));
                userRepository.save(user);

                try {
                    emailService.sendPasswordReset(email, user.getName(), tempPassword);
                } catch (Exception emailEx) {

                }
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok(
                new MessageResponse("If this email is registered, a temporary password has been sent."));
    }


    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(Map.of(
            "id",                user.getId(),
            "name",              user.getName(),
            "email",             user.getEmail(),
            "bloodGroup",        user.getBloodGroup()        != null ? user.getBloodGroup()        : "",
            "phone",             user.getPhone()             != null ? user.getPhone()             : "",
            "allergies",         user.getAllergies()          != null ? user.getAllergies()          : "",
            "medicalConditions", user.getMedicalConditions()  != null ? user.getMedicalConditions()  : ""
        ));
    }


    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (body.containsKey("name") && !body.get("name").isBlank()) {
            user.setName(body.get("name"));
        }
        if (body.containsKey("phone"))             user.setPhone(body.get("phone"));
        if (body.containsKey("bloodGroup"))         user.setBloodGroup(body.get("bloodGroup"));
        if (body.containsKey("allergies"))           user.setAllergies(body.get("allergies"));
        if (body.containsKey("medicalConditions"))   user.setMedicalConditions(body.get("medicalConditions"));
        userRepository.save(user);
        return ResponseEntity.ok(new MessageResponse("Profile updated successfully!"));
    }
}
