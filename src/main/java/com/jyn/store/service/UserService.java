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

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:admin123}")
    private String adminPassword;

    @PostConstruct
    public void seedAdminUser() {
        Optional<User> existingAdmin = userRepository.findByUsername(adminUsername);
        if (existingAdmin.isEmpty()) {
            User admin = new User();
            admin.setUsername(adminUsername);
            // Hash the admin password using our PasswordUtils
            admin.setPassword(PasswordUtils.hashPassword(adminPassword));
            admin.setFirstName("Administradora");
            admin.setLastName("J&N");
            admin.setRole("ADMIN");
            userRepository.save(admin);
        } else {
            // Update admin password if config changed
            User admin = existingAdmin.get();
            String hashedConfigPass = PasswordUtils.hashPassword(adminPassword);
            if (!admin.getPassword().equals(hashedConfigPass)) {
                admin.setPassword(hashedConfigPass);
                userRepository.save(admin);
            }
        }
    }

    public User registerClient(User client) throws Exception {
        if (client.getUsername() == null || client.getUsername().trim().isEmpty()) {
            throw new Exception("El nombre de usuario es obligatorio.");
        }
        if (client.getPassword() == null || client.getPassword().trim().isEmpty()) {
            throw new Exception("La contraseña es obligatoria.");
        }
        
        String cleanUsername = client.getUsername().trim();
        if (userRepository.findByUsername(cleanUsername).isPresent()) {
            throw new Exception("El nombre de usuario ya está registrado.");
        }

        client.setUsername(cleanUsername);
        client.setPassword(PasswordUtils.hashPassword(client.getPassword().trim()));
        client.setRole("CLIENT");
        return userRepository.save(client);
    }

    public User authenticate(String username, String password) throws Exception {
        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new Exception("Todos los campos son obligatorios.");
        }

        User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new Exception("Usuario no encontrado o credenciales incorrectas."));

        if (!PasswordUtils.verifyPassword(password.trim(), user.getPassword())) {
            throw new Exception("Contraseña incorrecta.");
        }

        return user;
    }
}
