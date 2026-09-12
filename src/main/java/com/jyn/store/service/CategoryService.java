package com.jyn.store.service;

import com.jyn.store.model.Category;
import com.jyn.store.model.Product;
import com.jyn.store.repository.CategoryRepository;
import com.jyn.store.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
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

    public Category updateCategory(String id, String newName) {
        Optional<Category> optional = categoryRepository.findById(id);
        if (optional.isEmpty()) {
            throw new RuntimeException("Categoría no encontrada");
        }

        String trimmedName = newName.trim();
        Category cat = optional.get();
        String oldName = cat.getName();

        // Check if new name already exists with a different ID
        Optional<Category> existing = categoryRepository.findByNameIgnoreCase(trimmedName);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe una categoría con ese nombre");
        }

        cat.setName(trimmedName);
        Category saved = categoryRepository.save(cat);

        // Cascade update in products if name changed
        if (oldName != null && !oldName.equalsIgnoreCase(trimmedName)) {
            List<Product> products = productRepository.findAll();
            boolean changed = false;
            for (Product p : products) {
                if (p.getCategory() != null && p.getCategory().equalsIgnoreCase(oldName)) {
                    p.setCategory(trimmedName);
                    productRepository.save(p);
                }
            }
        }

        return saved;
    }

    public void deleteCategory(String id) {
        categoryRepository.deleteById(id);
    }
}
