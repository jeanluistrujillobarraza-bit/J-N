package com.jyn.store.service;

import com.jyn.store.model.User;
import com.jyn.store.repository.UserRepository;
import com.jyn.store.util.PasswordUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Value("${admin.username:jayner}")
    private String adminUsername;

    @Value("${admin.password:jayner1801}")
    private String adminPassword;

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void seedAdminUser() {
        try {
            Optional<User> existingAdmin = userRepository.findByUsername(adminUsername);
            if (existingAdmin.isEmpty()) {
                User admin = new User();
                admin.setUsername(adminUsername);
                // Hash the admin password using our PasswordUtils
                admin.setPassword(PasswordUtils.hashPassword(adminPassword));
                admin.setFirstName("Jayner");
                admin.setLastName("J&N");
                admin.setRole("ADMIN");
                userRepository.save(admin);
                System.out.println(">>> Usuario Administrador 'jayner' creado exitosamente.");
            } else {
                // Update admin password if config changed
                User admin = existingAdmin.get();
                String hashedConfigPass = PasswordUtils.hashPassword(adminPassword);
                if (!admin.getPassword().equals(hashedConfigPass)) {
                    admin.setPassword(hashedConfigPass);
                    userRepository.save(admin);
                    System.out.println(">>> Contraseña de Administrador actualizada exitosamente.");
                }
            }
        } catch (Exception e) {
            System.err.println(">>> [Aviso] Error conectando a MongoDB en arranque: " + e.getMessage());
        }
    }

    public User registerClient(User client) throws Exception {
        if (client.getUsername() == null || client.getUsername().trim().isEmpty()) {
            throw new Exception("El nombre de usuario es obligatorio.");
        }
        if (client.getPassword() == null || client.getPassword().isEmpty()) {
            throw new Exception("La contraseña es obligatoria.");
        }
        
        String cleanUsername = client.getUsername().trim();
        if (userRepository.findByUsernameIgnoreCase(cleanUsername).isPresent()) {
            throw new Exception("El nombre de usuario ya está registrado.");
        }

        client.setUsername(cleanUsername);
        // La contraseña se guarda exactamente como la escribió el usuario (sensible a mayúsculas/minúsculas)
        client.setPassword(PasswordUtils.hashPassword(client.getPassword()));
        client.setRole("CLIENT");
        return userRepository.save(client);
    }

    public User authenticate(String username, String password) throws Exception {
        if (username == null || username.trim().isEmpty() || password == null || password.isEmpty()) {
            throw new Exception("Todos los campos son obligatorios.");
        }

        String cleanUsername = username.trim();

        // 1. Verificación instantánea para el Administrador (Flexible mayúsculas/minúsculas en usuario)
        if (adminUsername.equalsIgnoreCase(cleanUsername)) {
            if (adminPassword.equals(password.trim())) {
                User admin = new User();
                admin.setUsername(adminUsername);
                admin.setFirstName("Jayner");
                admin.setLastName("J&N");
                admin.setRole("ADMIN");
                return admin;
            } else {
                throw new Exception("Contraseña incorrecta.");
            }
        }

        // 2. Búsqueda de cliente en la base de datos
        Optional<User> userOpt;
        try {
            userOpt = userRepository.findByUsernameIgnoreCase(cleanUsername);
        } catch (Exception e) {
            throw new Exception("Usuario no existente");
        }

        User user = userOpt.orElseThrow(() -> new Exception("Usuario no existente"));

        // Verificación estricta de la contraseña (mayúsculas/minúsculas respetadas)
        if (!PasswordUtils.verifyPassword(password, user.getPassword())) {
            throw new Exception("Contraseña incorrecta.");
        }

        return user;
    }
}
