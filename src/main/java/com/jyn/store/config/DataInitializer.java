package com.jyn.store.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jyn.store.model.Category;
import com.jyn.store.model.MainCategory;
import com.jyn.store.model.Product;
import com.jyn.store.model.SizeColorStock;
import com.jyn.store.model.User;
import com.jyn.store.repository.CategoryRepository;
import com.jyn.store.repository.MainCategoryRepository;
import com.jyn.store.repository.ProductRepository;
import com.jyn.store.repository.UserRepository;
import com.jyn.store.util.PasswordUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer {

    @Autowired
    private MainCategoryRepository mainCategoryRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${admin.username:jayner}")
    private String adminUsername;

    @Value("${admin.password:jayner1801}")
    private String adminPassword;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @EventListener(ApplicationReadyEvent.class)
    public void initializeDatabase() {
        System.out.println("=================================================");
        System.out.println(">>> [Auto-Seed] Verificando estado de la Base de Datos...");

        try {
            seedAdminUser();
            seedMainCategories();
            seedCategories();
            seedProducts();
            System.out.println(">>> [Auto-Seed] Base de datos lista y sincronizada correctamente.");
            System.out.println("=================================================");
        } catch (Exception e) {
            System.err.println(">>> [Auto-Seed] Error durante la inicialización automática: " + e.getMessage());
        }
    }

    private void seedAdminUser() {
        try {
            if (userRepository.findByUsernameIgnoreCase(adminUsername).isEmpty()) {
                User admin = new User();
                admin.setUsername(adminUsername);
                admin.setPassword(PasswordUtils.hashPassword(adminPassword));
                admin.setFirstName("Jayner");
                admin.setLastName("J&N");
                admin.setRole("ADMIN");
                userRepository.save(admin);
                System.out.println(">>> [Auto-Seed] Usuario Administrador '" + adminUsername + "' creado exitosamente.");
            }
        } catch (Exception e) {
            System.err.println(">>> [Auto-Seed] Aviso creando usuario admin: " + e.getMessage());
        }
    }

    private void seedMainCategories() {
        try {
            if (mainCategoryRepository.count() == 0) {
                List<String> defaultMain = Arrays.asList("Maquillaje", "Ropa", "Accesorios", "Perfumes", "Zapatos");
                for (String name : defaultMain) {
                    mainCategoryRepository.save(new MainCategory(name));
                }
                System.out.println(">>> [Auto-Seed] 5 Departamentos principales creados.");
            }
        } catch (Exception e) {
            System.err.println(">>> [Auto-Seed] Error al inicializar departamentos: " + e.getMessage());
        }
    }

    private void seedCategories() {
        try {
            if (categoryRepository.count() == 0) {
                List<Category> cats = new ArrayList<>();
                // Categorías de Maquillaje
                cats.add(new Category("BASES", "Maquillaje"));
                cats.add(new Category("CORRECTORES", "Maquillaje"));
                cats.add(new Category("POLVOS", "Maquillaje"));
                cats.add(new Category("RUBORES", "Maquillaje"));
                cats.add(new Category("ILUMINADORES", "Maquillaje"));
                cats.add(new Category("CONTORNOS", "Maquillaje"));
                cats.add(new Category("SOMBRAS", "Maquillaje"));
                cats.add(new Category("DELINIADORES", "Maquillaje"));
                cats.add(new Category("MASCARA DE PESTAÑAS", "Maquillaje"));
                cats.add(new Category("BRILLOS/GLOSS", "Maquillaje"));
                cats.add(new Category("CEJAS", "Maquillaje"));
                cats.add(new Category("SKINCARE", "Maquillaje"));
                cats.add(new Category("BROCHAS Y ACCESORIOS", "Maquillaje"));
                cats.add(new Category("PESTAÑAS", "Maquillaje"));

                // Categorías de Ropa
                cats.add(new Category("VESTIDOS", "Ropa"));
                cats.add(new Category("BLUSAS Y TOPS", "Ropa"));
                cats.add(new Category("PANTALONES Y JEANS", "Ropa"));
                cats.add(new Category("CONJUNTOS", "Ropa"));

                categoryRepository.saveAll(cats);
                System.out.println(">>> [Auto-Seed] " + cats.size() + " Subcategorías creadas automáticamente.");
            }
        } catch (Exception e) {
            System.err.println(">>> [Auto-Seed] Error al inicializar subcategorías: " + e.getMessage());
        }
    }

    private void seedProducts() {
        try {
            if (productRepository.count() == 0) {
                System.out.println(">>> [Auto-Seed] Base de datos sin productos. Cargando catálogo inicial...");
                List<Product> productsToSave = loadProductsFromSeedJson();

                if (productsToSave == null || productsToSave.isEmpty()) {
                    productsToSave = generateDefaultProductsFallback();
                }

                if (!productsToSave.isEmpty()) {
                    productRepository.saveAll(productsToSave);
                    System.out.println(">>> [Auto-Seed] " + productsToSave.size() + " Productos iniciales insertados con éxito en la base de datos.");
                }
            } else {
                System.out.println(">>> [Auto-Seed] Base de datos ya contiene " + productRepository.count() + " productos.");
            }
        } catch (Exception e) {
            System.err.println(">>> [Auto-Seed] Error al inicializar productos: " + e.getMessage());
        }
    }

    private List<Product> loadProductsFromSeedJson() {
        try {
            ClassPathResource resource = new ClassPathResource("seed-data.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    JsonNode root = objectMapper.readTree(is);
                    JsonNode prodsNode = root.get("products");
                    if (prodsNode != null && prodsNode.isArray() && prodsNode.size() > 0) {
                        List<Product> list = new ArrayList<>();
                        for (JsonNode n : prodsNode) {
                            Product p = new Product();
                            p.setName(n.has("name") ? n.get("name").asText() : "Producto");
                            p.setDescription(n.has("description") ? n.get("description").asText() : "");
                            p.setPrice(n.has("price") ? n.get("price").asDouble() : 0.0);
                            p.setCategory(n.has("category") ? n.get("category").asText() : "General");
                            p.setType(n.has("type") ? n.get("type").asText() : "maquillaje");
                            p.setGeneralStock(n.has("generalStock") ? n.get("generalStock").asInt() : 10);
                            p.setDeleted(false);

                            List<String> imgs = new ArrayList<>();
                            if (n.has("images") && n.get("images").isArray()) {
                                for (JsonNode imgNode : n.get("images")) {
                                    imgs.add(imgNode.asText());
                                }
                            }
                            if (imgs.isEmpty()) {
                                imgs.add("https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop");
                            }
                            p.setImages(imgs);

                            if (n.has("variations") && n.get("variations").isArray()) {
                                List<SizeColorStock> vars = new ArrayList<>();
                                for (JsonNode vNode : n.get("variations")) {
                                    SizeColorStock scs = new SizeColorStock();
                                    scs.setSize(vNode.has("size") ? vNode.get("size").asText() : "M");
                                    scs.setColor(vNode.has("color") ? vNode.get("color").asText() : "Estándar");
                                    scs.setStock(vNode.has("stock") ? vNode.get("stock").asInt() : 5);
                                    vars.add(scs);
                                }
                                p.setVariations(vars);
                            }

                            list.add(p);
                        }
                        return list;
                    }
                }
            }
        } catch (Exception e) {
            System.err.println(">>> [Auto-Seed] No se pudo leer seed-data.json: " + e.getMessage());
        }
        return null;
    }

    private List<Product> generateDefaultProductsFallback() {
        List<Product> list = new ArrayList<>();

        list.add(createSampleProduct("BASE ANI-K ALTA COBERTURA", "Base líquida de larga duración con acabado mate natural.", 38000.0, "BASES", "maquillaje", 15, "https://images.unsplash.com/photo-1631730486784-5456119f69ae?q=80&w=600&auto=format&fit=crop"));
        list.add(createSampleProduct("RUBOR ANI-K DÚO", "Rubor en polvo satinado con alta pigmentación.", 20000.0, "RUBORES", "maquillaje", 25, "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=600&auto=format&fit=crop"));
        list.add(createSampleProduct("POLVOS SUELTO TRASLÚCIDO", "Polvo suelto micropulverizado para sellar el maquillaje.", 36000.0, "POLVOS", "maquillaje", 18, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop"));
        list.add(createSampleProduct("ILUMINADOR GLOW PROFESIONAL", "Iluminador compacto con perlas reflectantes para un brillo radiante.", 23000.0, "ILUMINADORES", "maquillaje", 12, "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop"));
        list.add(createSampleProduct("SET DE BROCHAS PROFESIONALES", "Kit de 10 brochas de pelo sintético ultra suave para rostro y ojos.", 45000.0, "BROCHAS Y ACCESORIOS", "maquillaje", 20, "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=600&auto=format&fit=crop"));
        list.add(createSampleProduct("CORRECTOR FULL COVERAGE", "Corrector de ojeras e imperfecciones con aplicador de precisión.", 22000.0, "CORRECTORES", "maquillaje", 30, "https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=600&auto=format&fit=crop"));
        list.add(createSampleProduct("SERUM FACIAL HIDRATANTE", "Serum con ácido hialurónico y vitamina C para revitalizar la piel.", 35000.0, "SKINCARE", "maquillaje", 14, "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop"));
        list.add(createSampleProduct("GLOSS LABIAL BRILLO ESPEJO", "Brillo de labios hidratante no pegajoso con aroma frutal.", 18000.0, "BRILLOS/GLOSS", "maquillaje", 40, "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=600&auto=format&fit=crop"));

        // Ejemplo Ropa
        Product dress = new Product();
        dress.setName("VESTIDO ELEGANTE SATINADO");
        dress.setDescription("Vestido largo con caída fluida, ideal para eventos de noche.");
        dress.setPrice(85000.0);
        dress.setCategory("VESTIDOS");
        dress.setType("ropa");
        dress.setDeleted(false);
        dress.setImages(Arrays.asList("https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop"));
        List<SizeColorStock> vars = new ArrayList<>();
        vars.add(new SizeColorStock("S", "Rojo Pasión", 4));
        vars.add(new SizeColorStock("M", "Rojo Pasión", 6));
        vars.add(new SizeColorStock("L", "Negro", 5));
        dress.setVariations(vars);
        list.add(dress);

        return list;
    }

    private Product createSampleProduct(String name, String desc, double price, String cat, String type, int stock, String img) {
        Product p = new Product();
        p.setName(name);
        p.setDescription(desc);
        p.setPrice(price);
        p.setCategory(cat);
        p.setType(type);
        p.setGeneralStock(stock);
        p.setDeleted(false);
        p.setImages(Arrays.asList(img));
        return p;
    }
}
