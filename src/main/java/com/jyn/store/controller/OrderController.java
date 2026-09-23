package com.jyn.store.controller;

import com.jyn.store.dto.OrderRequest;
import com.jyn.store.model.Order;
import com.jyn.store.model.Product;
import com.jyn.store.service.OrderService;
import com.jyn.store.service.ProductService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductService productService;

    private boolean isNotAdmin(HttpSession session) {
        Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
        return isAdmin == null || !isAdmin;
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody OrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El pedido no contiene artículos"));
        }
        if (request.getCustomerName() == null || request.getCustomerName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del cliente es obligatorio"));
        }
        if (request.getCustomerPhone() == null || request.getCustomerPhone().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El número de WhatsApp es obligatorio"));
        }
        try {
            Order newOrder = orderService.createOrder(
                request.getCustomerName(),
                request.getCustomerPhone(),
                request.getItems()
            );
            return ResponseEntity.ok(newOrder);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al registrar el pedido: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllActiveOrders(HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        return ResponseEntity.ok(orderService.getAllActiveOrders());
    }

    @GetMapping("/deleted")
    public ResponseEntity<?> getDeletedOrders(HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        return ResponseEntity.ok(orderService.getDeletedOrders());
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeOrder(@PathVariable String id, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        try {
            Order completedOrder = orderService.completeOrder(id);
            return ResponseEntity.ok(completedOrder);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<?> restoreOrder(@PathVariable String id, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        try {
            orderService.restoreOrder(id);
            return ResponseEntity.ok(Map.of("message", "Pedido restaurado correctamente"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al restaurar el pedido: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> softDeleteOrder(@PathVariable String id, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        try {
            orderService.softDeleteOrder(id);
            return ResponseEntity.ok(Map.of("message", "Pedido movido a la papelera"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al eliminar el pedido: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<?> permanentlyDeleteOrder(@PathVariable String id, HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        try {
            orderService.permanentlyDeleteOrder(id);
            return ResponseEntity.ok(Map.of("message", "Pedido eliminado permanentemente"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al purgar el pedido: " + e.getMessage()));
        }
    }

    @GetMapping("/receipt/{id}")
    public ResponseEntity<String> getReceiptHtml(@PathVariable String id) {
        java.util.Optional<Order> orderOpt = orderService.getOrderById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("<h1>Pedido no encontrado</h1>");
        }
        Order order = orderOpt.get();
        
        StringBuilder rows = new StringBuilder();
        for (com.jyn.store.model.OrderItem item : order.getItems()) {
            String detail = "ropa".equalsIgnoreCase(item.getType()) ? 
                    String.format("(Talla: %s | Color: %s)", item.getSize(), item.getColor()) : "Maquillaje";
            
            rows.append("<tr>")
                .append(String.format("<td>%s</td>", item.getName()))
                .append(String.format("<td>%s</td>", detail))
                .append(String.format("<td>%d</td>", item.getQuantity()))
                .append(String.format("<td>$%s</td>", formatPrice(item.getPrice())))
                .append(String.format("<td class=\"text-right\">$%s</td>", formatPrice(item.getPrice() * item.getQuantity())))
                .append("</tr>");
        }

        java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        java.time.format.DateTimeFormatter timeFormatter = java.time.format.DateTimeFormatter.ofPattern("hh:mm a");
        String dateStr = order.getCreatedAt() != null ? order.getCreatedAt().format(dateFormatter) : "";
        String timeStr = order.getCreatedAt() != null ? order.getCreatedAt().format(timeFormatter) : "";

        String html = "<!DOCTYPE html>\n" +
                "<html lang=\"es\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <title>Recibo de Pedido J&N #" + order.getOrderNumber() + "</title>\n" +
                "    <style>\n" +
                "        :root {\n" +
                "            --gold: #d4af37;\n" +
                "            --pastel-pink: #fff0f5;\n" +
                "            --pastel-dark-pink: #ffb6c1;\n" +
                "            --dark-neutral: #2c2c2c;\n" +
                "            --gray-light: #f5f5f5;\n" +
                "            --gray-dark: #666;\n" +
                "        }\n" +
                "        body {\n" +
                "            font-family: 'Montserrat', sans-serif;\n" +
                "            margin: 0;\n" +
                "            padding: 40px 20px;\n" +
                "            background-color: var(--pastel-pink);\n" +
                "            color: var(--dark-neutral);\n" +
                "        }\n" +
                "        .invoice-card {\n" +
                "            max-width: 600px;\n" +
                "            margin: 0 auto;\n" +
                "            background-color: #fff;\n" +
                "            border-radius: 12px;\n" +
                "            box-shadow: 0 4px 15px rgba(0,0,0,0.05);\n" +
                "            padding: 40px;\n" +
                "            border: 1px solid var(--pastel-dark-pink);\n" +
                "        }\n" +
                "        .header {\n" +
                "            text-align: center;\n" +
                "            margin-bottom: 30px;\n" +
                "        }\n" +
                "        .logo {\n" +
                "            font-size: 32px;\n" +
                "            font-weight: bold;\n" +
                "            color: var(--dark-neutral);\n" +
                "            letter-spacing: 2px;\n" +
                "            margin: 0;\n" +
                "        }\n" +
                "        .subtitle {\n" +
                "            font-size: 10px;\n" +
                "            letter-spacing: 3px;\n" +
                "            color: var(--gold);\n" +
                "            text-transform: uppercase;\n" +
                "            margin: 5px 0 0 0;\n" +
                "        }\n" +
                "        .title {\n" +
                "            text-align: center;\n" +
                "            font-size: 20px;\n" +
                "            color: var(--pastel-dark-pink);\n" +
                "            margin-top: 20px;\n" +
                "            font-style: italic;\n" +
                "            font-weight: 500;\n" +
                "        }\n" +
                "        .meta-row {\n" +
                "            display: flex;\n" +
                "            justify-content: space-between;\n" +
                "            margin-top: 30px;\n" +
                "            font-size: 13px;\n" +
                "            color: var(--gray-dark);\n" +
                "            border-bottom: 1px solid var(--gray-light);\n" +
                "            padding-bottom: 15px;\n" +
                "        }\n" +
                "        .meta-block strong {\n" +
                "            color: var(--dark-neutral);\n" +
                "        }\n" +
                "        .items-table {\n" +
                "            width: 100%;\n" +
                "            border-collapse: collapse;\n" +
                "            margin-top: 25px;\n" +
                "        }\n" +
                "        .items-table th {\n" +
                "            text-align: left;\n" +
                "            font-size: 11px;\n" +
                "            text-transform: uppercase;\n" +
                "            color: var(--gray-dark);\n" +
                "            border-bottom: 2px solid var(--pastel-dark-pink);\n" +
                "            padding: 10px 0;\n" +
                "            font-weight: 600;\n" +
                "        }\n" +
                "        .items-table td {\n" +
                "            padding: 15px 0;\n" +
                "            border-bottom: 1px solid var(--gray-light);\n" +
                "            font-size: 13px;\n" +
                "            color: var(--dark-neutral);\n" +
                "        }\n" +
                "        .text-right {\n" +
                "            text-align: right !important;\n" +
                "        }\n" +
                "        .total-row {\n" +
                "            display: flex;\n" +
                "            justify-content: flex-end;\n" +
                "            align-items: center;\n" +
                "            margin-top: 25px;\n" +
                "            padding-top: 15px;\n" +
                "        }\n" +
                "        .total-label {\n" +
                "            font-size: 14px;\n" +
                "            font-weight: bold;\n" +
                "            margin-right: 15px;\n" +
                "        }\n" +
                "        .total-amount {\n" +
                "            font-size: 20px;\n" +
                "            font-weight: bold;\n" +
                "            color: var(--gold);\n" +
                "        }\n" +
                "        .footer {\n" +
                "            text-align: center;\n" +
                "            margin-top: 40px;\n" +
                "            font-size: 11px;\n" +
                "            color: var(--gray-dark);\n" +
                "            border-top: 1px solid var(--gray-light);\n" +
                "            padding-top: 25px;\n" +
                "        }\n" +
                "        .footer p {\n" +
                "            margin: 5px 0;\n" +
                "        }\n" +
                "        .footer .highlight {\n" +
                "            color: var(--pastel-dark-pink);\n" +
                "            font-weight: 500;\n" +
                "        }\n" +
                "        .footer .shop-name {\n" +
                "            font-weight: bold;\n" +
                "            margin-top: 10px;\n" +
                "            font-size: 13px;\n" +
                "        .print-btn-container { text-align: center; margin-bottom: 20px; }\n" +
                "        .btn-pdf { background: #d4af37; color: white; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }\n" +
                "        .btn-pdf:hover { background: #b8972e; }\n" +
                "        @media print {\n" +
                "            body { background: white; padding: 0; }\n" +
                "            .invoice-card { border: none; box-shadow: none; padding: 0; }\n" +
                "            .print-btn-container { display: none !important; }\n" +
                "        }\n" +
                "    </style>\n" +
                "    <link href=\"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"print-btn-container\">\n" +
                "        <button class=\"btn-pdf\" onclick=\"window.print()\">📥 Guardar como PDF / Imprimir Recibo</button>\n" +
                "    </div>\n" +
                "    <div class=\"invoice-card\">\n" +
                "        <div class=\"header\">\n" +
                "            <h1 class=\"logo\">J&N</h1>\n" +
                "            <p class=\"subtitle\">Maquillaje & Moda</p>\n" +
                "            <div class=\"title\">¡Gracias por tu Compra!</div>\n" +
                "        </div>\n" +
                "        \n" +
                "        <div class=\"meta-row\">\n" +
                "            <div class=\"meta-block\">\n" +
                "                <strong>Cliente:</strong> " + order.getCustomerName() + "<br>\n" +
                "                <strong>N° Pedido:</strong> #" + order.getOrderNumber() + "\n" +
                "            </div>\n" +
                "            <div class=\"meta-block text-right\">\n" +
                "                <strong>Fecha:</strong> " + dateStr + "<br>\n" +
                "                <strong>Hora:</strong> " + timeStr + "\n" +
                "            </div>\n" +
                "        </div>\n" +
                "        \n" +
                "        <table class=\"items-table\">\n" +
                "            <thead>\n" +
                "                <tr>\n" +
                "                    <th>Producto</th>\n" +
                "                    <th>Variación</th>\n" +
                "                    <th>Cant.</th>\n" +
                "                    <th>Precio Unit.</th>\n" +
                "                    <th class=\"text-right\">Subtotal</th>\n" +
                "                </tr>\n" +
                "            </thead>\n" +
                "            <tbody>\n" +
                "            " + rows.toString() + "\n" +
                "            </tbody>\n" +
                "        </table>\n" +
                "        \n" +
                "        <div class=\"total-row\">\n" +
                "            <span class=\"total-label\">Total a pagar:</span>\n" +
                "            <span class=\"total-amount\">$" + formatPrice(order.getTotal()) + "</span>\n" +
                "        </div>\n" +
                "        \n" +
                "        <div class=\"footer\">\n" +
                "            <p class=\"highlight\">💕 GRACIAS POR CONFIAR EN NOSOTROS 💕</p>\n" +
                "            <p class=\"highlight\">✨ GRACIAS POR ELEGIRNOS COMO TU TIENDA FAVORITA ✨</p>\n" +
                "            <p class=\"shop-name\">CON AGRADECIMIENTO J&N!! ❤️</p>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "text/html;charset=UTF-8")
                .body(html);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats(HttpSession session) {
        if (isNotAdmin(session)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado"));
        }
        try {
            List<Order> orders = orderService.getAllActiveOrders(); // non-deleted orders
            
            double totalRevenue = 0;
            double todayRevenue = 0;
            double weekRevenue = 0;
            double monthRevenue = 0;
            long pendingOrdersCount = 0;
            long completedOrdersCount = 0;
            
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
            LocalDateTime startOfWeek = now.minusDays(7);
            LocalDateTime startOfMonth = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
            
            for (Order order : orders) {
                String status = order.getStatus() != null ? order.getStatus().toUpperCase() : "";
                if (!"CANCELADO".equals(status)) {
                    totalRevenue += order.getTotal();
                    if (order.getCreatedAt() != null) {
                        if (order.getCreatedAt().isAfter(startOfToday)) {
                            todayRevenue += order.getTotal();
                        }
                        if (order.getCreatedAt().isAfter(startOfWeek)) {
                            weekRevenue += order.getTotal();
                        }
                        if (order.getCreatedAt().isAfter(startOfMonth)) {
                            monthRevenue += order.getTotal();
                        }
                    }
                    if ("PAGADO".equals(status) || "ENVIADO".equals(status)) {
                        completedOrdersCount++;
                    } else {
                        pendingOrdersCount++;
                    }
                }
            }
            
            List<Product> allProds = productService.getAllProducts();
            long totalProducts = allProds.size();
            long makeupCount = allProds.stream().filter(p -> 
                (p.getType() != null && p.getType().toLowerCase().contains("maquillaje")) ||
                (p.getCategory() != null && p.getCategory().toLowerCase().contains("maquillaje"))
            ).count();
            long clothingCount = allProds.stream().filter(p -> 
                (p.getType() != null && p.getType().toLowerCase().contains("ropa")) ||
                (p.getCategory() != null && p.getCategory().toLowerCase().contains("ropa"))
            ).count();
            long criticalStockCount = productService.getStockAlerts().size();

            Map<String, Long> categoryCounts = new java.util.HashMap<>();
            for (Product p : allProds) {
                String cat = p.getCategory();
                String type = p.getType();
                String key = (cat != null && !cat.trim().isEmpty()) ? cat.trim() : (type != null && !type.trim().isEmpty() ? type.trim() : "General");
                categoryCounts.put(key, categoryCounts.getOrDefault(key, 0L) + 1L);
            }

            Map<String, Object> statsResponse = new java.util.HashMap<>();
            statsResponse.put("totalRevenue", totalRevenue);
            statsResponse.put("todayRevenue", todayRevenue);
            statsResponse.put("weekRevenue", weekRevenue);
            statsResponse.put("monthRevenue", monthRevenue);
            statsResponse.put("pendingOrders", pendingOrdersCount);
            statsResponse.put("completedOrders", completedOrdersCount);
            statsResponse.put("totalOrders", orders.size());
            statsResponse.put("totalProducts", totalProducts);
            statsResponse.put("makeupCount", makeupCount);
            statsResponse.put("clothingCount", clothingCount);
            statsResponse.put("categoryCounts", categoryCounts);
            statsResponse.put("criticalStockCount", criticalStockCount);

            return ResponseEntity.ok(statsResponse);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al obtener estadísticas: " + e.getMessage()));
        }
    }

    private String formatPrice(double price) {
        java.text.DecimalFormat df = new java.text.DecimalFormat("#,###");
        return df.format(price).replace(",", ".");
    }
}
