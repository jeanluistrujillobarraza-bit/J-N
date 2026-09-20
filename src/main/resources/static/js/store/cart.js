/**
 * J&N Store - Cart & Checkout Module
 * Handles localStorage persistence, quantity updates, order creation and WhatsApp routing.
 */
class CartModule {
    constructor(store) {
        this.store = store;
        this.cart = [];
        this.loadCartFromStorage();
    }

    loadCartFromStorage() {
        const stored = localStorage.getItem('jn_cart');
        if (stored) {
            try {
                this.cart = JSON.parse(stored);
            } catch (e) {
                this.cart = [];
            }
        }
    }

    saveCartToStorage() {
        localStorage.setItem('jn_cart', JSON.stringify(this.cart));
        this.renderCart();
    }

    addToCart(product, quantity = 1, size = '', color = '') {
        if (!product) return;

        // Check stock availability
        if (product.type === 'maquillaje') {
            if ((product.generalStock || 0) < quantity) {
                Utils.showToast('No hay suficiente stock disponible para este producto.', 'warning');
                return;
            }
        } else if (product.type === 'ropa' && product.variations) {
            const v = product.variations.find(item => item.size === size && item.color === color);
            if (v && v.stock < quantity) {
                Utils.showToast(`Stock insuficiente para Talla: ${size}, Color: ${color}`, 'warning');
                return;
            }
        }

        const existingIndex = this.cart.findIndex(item => 
            item.productId === product.id && item.size === size && item.color === color
        );

        const img = (product.images && product.images.length > 0) ? product.images[0] : '';

        if (existingIndex > -1) {
            this.cart[existingIndex].quantity += Number(quantity);
        } else {
            this.cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                type: product.type,
                category: product.category,
                image: img,
                size: size || '',
                color: color || '',
                quantity: Number(quantity)
            });
        }

        this.saveCartToStorage();
        Utils.showToast(`¡${product.name} agregado al carrito!`, 'success');
        this.openCart();
    }

    updateQuantity(index, delta) {
        if (!this.cart[index]) return;
        const newQty = this.cart[index].quantity + delta;
        if (newQty <= 0) {
            this.removeItem(index);
        } else {
            this.cart[index].quantity = newQty;
            this.saveCartToStorage();
        }
    }

    removeItem(index) {
        if (!this.cart[index]) return;
        const name = this.cart[index].name;
        this.cart.splice(index, 1);
        this.saveCartToStorage();
        Utils.showToast(`${name} eliminado del carrito.`, 'info');
    }

    clearCart() {
        this.cart = [];
        this.saveCartToStorage();
    }

    getTotalAmount() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getTotalItemsCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    renderCart() {
        const badge = document.getElementById('cart-badge-count');
        const container = document.getElementById('cart-items-container');
        const totalEl = document.getElementById('cart-total-price');

        const totalCount = this.getTotalItemsCount();
        const totalAmount = this.getTotalAmount();

        if (badge) badge.innerText = totalCount;
        if (totalEl) totalEl.innerText = Utils.formatPrice(totalAmount);

        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Tu carrito está vacío</p>
                    <button class="btn btn-outline" style="margin-top: 15px;" onclick="app.closeCart()">Explorar Productos</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.cart.map((item, idx) => {
            const meta = (item.size || item.color) ? `Talla: ${item.size || 'Única'} | Color: ${item.color || 'Estándar'}` : item.category;
            return `
                <div class="cart-item">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop'}" alt="${Utils.escapeHtml(item.name)}">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${Utils.escapeHtml(item.name)}</div>
                        <div class="cart-item-meta">${meta}</div>
                        <div class="cart-item-price">${Utils.formatPrice(item.price * item.quantity)}</div>
                        <div class="cart-item-controls">
                            <button class="qty-btn" onclick="app.updateCartQty(${idx}, -1)">-</button>
                            <span style="font-weight: 600; font-size: 13px;">${item.quantity}</span>
                            <button class="qty-btn" onclick="app.updateCartQty(${idx}, 1)">+</button>
                            <button class="action-icon-btn delete" style="margin-left: auto; width: 24px; height: 24px;" onclick="app.removeCartItem(${idx})">
                                <i class="fas fa-trash" style="font-size: 10px;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    openCart() {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('cart-overlay');
        if (drawer) drawer.classList.add('open');
        if (overlay) overlay.classList.remove('hidden');
    }

    closeCart() {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('cart-overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.add('hidden');
    }

    openCheckout() {
        if (this.cart.length === 0) {
            Utils.showToast('Agrega productos al carrito antes de pagar.', 'warning');
            return;
        }
        this.closeCart();
        const modal = document.getElementById('checkout-modal');
        if (modal) {
            // Autofill user info if logged in
            const auth = this.store.auth;
            if (auth && auth.currentUser) {
                const nameInput = document.getElementById('checkout-name');
                const phoneInput = document.getElementById('checkout-phone');
                if (nameInput && !nameInput.value) nameInput.value = `${auth.currentUser.firstName || ''} ${auth.currentUser.lastName || ''}`.trim();
                if (phoneInput && !phoneInput.value) phoneInput.value = auth.currentUser.phone || '';
            }

            const totalEl = document.getElementById('checkout-total-amount');
            if (totalEl) totalEl.innerText = Utils.formatPrice(this.getTotalAmount());
            modal.classList.remove('hidden');
        }
    }

    closeCheckout() {
        const modal = document.getElementById('checkout-modal');
        if (modal) modal.classList.add('hidden');
    }

    async processCheckout(customerInfo) {
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            Utils.showToast('Por favor completa todos los campos del formulario.', 'warning');
            return;
        }

        const orderPayload = {
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            customerAddress: customerInfo.address,
            customerCity: customerInfo.city || 'Principal',
            paymentMethod: customerInfo.paymentMethod || 'Transferencia / Nequi',
            notes: customerInfo.notes || '',
            items: this.cart.map(item => ({
                productId: item.productId || item.id,
                name: item.name,
                productName: item.name,
                price: item.price,
                quantity: item.quantity,
                size: item.size,
                color: item.color
            })),
            total: this.getTotalAmount(),
            status: 'PENDIENTE'
        };

        try {
            const createdOrder = await api.post('/api/orders', orderPayload);
            Utils.showToast('¡Pedido registrado con éxito!', 'success');
            
            this.lastCreatedOrder = createdOrder || orderPayload;
            this.clearCart();
            this.closeCheckout();

            // Refresh catalog products in background to update stocks
            this.store.catalog.fetchProducts(true);

            // Open Order Confirmation / Receipt Modal
            this.openReceiptModal(createdOrder || orderPayload);
        } catch (err) {
            Utils.showToast('Error al procesar el pedido: ' + err.message, 'danger');
        }
    }

    openReceiptModal(order) {
        const modal = document.getElementById('receipt-modal');
        if (!modal) return;

        this.lastCreatedOrder = order;

        const summaryEl = document.getElementById('receipt-order-summary');
        if (summaryEl) {
            const itemsList = (order.items || []).map(i => {
                const prodName = i.name || i.productName || 'Producto';
                const variantInfo = (i.size || i.color) ? ` (${[i.size, i.color].filter(Boolean).join(' - ')})` : '';
                return `
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
                        <span>${i.quantity}x ${Utils.escapeHtml(prodName)}${variantInfo}</span>
                        <strong>${Utils.formatPrice(i.price * i.quantity)}</strong>
                    </div>
                `;
            }).join('');

            summaryEl.innerHTML = `
                <div style="border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:12px;">
                    <p style="font-size:13px; margin-bottom:4px;"><strong>Cliente:</strong> ${Utils.escapeHtml(order.customerName)}</p>
                    <p style="font-size:13px; margin-bottom:4px;"><strong>Teléfono:</strong> ${Utils.escapeHtml(order.customerPhone)}</p>
                    <p style="font-size:13px; margin-bottom:4px;"><strong>Dirección:</strong> ${Utils.escapeHtml(order.customerAddress)} (${Utils.escapeHtml(order.customerCity || '')})</p>
                    <p style="font-size:13px; margin-bottom:4px;"><strong>Método de Pago:</strong> ${Utils.escapeHtml(order.paymentMethod || 'Transferencia / Nequi')}</p>
                </div>
                <div>
                    <h5 style="font-size:13px; margin-bottom:8px; text-transform:uppercase; color:var(--text-muted);">Productos</h5>
                    ${itemsList}
                    <div style="display:flex; justify-content:space-between; margin-top:12px; padding-top:10px; border-top:2px dashed var(--border-color); font-size:16px; font-weight:700;">
                        <span>Total a Pagar:</span>
                        <span style="color:var(--accent-pink);">${Utils.formatPrice(order.total)}</span>
                    </div>
                </div>
            `;
        }

        modal.classList.remove('hidden');
    }

    closeReceiptModal() {
        const modal = document.getElementById('receipt-modal');
        if (modal) modal.classList.add('hidden');
    }

    sendReceiptWhatsApp(order) {
        if (!order) return;
        const msg = encodeURIComponent(
            `*NUEVO PEDIDO - J&N STORE*\n` +
            `👤 *Cliente:* ${order.customerName}\n` +
            `📱 *Teléfono:* ${order.customerPhone}\n` +
            `📍 *Dirección:* ${order.customerAddress}\n` +
            `💳 *Pago:* ${order.paymentMethod}\n\n` +
            `🛍️ *Productos:*\n` +
            (order.items || []).map(i => `• ${i.quantity}x ${i.productName} - ${Utils.formatPrice(i.price * i.quantity)}`).join('\n') +
            `\n\n💰 *TOTAL:* ${Utils.formatPrice(order.total)}`
        );
        window.open(`https://wa.me/573000000000?text=${msg}`, '_blank');
    }
}

window.CartModule = CartModule;
