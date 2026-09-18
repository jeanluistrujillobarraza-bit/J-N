package com.jyn.store.service;

import com.jyn.store.model.Category;
import com.jyn.store.model.MainCategory;
import com.jyn.store.repository.CategoryRepository;
import com.jyn.store.repository.MainCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class MainCategoryService {

    @Autowired
    private MainCategoryRepository mainCategoryRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    public List<MainCategory> getAllMainCategories() {
        List<MainCategory> list = mainCategoryRepository.findAll();
        if (list.isEmpty()) {
            List<String> defaultNames = Arrays.asList("Maquillaje", "Ropa", "Accesorios", "Perfumes", "Zapatos");
            for (String name : defaultNames) {
                MainCategory mc = new MainCategory(name);
                mainCategoryRepository.save(mc);
            }
            list = mainCategoryRepository.findAll();
        }
        return list;
    }

    public Optional<MainCategory> getMainCategoryById(String id) {
        return mainCategoryRepository.findById(id);
    }

    public MainCategory saveMainCategory(MainCategory mainCategory) {
        String trimmedName = mainCategory.getName().trim();
        Optional<MainCategory> existing = mainCategoryRepository.findByNameIgnoreCase(trimmedName);
        if (existing.isPresent()) {
            return existing.get();
        }
        mainCategory.setName(trimmedName);
        return mainCategoryRepository.save(mainCategory);
    }

    public MainCategory updateMainCategory(String id, String newName) {
        Optional<MainCategory> optional = mainCategoryRepository.findById(id);
        if (optional.isEmpty()) {
            throw new RuntimeException("Categoría principal no encontrada");
        }

        String trimmedName = newName.trim();
        MainCategory mc = optional.get();
        String oldName = mc.getName();

        Optional<MainCategory> existing = mainCategoryRepository.findByNameIgnoreCase(trimmedName);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe una categoría principal con ese nombre");
        }

        mc.setName(trimmedName);
        MainCategory saved = mainCategoryRepository.save(mc);

        // Cascade update in subcategories if parentCategory matches oldName
        if (oldName != null && !oldName.equalsIgnoreCase(trimmedName)) {
            List<Category> subCats = categoryRepository.findAll();
            for (Category cat : subCats) {
                if (cat.getParentCategory() != null && cat.getParentCategory().equalsIgnoreCase(oldName)) {
                    cat.setParentCategory(trimmedName);
                    categoryRepository.save(cat);
                }
            }
        }

        return saved;
    }

    public void deleteMainCategory(String id) {
        mainCategoryRepository.deleteById(id);
    }
}
