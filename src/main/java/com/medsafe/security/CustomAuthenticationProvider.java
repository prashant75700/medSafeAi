package com.medsafe.security;

import com.medsafe.model.User;
import com.medsafe.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

/**
 * Extends DaoAuthenticationProvider to support dual-password login:
 *  1. The user's real password (always works)
 *  2. A one-time temporary password set via "forgot password" flow
 *
 * The temp password is valid only until its expiry (30 min default)
 * AND until the user calls /auth/change-password using it — at that point it is cleared.
 */
public class CustomAuthenticationProvider extends DaoAuthenticationProvider {

    private final UserRepository userRepository;

    public CustomAuthenticationProvider(UserDetailsServiceImpl userDetailsService,
                                         UserRepository userRepository,
                                         PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        setUserDetailsService(userDetailsService);
        setPasswordEncoder(passwordEncoder);
    }

    @Override
    protected void additionalAuthenticationChecks(UserDetails userDetails,
            UsernamePasswordAuthenticationToken authentication) throws AuthenticationException {
        if (authentication.getCredentials() == null) {
            throw new BadCredentialsException("Bad credentials");
        }
        String presentedPassword = authentication.getCredentials().toString();
        PasswordEncoder encoder = getPasswordEncoder();

        // 1. Try main password first (normal path)
        if (encoder.matches(presentedPassword, userDetails.getPassword())) {
            return;
        }

        // 2. Try temp password (forgot-password flow) — only if not expired
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user != null
                && user.getTempPassword() != null
                && (user.getTempPasswordExpiry() == null || user.getTempPasswordExpiry().isAfter(LocalDateTime.now()))
                && encoder.matches(presentedPassword, user.getTempPassword())) {
            return; // Temp password accepted — user can now log in and change their password
        }

        throw new BadCredentialsException("Bad credentials");
    }
}
