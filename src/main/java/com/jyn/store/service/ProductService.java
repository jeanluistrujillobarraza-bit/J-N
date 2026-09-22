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
    private static final long CACHE_TTL_MS = 30 * 60 * 1000L; // 30 minutos de caché ultra-rápida en RAM

    public synchronized void invalidateCache() {
        this.cachedActiveProducts = null;
        this.lastCacheTime = 0;
    }

    @jakarta.annotation.PostConstruct
    public void warmUpCache() {
        new Thread(() -> {
            try {
                Thread.sleep(1000);
                int restored = restoreAllDeletedProducts();
                System.out.println(">>> [J&N Store] Auto-restauración de productos completada: " + restored + " productos activados.");
                getAllProducts();
            } catch (Exception e) {
                System.err.println(">>> [J&N Store] Aviso en inicialización: " + e.getMessage());
            }
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
                org.bson.Document query = new org.bson.Document("deleted", new org.bson.Document("$ne", true));
                com.mongodb.client.FindIterable<org.bson.Document> iterable = mongoTemplate.getCollection("products")
                        .find(query)
                        .batchSize(1000);

                try (com.mongodb.client.MongoCursor<org.bson.Document> cursor = iterable.iterator()) {
                    while (cursor.hasNext()) {
                        try {
                            org.bson.Document doc = cursor.next();
                            Product p = mapDocToProduct(doc, false);
                            if (p != null) {
                                list.add(p);
                            }
                        } catch (Exception docEx) {
                            System.err.println("Aviso leyendo doc: " + docEx.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Aviso leyendo productos via MongoTemplate: " + e.getMessage());
            }
        }

        // Fallback: ProductRepository
        if (list.isEmpty()) {
            try {
                List<Product> allRepo = productRepository.findAll();
                if (allRepo != null) {
                    for (Product p : allRepo) {
                        if (p != null && !p.isDeleted()) {
                            list.add(p);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Aviso leyendo productos via findAll: " + e.getMessage());
            }
        }

        if (!list.isEmpty()) {
            this.cachedActiveProducts = list;
            this.lastCacheTime = System.currentTimeMillis();
        }

        return new ArrayList<>(list);
    }

    private String getSafeString(org.bson.Document doc, String key) {
        if (doc == null || key == null) return null;
        Object val = doc.get(key);
        if (val == null) return null;
        return String.valueOf(val);
    }

    private Product mapDocToProduct(org.bson.Document doc, boolean fullGallery) {
        if (doc == null) return null;
        Product p = new Product();
        p.setId(doc.get("_id") != null ? doc.get("_id").toString() : null);
        p.setName(getSafeString(doc, "name"));
        p.setDescription(getSafeString(doc, "description"));
        
        Object priceObj = doc.get("price");
        if (priceObj instanceof Number) {
            p.setPrice(((Number) priceObj).doubleValue());
        } else if (priceObj != null) {
            try { p.setPrice(Double.parseDouble(String.valueOf(priceObj))); } catch (Exception ignored) {}
        }
        
        String cat = getSafeString(doc, "category");
        String type = getSafeString(doc, "type");
        p.setCategory(cat != null ? cat.trim() : null);
        p.setType(type != null ? type.trim() : null);
        
        Object stockObj = doc.get("generalStock");
        if (stockObj == null) {
            stockObj = doc.get("stock");
        }
        if (stockObj instanceof Number) {
            p.setGeneralStock(((Number) stockObj).intValue());
        } else if (stockObj != null) {
            try { p.setGeneralStock(Integer.parseInt(String.valueOf(stockObj))); } catch (Exception ignored) {}
        }
        
        Object imgsObj = doc.get("images");
        List<String> imgs = new ArrayList<>();
        if (imgsObj instanceof List) {
            for (Object o : (List<?>) imgsObj) {
                if (o != null) {
                    String img = String.valueOf(o);
                    if (!fullGallery && isOversizedInlineImage(img)) {
                        if (imgs.isEmpty()) {
                            imgs.add(img);
                        }
                        continue;
                    }
                    imgs.add(img);
                    if (!fullGallery && imgs.size() >= 2) break;
                }
            }
        } else if (imgsObj != null && !String.valueOf(imgsObj).trim().isEmpty()) {
            String img = String.valueOf(imgsObj);
            imgs.add(img);
        } else {
            String singleImg = getSafeString(doc, "image");
            if (singleImg != null && !singleImg.trim().isEmpty()) {
                imgs.add(singleImg);
            }
        }
        p.setImages(imgs);

        Object varsObj = doc.get("variations");
        if (varsObj instanceof List) {
            List<SizeColorStock> vars = new ArrayList<>();
            for (Object o : (List<?>) varsObj) {
                if (o instanceof org.bson.Document) {
                    org.bson.Document vDoc = (org.bson.Document) o;
                    SizeColorStock scs = new SizeColorStock();
                    scs.setSize(getSafeString(vDoc, "size"));
                    scs.setColor(getSafeString(vDoc, "color"));
                    Object vStock = vDoc.get("stock");
                    if (vStock instanceof Number) {
                        scs.setStock(((Number) vStock).intValue());
                    } else if (vStock != null) {
                        try { scs.setStock(Integer.parseInt(String.valueOf(vStock))); } catch (Exception ignored) {}
                    }
                    vars.add(scs);
                }
            }
            p.setVariations(vars);
        }
        
        Object delObj = doc.get("deleted");
        boolean isDeleted = false;
        if (delObj instanceof Boolean) {
            isDeleted = (Boolean) delObj;
        } else if (delObj instanceof Number) {
            isDeleted = ((Number) delObj).intValue() != 0;
        } else if (delObj instanceof String) {
            isDeleted = "true".equalsIgnoreCase((String) delObj) || "1".equals(delObj);
        }
        p.setDeleted(isDeleted);
        return p;
    }

    private boolean isOversizedInlineImage(String img) {
        return img != null && img.startsWith("data:") && img.length() > 50_000;
    }

    public List<Product> getDeletedProducts() {
        List<Product> list = new ArrayList<>();
        if (mongoTemplate != null) {
            try {
                org.bson.Document query = new org.bson.Document("deleted", true);
                org.bson.Document projection = new org.bson.Document();
                projection.put("name", 1);
                projection.put("description", 1);
                projection.put("price", 1);
                projection.put("category", 1);
                projection.put("type", 1);
                projection.put("generalStock", 1);
                projection.put("stock", 1);
                projection.put("variations", 1);
                projection.put("deleted", 1);
                projection.put("images", new org.bson.Document("$slice", 1));

                com.mongodb.client.FindIterable<org.bson.Document> iterable = mongoTemplate.getCollection("products")
                        .find(query)
                        .projection(projection)
                        .batchSize(100);

                try (com.mongodb.client.MongoCursor<org.bson.Document> cursor = iterable.iterator()) {
                    while (cursor.hasNext()) {
                        try {
                            org.bson.Document doc = cursor.next();
                            Product p = mapDocToProduct(doc, false);
                            if (p != null) {
                                list.add(p);
                            }
                        } catch (Exception docEx) {
                            System.err.println("Aviso leyendo documento eliminado: " + docEx.getMessage());
                        }
                    }
                }
                return list;
            } catch (Exception e) {
                System.err.println("Aviso leyendo eliminados via MongoTemplate: " + e.getMessage());
            }
        }
        try {
            return productRepository.findDeletedProducts();
        } catch (Exception e) {
            System.err.println("Error al obtener productos eliminados: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public Optional<Product> getProductById(String id) {
        if (id == null) return Optional.empty();
        if (mongoTemplate != null) {
            try {
                org.bson.Document query;
                if (org.bson.types.ObjectId.isValid(id)) {
                    query = new org.bson.Document("_id", new org.bson.types.ObjectId(id));
                } else {
                    query = new org.bson.Document("_id", id);
                }
                org.bson.Document doc = mongoTemplate.getCollection("products").find(query).first();
                if (doc != null) {
                    return Optional.ofNullable(mapDocToProduct(doc, true));
                }
            } catch (Exception e) {
                System.err.println("Aviso obteniendo producto por ID via MongoTemplate: " + e.getMessage());
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

    // Restore ALL deleted products back to active catalog
    public int restoreAllDeletedProducts() {
        int count = 0;
        if (mongoTemplate != null) {
            try {
                org.bson.Document query = new org.bson.Document("deleted", true);
                org.bson.Document update = new org.bson.Document("$set", new org.bson.Document("deleted", false));
                var result = mongoTemplate.getCollection("products").updateMany(query, update);
                count = (int) result.getModifiedCount();
            } catch (Exception e) {
                System.err.println("Aviso restaurando todos via mongoTemplate: " + e.getMessage());
            }
        }
        if (count == 0) {
            try {
                List<Product> deleted = productRepository.findDeletedProducts();
                if (deleted != null && !deleted.isEmpty()) {
                    for (Product p : deleted) {
                        p.setDeleted(false);
                        productRepository.save(p);
                        count++;
                    }
                }
            } catch (Exception e) {
                System.err.println("Aviso restaurando todos via repository: " + e.getMessage());
            }
        }
        invalidateCache();
        return count;
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

        List<Product> result = new ArrayList<>();

        for (Product p : allActive) {
            // 1. Department filter (priority: product.type)
            if (hasMainCategory) {
                String main = mainCategory.trim();
                boolean matchesMain = p.getType() != null && p.getType().trim().equalsIgnoreCase(main);
                if (!matchesMain) {
                    continue; // Does not belong to this department
                }
            }

            // 2. Subcategory filter (explicit selection only)
            if (hasCategory) {
                String cat = category.trim();
                boolean matchesCat = p.getCategory() != null && p.getCategory().trim().equalsIgnoreCase(cat);
                if (!matchesCat) {
                    continue; // Does not match selected subcategory
                }
            }

            // 3. Search text query (name or description)
            if (hasQuery) {
                String q = query.trim().toLowerCase();
                boolean nameMatch = p.getName() != null && p.getName().toLowerCase().contains(q);
                boolean descMatch = p.getDescription() != null && p.getDescription().toLowerCase().contains(q);
                if (!nameMatch && !descMatch) {
                    continue;
                }
            }

            result.add(p);
        }

        return result;
    }

    public com.jyn.store.dto.PageResponse<Product> getProductsPaged(
            int page, int size, String category, String mainCategory, String query, String type) {
        
        // If type is passed, treat as mainCategory if not already set
        String effectiveMain = mainCategory;
        if ((effectiveMain == null || effectiveMain.equalsIgnoreCase("todos") || effectiveMain.trim().isEmpty())
                && (type != null && !type.equalsIgnoreCase("todos") && !type.trim().isEmpty())) {
            effectiveMain = type;
        }

        List<Product> filtered = searchProducts(category, effectiveMain, query);

        long totalElements = filtered.size();
        int safePage = Math.max(0, page);
        int safeSize = size > 0 ? size : 15;
        
        int fromIndex = safePage * safeSize;
        List<Product> pageContent;
        if (fromIndex >= filtered.size()) {
            pageContent = new ArrayList<>();
        } else {
            int toIndex = Math.min(fromIndex + safeSize, filtered.size());
            pageContent = new ArrayList<>(filtered.subList(fromIndex, toIndex));
        }

        return new com.jyn.store.dto.PageResponse<>(pageContent, safePage, safeSize, totalElements);
    }

    public com.jyn.store.dto.PageResponse<Product> getDeletedProductsPaged(int page, int size) {
        List<Product> deleted = getDeletedProducts();
        long totalElements = deleted.size();
        int safePage = Math.max(0, page);
        int safeSize = size > 0 ? size : 15;
        
        int fromIndex = safePage * safeSize;
        List<Product> pageContent;
        if (fromIndex >= deleted.size()) {
            pageContent = new ArrayList<>();
        } else {
            int toIndex = Math.min(fromIndex + safeSize, deleted.size());
            pageContent = new ArrayList<>(deleted.subList(fromIndex, toIndex));
        }

        return new com.jyn.store.dto.PageResponse<>(pageContent, safePage, safeSize, totalElements);
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
