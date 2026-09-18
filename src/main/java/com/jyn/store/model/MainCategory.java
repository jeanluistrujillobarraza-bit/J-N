package com.jyn.store.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "main_categories")
public class MainCategory {
    @Id
    private String id;
    private String name; // e.g. "Maquillaje", "Ropa", "Accesorios", "Perfumes", "Zapatos"

    public MainCategory() {}

    public MainCategory(String name) {
        this.name = name;
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
}
