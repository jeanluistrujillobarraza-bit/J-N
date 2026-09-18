package com.jyn.store.service;

import com.jyn.store.dto.CartItemDto;
import com.jyn.store.dto.StockAlert;
import com.jyn.store.model.Product;
import com.jyn.store.model.SizeColorStock;
import com.jyn.store.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    public List<Product> getAllProducts() {
        return productRepository.findActiveProducts();
    }

    public List<Product> getDeletedProducts() {
        return productRepository.findDeletedProducts();
    }

    public Optional<Product> getProductById(String id) {
        return productRepository.findById(id);
    }

    public Product saveProduct(Product product) {
        if (product.getId() != null && product.getId().trim().isEmpty()) {
            product.setId(null);
        }
        if (product.getImages() == null || product.getImages().isEmpty()) {
            List<String> defaultImgs = new ArrayList<>();
            if ("ropa".equalsIgnoreCase(product.getType())) {
                defaultImgs.add("https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop");
            } else {
                defaultImgs.add("https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop");
            }
            product.setImages(defaultImgs);
        }
        return productRepository.save(product);
    }

    // Move to Trash (Soft Delete)
    public void deleteProduct(String id) {
        Optional<Product> optional = productRepository.findById(id);
        if (optional.isPresent()) {
            Product prod = optional.get();
            prod.setDeleted(true);
            productRepository.save(prod);
        }
    }

    // Restore from Trash
    public void restoreProduct(String id) {
        Optional<Product> optional = productRepository.findById(id);
        if (optional.isPresent()) {
            Product prod = optional.get();
            prod.setDeleted(false);
            productRepository.save(prod);
        }
    }

    // Permanent Deletion
    public void permanentDeleteProduct(String id) {
        productRepository.deleteById(id);
    }

    public List<Product> searchProducts(String category, String query) {
        boolean hasCategory = category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("todos");
        boolean hasQuery = query != null && !query.trim().isEmpty();

        if (hasCategory && hasQuery) {
            return productRepository.searchByCategoryOrTypeAndKeyword(category.trim(), query.trim());
        } else if (hasCategory) {
            return productRepository.findByCategoryOrTypeIgnoreCase(category.trim());
        } else if (hasQuery) {
            return productRepository.searchByNameOrDescription(query.trim());
        } else {
            return productRepository.findActiveProducts();
        }
    }

    public List<StockAlert> getStockAlerts() {
        List<StockAlert> alerts = new ArrayList<>();
        List<Product> products = productRepository.findActiveProducts();

        for (Product product : products) {
            if ("maquillaje".equalsIgnoreCase(product.getType())) {
                if (product.getGeneralStock() <= 0) {
                    alerts.add(new StockAlert(
                            product.getId(),
                            product.getName(),
                            product.getCategory(),
                            product.getType(),
                            "Sin existencias (Stock General: 0)",
                            0
                    ));
                } else if (product.getGeneralStock() <= 3) {
                    alerts.add(new StockAlert(
                            product.getId(),
                            product.getName(),
                            product.getCategory(),
                            product.getType(),
                            "Bajo inventario (Stock General: " + product.getGeneralStock() + ")",
                            product.getGeneralStock()
                    ));
                }
            } else if ("ropa".equalsIgnoreCase(product.getType())) {
                if (product.getVariations() == null || product.getVariations().isEmpty()) {
                    alerts.add(new StockAlert(
                            product.getId(),
                            product.getName(),
                            product.getCategory(),
                            product.getType(),
                            "Sin variaciones de talla/color configuradas",
                            0
                    ));
                } else {
                    for (SizeColorStock var : product.getVariations()) {
                        if (var.getStock() <= 0) {
                            alerts.add(new StockAlert(
                                    product.getId(),
                                    product.getName(),
                                    product.getCategory(),
                                    product.getType(),
                                    "Variación Agotada: Talla " + var.getSize() + " - Color " + var.getColor(),
                                    0
                            ));
                        } else if (var.getStock() <= 2) {
                            alerts.add(new StockAlert(
                                    product.getId(),
                                    product.getName(),
                                    product.getCategory(),
                                    product.getType(),
                                    "Variación con bajo stock: Talla " + var.getSize() + " - Color " + var.getColor() + " (Stock: " + var.getStock() + ")",
                                    var.getStock()
                            ));
                        }
                    }
                }
            }
        }
        return alerts;
    }

    public synchronized void updateInventory(List<CartItemDto> cartItems) {
        for (CartItemDto item : cartItems) {
            Optional<Product> optionalProduct = productRepository.findById(item.getProductId());
            if (optionalProduct.isPresent()) {
                Product product = optionalProduct.get();
                if ("maquillaje".equalsIgnoreCase(product.getType())) {
                    int newStock = Math.max(0, product.getGeneralStock() - item.getQuantity());
                    product.setGeneralStock(newStock);
                } else if ("ropa".equalsIgnoreCase(product.getType())) {
                    if (product.getVariations() != null) {
                        for (SizeColorStock var : product.getVariations()) {
                            boolean sizeMatches = var.getSize() != null && var.getSize().equalsIgnoreCase(item.getSize());
                            boolean colorMatches = var.getColor() != null && var.getColor().equalsIgnoreCase(item.getColor());
                            if (sizeMatches && colorMatches) {
                                int newStock = Math.max(0, var.getStock() - item.getQuantity());
                                var.setStock(newStock);
                                break;
                            }
                        }
                    }
                }
                productRepository.save(product);
            }
        }
    }
}
