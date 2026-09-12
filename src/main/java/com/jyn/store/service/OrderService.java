package com.jyn.store.service;

import com.jyn.store.dto.CartItemDto;
import com.jyn.store.model.Order;
import com.jyn.store.model.OrderItem;
import com.jyn.store.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductService productService;

    public synchronized Order createOrder(String customerName, String customerPhone, List<OrderItem> items) {
        long nextOrderNumber = 1001;
        Optional<Order> lastOrder = orderRepository.findFirstByOrderByOrderNumberDesc();
        if (lastOrder.isPresent()) {
            nextOrderNumber = lastOrder.get().getOrderNumber() + 1;
        }

        double total = 0;
        for (OrderItem item : items) {
            total += item.getPrice() * item.getQuantity();
        }

        Order order = new Order();
        order.setOrderNumber(nextOrderNumber);
        order.setCustomerName(customerName);
        order.setCustomerPhone(customerPhone);
        order.setItems(items);
        order.setTotal(total);
        order.setStatus("PENDIENTE");
        order.setDeleted(false);
        order.setCreatedAt(LocalDateTime.now());

        return orderRepository.save(order);
    }

    public List<Order> getAllActiveOrders() {
        return orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted())
                .sorted((o1, o2) -> Long.compare(o2.getOrderNumber(), o1.getOrderNumber()))
                .toList();
    }

    public List<Order> getDeletedOrders() {
        return orderRepository.findAll().stream()
                .filter(Order::isDeleted)
                .sorted((o1, o2) -> Long.compare(o2.getOrderNumber(), o1.getOrderNumber()))
                .toList();
    }

    public synchronized Order completeOrder(String id) {
        Optional<Order> optionalOrder = orderRepository.findById(id);
        if (optionalOrder.isPresent()) {
            Order order = optionalOrder.get();
            if ("PENDIENTE".equals(order.getStatus())) {
                // Deduct stock using ProductService
                List<CartItemDto> cartItems = new ArrayList<>();
                for (OrderItem item : order.getItems()) {
                    CartItemDto dto = new CartItemDto();
                    dto.setProductId(item.getProductId());
                    dto.setQuantity(item.getQuantity());
                    dto.setSize(item.getSize());
                    dto.setColor(item.getColor());
                    cartItems.add(dto);
                }
                
                productService.updateInventory(cartItems);
                
                order.setStatus("PAGADO");
                return orderRepository.save(order);
            }
            return order;
        }
        throw new RuntimeException("Pedido no encontrado con ID: " + id);
    }

    public void softDeleteOrder(String id) {
        Optional<Order> optionalOrder = orderRepository.findById(id);
        if (optionalOrder.isPresent()) {
            Order order = optionalOrder.get();
            order.setDeleted(true);
            orderRepository.save(order);
        }
    }

    public void restoreOrder(String id) {
        Optional<Order> optionalOrder = orderRepository.findById(id);
        if (optionalOrder.isPresent()) {
            Order order = optionalOrder.get();
            order.setDeleted(false);
            orderRepository.save(order);
        }
    }

    public void permanentlyDeleteOrder(String id) {
        orderRepository.deleteById(id);
    }

    public Optional<Order> getOrderById(String id) {
        return orderRepository.findById(id);
    }
}
