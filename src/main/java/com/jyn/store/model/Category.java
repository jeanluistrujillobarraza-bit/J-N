package com.jyn.store.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "categories")
public class Category {
    @Id
    private String id;
    private String name;
    private String parentCategory; // Main department: "Maquillaje", "Ropa", "Accesorios", "Perfumes", "Zapatos", etc.

    public Category() {}

    public Category(String name) {
        this.name = name;
        this.parentCategory = "Maquillaje";
    }

    public Category(String name, String parentCategory) {
        this.name = name;
        this.parentCategory = parentCategory;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getParentCategory() {
        if (parentCategory == null || parentCategory.trim().isEmpty()) {
            return "Maquillaje";
        }
        return parentCategory;
    }

    public void setParentCategory(String parentCategory) {
        this.parentCategory = parentCategory;
    }
}
