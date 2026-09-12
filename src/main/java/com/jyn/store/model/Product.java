package com.jyn.store.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private String description;
    private double price;
    private List<String> images = new ArrayList<>();
    private String category; // e.g. "Maquillaje", "Ropa"
    private String type; // "maquillaje" or "ropa"
    private int generalStock; // For makeup
    private List<SizeColorStock> variations = new ArrayList<>(); // For clothing
    private boolean deleted = false; // Soft delete for Trash management

    public Product() {}

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public int getGeneralStock() {
        return generalStock;
    }

    public void setGeneralStock(int generalStock) {
        this.generalStock = generalStock;
    }

    public List<SizeColorStock> getVariations() {
        return variations;
    }

    public void setVariations(List<SizeColorStock> variations) {
        this.variations = variations;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
