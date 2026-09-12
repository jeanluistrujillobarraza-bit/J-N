package com.jyn.store.controller;

import com.jyn.store.model.User;
import com.jyn.store.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AdminAuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials, HttpSession session) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        try {
            User user = userService.authenticate(username, password);
            
            // Set session attributes
            session.setAttribute("user", user);
            session.setAttribute("isAdmin", "ADMIN".equalsIgnoreCase(user.getRole()));
            session.setAttribute("userId", user.getId());
            session.setAttribute("username", user.getUsername());
            session.setAttribute("firstName", user.getFirstName());
            session.setAttribute("lastName", user.getLastName());
            session.setAttribute("phone", user.getPhone());

            return ResponseEntity.ok(Map.of(
                    "message", "Login exitoso",
                    "username", user.getUsername(),
                    "firstName", user.getFirstName(),
                    "lastName", user.getLastName(),
                    "phone", user.getPhone() != null ? user.getPhone() : "",
                    "role", user.getRole()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User client, HttpSession session) {
        try {
            User newClient = userService.registerClient(client);
            return ResponseEntity.ok(Map.of(
                    "message", "Registro exitoso",
                    "username", newClient.getUsername()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkAuth(HttpSession session) {
        String username = (String) session.getAttribute("username");
        String role = "CLIENT";
        
        Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
        if (isAdmin != null && isAdmin) {
            role = "ADMIN";
        }

        if (username != null) {
            return ResponseEntity.ok(Map.of(
                    "authenticated", true,
                    "role", role,
                    "firstName", session.getAttribute("firstName") != null ? session.getAttribute("firstName") : "",
                    "lastName", session.getAttribute("lastName") != null ? session.getAttribute("lastName") : "",
                    "phone", session.getAttribute("phone") != null ? session.getAttribute("phone") : ""
            ));
        }
        
        return ResponseEntity.ok(Map.of("authenticated", false));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Sesión cerrada"));
    }
}
