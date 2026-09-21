package com.jyn.store.controller;

import com.jyn.store.dto.CartItemDto;
import com.jyn.store.dto.StockAlert;
import com.jyn.store.model.Product;
import com.jyn.store.service.ProductService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    // Helper to check admin status
    private boolean isNotAdmin(HttpSession session) {
        Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
        return isAdmin == null || !isAdmin;
    }

    @GetMapping
    public ResponseEntity<List<Product>> getProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String mainCategory,
            @RequestParam(required = false) String query) {
        List<Product> products = productService.searchProducts(category, mainCategory, query);
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.maxAge(60, java.util.concurrent.TimeUnit.SECONDS).cachePublic())
                .body(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable String id) {
        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> saveProduct(@RequestBody Product product, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        
        try {
            // Simple validations
            if (product.getName() == null || product.getName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
            }
            if (product.getPrice() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "El precio debe ser mayor a 0"));
            }
            
            Product saved = productService.saveProduct(product);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al guardar el producto: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable String id, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Tu sesión de administrador ha expirado. Por favor, inicia sesión nuevamente."));
        }
        try {
            productService.deleteProduct(id);
            return ResponseEntity.ok(Map.of("message", "Producto movido a la papelera exitosamente"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al mover producto a papelera: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<?> restoreProduct(@PathVariable String id, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado. Sesión expirada."));
        }
        try {
            productService.restoreProduct(id);
            return ResponseEntity.ok(Map.of("message", "Producto restaurado exitosamente"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al restaurar producto: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<?> permanentDeleteProduct(@PathVariable String id, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado. Sesión expirada."));
        }
        try {
            productService.permanentDeleteProduct(id);
            return ResponseEntity.ok(Map.of("message", "Producto eliminado definitivamente de la base de datos"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al eliminar producto: " + e.getMessage()));
        }
    }

    @GetMapping("/deleted")
    public ResponseEntity<?> getDeletedProducts(HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        return ResponseEntity.ok(productService.getDeletedProducts());
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> getStockAlerts(HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        return ResponseEntity.ok(productService.getStockAlerts());
    }



    @Autowired(required = false)
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @GetMapping("/diagnose-db")
    public ResponseEntity<?> diagnoseDb() {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("version", "2026-09-19-v4-full-breakdown");
        try {
            if (mongoTemplate != null) {
                String dbName = mongoTemplate.getDb().getName();
                result.put("currentDatabase", dbName);
                
                java.util.Set<String> collections = mongoTemplate.getCollectionNames();
                result.put("collections", collections);
                
                Map<String, Long> counts = new java.util.LinkedHashMap<>();
                for (String col : collections) {
                    counts.put(col, mongoTemplate.getCollection(col).countDocuments());
                }
                result.put("counts", counts);

                long deletedTrue = mongoTemplate.getCollection("products").countDocuments(new org.bson.Document("deleted", true));
                long deletedFalse = mongoTemplate.getCollection("products").countDocuments(new org.bson.Document("deleted", false));
                long deletedMissing = mongoTemplate.getCollection("products").countDocuments(new org.bson.Document("deleted", new org.bson.Document("$exists", false)));
                
                Map<String, Object> delStats = new java.util.LinkedHashMap<>();
                delStats.put("deleted_true", deletedTrue);
                delStats.put("deleted_false", deletedFalse);
                delStats.put("deleted_missing", deletedMissing);
                result.put("deleted_breakdown", delStats);
            }
            List<Product> prods = productService.getAllProducts();
            result.put("productService_getAllProducts_count", prods.size());
            
            List<Product> deletedProds = productService.getDeletedProducts();
            result.put("productService_deletedProducts_count", deletedProds.size());
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/restore-all-in-db")
    public ResponseEntity<?> restoreAllInDb() {
        try {
            if (mongoTemplate != null) {
                var updateResult = mongoTemplate.getCollection("products").updateMany(
                    new org.bson.Document(),
                    new org.bson.Document("$set", new org.bson.Document("deleted", false))
                );
                productService.invalidateCache();
                Map<String, Object> res = new java.util.LinkedHashMap<>();
                res.put("message", "Todos los productos marcados como activos");
                res.put("matchedCount", updateResult.getMatchedCount());
                res.put("modifiedCount", updateResult.getModifiedCount());
                res.put("totalActiveNow", productService.getAllProducts().size());
                return ResponseEntity.ok(res);
            }
            return ResponseEntity.badRequest().body(Map.of("error", "mongoTemplate no disponible"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/upload-images")
    public ResponseEntity<?> uploadImages(@RequestParam("files") MultipartFile[] files, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }

        List<String> imageUrls = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            try {
                String contentType = file.getContentType();
                if (contentType == null || !contentType.startsWith("image/")) {
                    contentType = "image/jpeg";
                }
                String base64 = java.util.Base64.getEncoder().encodeToString(file.getBytes());
                String dataUrl = "data:" + contentType + ";base64," + base64;
                imageUrls.add(dataUrl);
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Error al procesar archivos: " + e.getMessage()));
            }
        }

        return ResponseEntity.ok(Map.of("urls", imageUrls));
    }
}
