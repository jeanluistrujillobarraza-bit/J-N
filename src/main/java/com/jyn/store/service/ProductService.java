package com.jyn.store.service;

import com.jyn.store.dto.CartItemDto;
import com.jyn.store.dto.StockAlert;
import com.jyn.store.model.Category;
import com.jyn.store.model.Product;
import com.jyn.store.model.SizeColorStock;
import com.jyn.store.repository.CategoryRepository;
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

    @Autowired
    private CategoryRepository categoryRepository;

    public List<Product> getAllProducts() {
        List<Product> all = productRepository.findAll();
        List<Product> active = new ArrayList<>();
        for (Product p : all) {
            if (!p.isDeleted()) {
                active.add(p);
            }
        }
        return active;
    }

    public List<Product> getDeletedProducts() {
        List<Product> all = productRepository.findAll();
        List<Product> deleted = new ArrayList<>();
        for (Product p : all) {
            if (p.isDeleted()) {
                deleted.add(p);
            }
        }
        return deleted;
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

    public List<Product> searchProducts(String category, String mainCategory, String query) {
        List<Product> allActive = getAllProducts();

        boolean hasCategory = category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("todos");
        boolean hasMainCategory = mainCategory != null && !mainCategory.trim().isEmpty() && !mainCategory.equalsIgnoreCase("todos");
        boolean hasQuery = query != null && !query.trim().isEmpty();

        // 1. Specific subcategory filter
        if (hasCategory) {
            String cat = category.trim().toLowerCase();
            List<Product> filtered = new ArrayList<>();
            for (Product p : allActive) {
                boolean catMatches = (p.getCategory() != null && p.getCategory().equalsIgnoreCase(cat))
                        || (p.getType() != null && p.getType().equalsIgnoreCase(cat));
                if (catMatches) {
                    if (hasQuery) {
                        String q = query.trim().toLowerCase();
                        boolean nameMatch = p.getName() != null && p.getName().toLowerCase().contains(q);
                        boolean descMatch = p.getDescription() != null && p.getDescription().toLowerCase().contains(q);
                        if (nameMatch || descMatch) {
                            filtered.add(p);
                        }
                    } else {
                        filtered.add(p);
                    }
                }
            }
            return filtered;
        }

        // 2. Main category (department) filter
        if (hasMainCategory) {
            String main = mainCategory.trim();
            List<Category> allCategories = categoryRepository.findAll();
            List<String> matchingCategoryNames = new ArrayList<>();
            for (Category c : allCategories) {
                if (main.equalsIgnoreCase(c.getParentCategory()) || main.equalsIgnoreCase(c.getName())) {
                    matchingCategoryNames.add(c.getName());
                }
            }
            matchingCategoryNames.add(main);

            List<Product> filtered = new ArrayList<>();

            for (Product p : allActive) {
                boolean matchesMain = (p.getType() != null && p.getType().equalsIgnoreCase(main))
                        || (p.getCategory() != null && matchingCategoryNames.stream().anyMatch(cn -> cn.equalsIgnoreCase(p.getCategory())));

                if (matchesMain) {
                    if (hasQuery) {
                        String q = query.trim().toLowerCase();
                        boolean nameMatch = p.getName() != null && p.getName().toLowerCase().contains(q);
                        boolean descMatch = p.getDescription() != null && p.getDescription().toLowerCase().contains(q);
                        if (nameMatch || descMatch) {
                            filtered.add(p);
                        }
                    } else {
                        filtered.add(p);
                    }
                }
            }
            return filtered;
        }

        // 3. Global search query
        if (hasQuery) {
            String q = query.trim().toLowerCase();
            List<Product> filtered = new ArrayList<>();
            for (Product p : allActive) {
                boolean nameMatch = p.getName() != null && p.getName().toLowerCase().contains(q);
                boolean descMatch = p.getDescription() != null && p.getDescription().toLowerCase().contains(q);
                boolean catMatch = p.getCategory() != null && p.getCategory().toLowerCase().contains(q);
                boolean typeMatch = p.getType() != null && p.getType().toLowerCase().contains(q);
                if (nameMatch || descMatch || catMatch || typeMatch) {
                    filtered.add(p);
                }
            }
            return filtered;
        }

        // 4. Default: all active products
        return allActive;
    }

    public List<StockAlert> getStockAlerts() {
        List<StockAlert> alerts = new ArrayList<>();
        List<Product> products = getAllProducts();

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
