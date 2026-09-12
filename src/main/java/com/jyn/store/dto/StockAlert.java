package com.jyn.store.dto;

public class StockAlert {
    private String productId;
    private String productName;
    private String category;
    private String type; // "maquillaje" or "ropa"
    private String detail; // e.g., "Sin stock general" or "Talla M - Color Negro (Agotado)"
    private int stock;

    public StockAlert() {}

    public StockAlert(String productId, String productName, String category, String type, String detail, int stock) {
        this.productId = productId;
        this.productName = productName;
        this.category = category;
        this.type = type;
        this.detail = detail;
        this.stock = stock;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
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

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }
}
