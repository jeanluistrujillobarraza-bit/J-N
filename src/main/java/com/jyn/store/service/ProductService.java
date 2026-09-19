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

    @Autowired(required = false)
    private CategoryRepository categoryRepository;

    @Autowired(required = false)
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    private volatile List<Product> cachedActiveProducts = null;
    private volatile long lastCacheTime = 0;
    private static final long CACHE_TTL_MS = 60_000;

    public synchronized void invalidateCache() {
        this.cachedActiveProducts = null;
        this.lastCacheTime = 0;
    }

    @jakarta.annotation.PostConstruct
    public void warmUpCache() {
        new Thread(() -> {
            try {
                Thread.sleep(800);
                getAllProducts();
            } catch (Exception ignored) {}
        }).start();
    }

    public List<Product> getAllProducts() {
        long now = System.currentTimeMillis();
        List<Product> cached = this.cachedActiveProducts;
        if (cached != null && (now - lastCacheTime < CACHE_TTL_MS) && !cached.isEmpty()) {
            return new ArrayList<>(cached);
        }

        List<Product> list = new ArrayList<>();
        
        if (mongoTemplate != null) {
            try {
                // Projection ultra-rápida: trae todos los datos y solo la imagen principal (slice: 1)
                // Esto reduce el peso de 468MB a solo 4MB, evitando timeouts de red
                org.bson.conversions.Bson projection = com.mongodb.client.model.Projections.fields(
                    com.mongodb.client.model.Projections.include("_id", "name", "description", "price", "category", "type", "generalStock", "variations", "deleted"),
                    com.mongodb.client.model.Projections.slice("images", 1)
                );

                List<org.bson.Document> docs = mongoTemplate.getCollection("products")
                    .find()
                    .projection(projection)
                    .into(new ArrayList<>());

                for (org.bson.Document doc : docs) {
                    Product p = mapDocToProduct(doc);
                    if (p != null) {
                        list.add(p);
                    }
                }
                System.out.println("Cargados " + list.size() + " productos optimizados desde MongoDB.");
            } catch (Exception ex) {
                System.err.println("Error en lectura optimizada de MongoDB: " + ex.getMessage());
            }
        }

        if (list.isEmpty()) {
            try {
                list = productRepository.findAll();
            } catch (Exception ignored) {}
        }

        if (list == null || list.isEmpty()) {
            return new ArrayList<>();
        }

        List<Product> active = new ArrayList<>();
        for (Product p : list) {
            if (p != null && !p.isDeleted()) {
                active.add(p);
            }
        }

        if (active.isEmpty() && !list.isEmpty()) {
            active = list;
        }

        this.cachedActiveProducts = active;
        this.lastCacheTime = System.currentTimeMillis();
        return new ArrayList<>(active);
    }

    private Product mapDocToProduct(org.bson.Document doc) {
        if (doc == null) return null;
        Product p = new Product();
        p.setId(doc.get("_id") != null ? doc.get("_id").toString() : null);
        p.setName(doc.getString("name"));
        p.setDescription(doc.getString("description"));
        
        Object priceObj = doc.get("price");
        if (priceObj instanceof Number) {
            p.setPrice(((Number) priceObj).doubleValue());
        } else if (priceObj instanceof String) {
            try { p.setPrice(Double.parseDouble((String) priceObj)); } catch (Exception ignored) {}
        }
        
        String cat = doc.getString("category");
        String type = doc.getString("type");
        p.setCategory(cat != null ? cat : (type != null ? type : "General"));
        p.setType(type != null ? type : (cat != null ? cat.toLowerCase() : "general"));
        
        Object stockObj = doc.get("generalStock");
        if (stockObj == null) {
            stockObj = doc.get("stock");
        }
        if (stockObj instanceof Number) {
            p.setGeneralStock(((Number) stockObj).intValue());
        }
        
        Object imgsObj = doc.get("images");
        if (imgsObj instanceof List) {
            List<String> imgs = new ArrayList<>();
            for (Object o : (List<?>) imgsObj) {
                if (o != null) imgs.add(o.toString());
            }
            p.setImages(imgs);
        } else if (imgsObj instanceof String) {
            List<String> imgs = new ArrayList<>();
            imgs.add((String) imgsObj);
            p.setImages(imgs);
        } else if (doc.getString("image") != null) {
            List<String> imgs = new ArrayList<>();
            imgs.add(doc.getString("image"));
            p.setImages(imgs);
        }

        Object varsObj = doc.get("variations");
        if (varsObj instanceof List) {
            List<SizeColorStock> vars = new ArrayList<>();
            for (Object o : (List<?>) varsObj) {
                if (o instanceof org.bson.Document) {
                    org.bson.Document vDoc = (org.bson.Document) o;
                    SizeColorStock scs = new SizeColorStock();
                    scs.setSize(vDoc.getString("size"));
                    scs.setColor(vDoc.getString("color"));
                    Object vStock = vDoc.get("stock");
                    if (vStock instanceof Number) {
                        scs.setStock(((Number) vStock).intValue());
                    }
                    vars.add(scs);
                }
            }
            p.setVariations(vars);
        }
        
        Boolean del = doc.getBoolean("deleted");
        p.setDeleted(Boolean.TRUE.equals(del));
        return p;
    }

    public List<Product> getDeletedProducts() {
        try {
            List<Product> all = productRepository.findAll();
            List<Product> deleted = new ArrayList<>();
            for (Product p : all) {
                if (p != null && p.isDeleted()) {
                    deleted.add(p);
                }
            }
            return deleted;
        } catch (Exception e) {
            System.err.println("Error al obtener productos eliminados de MongoDB: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public Optional<Product> getProductById(String id) {
        if (id == null) return Optional.empty();
        if (mongoTemplate != null) {
            try {
                org.bson.Document doc = null;
                if (org.bson.types.ObjectId.isValid(id)) {
                    doc = mongoTemplate.getCollection("products").find(new org.bson.Document("_id", new org.bson.types.ObjectId(id))).first();
                }
                if (doc == null) {
                    doc = mongoTemplate.getCollection("products").find(new org.bson.Document("_id", id)).first();
                }
                if (doc != null) {
                    return Optional.ofNullable(mapDocToProduct(doc));
                }
            } catch (Exception e) {
                System.err.println("Error buscando producto por ID: " + e.getMessage());
            }
        }
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
        Product saved = productRepository.save(product);
        invalidateCache();
        return saved;
    }

    // Move to Trash (Soft Delete)
    public void deleteProduct(String id) {
        Optional<Product> optional = productRepository.findById(id);
        if (optional.isPresent()) {
            Product prod = optional.get();
            prod.setDeleted(true);
            productRepository.save(prod);
            invalidateCache();
        }
    }

    // Restore from Trash
    public void restoreProduct(String id) {
        Optional<Product> optional = productRepository.findById(id);
        if (optional.isPresent()) {
            Product prod = optional.get();
            prod.setDeleted(false);
            productRepository.save(prod);
            invalidateCache();
        }
    }

    // Permanent Deletion
    public void permanentDeleteProduct(String id) {
        productRepository.deleteById(id);
        invalidateCache();
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
