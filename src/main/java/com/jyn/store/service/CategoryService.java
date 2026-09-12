package com.jyn.store.service;

import com.jyn.store.model.Category;
import com.jyn.store.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    public List<Category> getAllCategories() {
        List<Category> list = categoryRepository.findAll();
        if (list == null || list.isEmpty()) {
            categoryRepository.save(new Category("Maquillaje"));
            categoryRepository.save(new Category("Ropa"));
            list = categoryRepository.findAll();
        }
        return list;
    }

    public Optional<Category> getCategoryById(String id) {
        return categoryRepository.findById(id);
    }

    public Category saveCategory(Category category) {
        // Prevent duplicate names
        Optional<Category> existing = categoryRepository.findByNameIgnoreCase(category.getName().trim());
        if (existing.isPresent()) {
            return existing.get();
        }
        category.setName(category.getName().trim());
        return categoryRepository.save(category);
    }

    public void deleteCategory(String id) {
        categoryRepository.deleteById(id);
    }
    
    // Seed default categories automatically on application startup
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void seedCategories() {
        try {
            if (categoryRepository.count() == 0) {
                categoryRepository.save(new Category("Maquillaje"));
                categoryRepository.save(new Category("Ropa"));
                System.out.println(">>> Categorías por defecto creadas: Maquillaje, Ropa");
            }
        } catch (Exception e) {
            System.err.println(">>> [Aviso] Error sembrando categorías: " + e.getMessage());
        }
    }
}
