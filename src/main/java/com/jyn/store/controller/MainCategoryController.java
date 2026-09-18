package com.jyn.store.controller;

import com.jyn.store.model.MainCategory;
import com.jyn.store.service.MainCategoryService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/main-categories")
public class MainCategoryController {

    @Autowired
    private MainCategoryService mainCategoryService;

    private boolean isNotAdmin(HttpSession session) {
        Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
        return isAdmin == null || !isAdmin;
    }

    @GetMapping
    public ResponseEntity<List<MainCategory>> getAllMainCategories() {
        return ResponseEntity.ok(mainCategoryService.getAllMainCategories());
    }

    @PostMapping
    public ResponseEntity<?> saveMainCategory(@RequestBody MainCategory mainCategory, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        if (mainCategory.getName() == null || mainCategory.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
        }
        return ResponseEntity.ok(mainCategoryService.saveMainCategory(mainCategory));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMainCategory(@PathVariable String id, @RequestBody MainCategory mainCategory, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        if (mainCategory.getName() == null || mainCategory.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
        }
        try {
            MainCategory updated = mainCategoryService.updateMainCategory(id, mainCategory.getName());
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMainCategory(@PathVariable String id, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        mainCategoryService.deleteMainCategory(id);
        return ResponseEntity.ok(Map.of("message", "Categoría principal eliminada exitosamente"));
    }
}
