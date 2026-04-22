package com.medsafe.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsafe.dto.AuthRequest;
import com.medsafe.model.User;
import com.medsafe.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Clean DB before each test
    }

    @Test
    void registerUser_ShouldReturnSuccess() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setName("John Doe");
        request.setEmail("john@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully!"));
    }

    @Test
    void registerUser_ShouldFailIfEmailExists() throws Exception {
        // Pre-save a user
        User existingUser = new User();
        existingUser.setName("Jane Doe");
        existingUser.setEmail("jane@example.com");
        existingUser.setPassword(passwordEncoder.encode("password123"));
        existingUser.setRole("USER");
        userRepository.save(existingUser);

        // Try registering with same email
        AuthRequest request = new AuthRequest();
        request.setName("Another Jane");
        request.setEmail("jane@example.com");
        request.setPassword("newpass");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Error: Email is already in use!"));
    }

    @Test
    void loginUser_ShouldReturnJwtToken() throws Exception {
        // Pre-save a user
        User user = new User();
        user.setName("John Login");
        user.setEmail("login@example.com");
        user.setPassword(passwordEncoder.encode("securePassword"));
        user.setRole("USER");
        userRepository.save(user);

        // Perform login
        AuthRequest request = new AuthRequest();
        request.setEmail("login@example.com");
        request.setPassword("securePassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("USER"));
    }
}
