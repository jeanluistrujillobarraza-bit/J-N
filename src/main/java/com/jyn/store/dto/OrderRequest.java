package com.jyn.store.dto;

import com.jyn.store.model.OrderItem;
import java.util.List;

public class OrderRequest {
    private String customerName;
    private List<OrderItem> items;

    private String customerPhone;

    public OrderRequest() {}

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
    }
}
