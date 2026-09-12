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
        return categoryRepository.findAll();
    }

    public Optional<Category> getCategoryById(String id) {
        return categoryRepository.findById(id);
    }

    public Category saveCategory(Category category) {
        // Prevent duplicate names
        Optional<Category> existing = categoryRepository.findByNameIgnoreCase(category.getName());
        if (existing.isPresent()) {
            return existing.get();
        }
        return categoryRepository.save(category);
    }

    public void deleteCategory(String id) {
        categoryRepository.deleteById(id);
    }
    
    // Seed default categories
    public void seedCategories() {
        if (categoryRepository.count() == 0) {
            categoryRepository.save(new Category("Maquillaje"));
            categoryRepository.save(new Category("Ropa"));
        }
    }
}
