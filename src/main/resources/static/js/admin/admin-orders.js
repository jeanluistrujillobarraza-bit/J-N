/**
 * J&N Store - Admin Orders Module
 * Manages orders table, status workflows, receipts and real pagination.
 */
class AdminOrdersModule {
    constructor(store) {
        this.store = store;
        this.orders = [];
        this.statusFilter = 'todos';
        this.searchQuery = '';

        // Real Pagination Component for Orders
        this.pagination = new Pagination({
            containerId: 'admin-orders-pagination-container',
            pageSize: 15,
            pageSizeOptions: [10, 15, 25, 50],
            onPageChange: (items) => this.renderTableRows(items)
        });
    }

    async render() {
        try {
            const data = await api.get('/api/orders');
            this.orders = Array.isArray(data) ? data : [];
            this.applyFiltersAndRender();
        } catch (err) {
            console.error('[Orders] Error loading orders:', err);
            this.orders = [];
            this.applyFiltersAndRender();
        }
    }

    setStatusFilter(status) {
        this.statusFilter = status || 'todos';
        this.applyFiltersAndRender();
    }

    setSearch(q) {
        this.searchQuery = q || '';
        this.applyFiltersAndRender();
    }

    applyFiltersAndRender() {
        const q = (this.searchQuery || '').trim().toLowerCase();
        const status = this.statusFilter.toLowerCase();

        const filtered = this.orders.filter(o => {
            if (o.deleted) return false;

            if (status !== 'todos') {
                if ((o.status || '').toLowerCase() !== status) return false;
            }

            if (q) {
                const nameMatch = (o.customerName || '').toLowerCase().includes(q);
                const phoneMatch = (o.customerPhone || '').toLowerCase().includes(q);
                const idMatch = (o.id || '').toLowerCase().includes(q);
                if (!nameMatch && !phoneMatch && !idMatch) return false;
            }

            return true;
        });

        const pageItems = this.pagination.setItems(filtered);
        this.pagination.render();
        this.renderTableRows(pageItems);
    }

    renderTableRows(items) {
        const tbody = document.getElementById('admin-orders-table-body');
        if (!tbody) return;

        if (!items || items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 40px;">
                        <i class="fas fa-clipboard-list" style="font-size: 28px; margin-bottom: 8px; display: block; color: var(--gold);"></i>
                        No se encontraron pedidos.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(o => {
            const totalItemsCount = (o.items || []).reduce((acc, curr) => acc + curr.quantity, 0);
            const statusClass = (o.status || 'PENDIENTE').toLowerCase();

            return `
                <tr>
                    <td><small style="color:var(--text-muted); font-family:monospace; font-weight:700;">#${(o.id || '').substring(0, 8)}</small></td>
                    <td>
                        <strong>${Utils.escapeHtml(o.customerName)}</strong>
                        <div style="font-size:11px; color:var(--text-secondary);"><i class="fas fa-phone-alt" style="font-size:10px;"></i> ${Utils.escapeHtml(o.customerPhone)}</div>
                    </td>
                    <td><small>${Utils.formatDate(o.createdAt)}</small></td>
                    <td><span class="badge" style="background:var(--bg-light); border:1px solid var(--border-color); padding:3px 8px; border-radius:12px; font-size:11.5px;">${totalItemsCount} unds</span></td>
                    <td><strong style="color:var(--accent-pink);">${Utils.formatPrice(o.total)}</strong></td>
                    <td>
                        <select class="form-control" style="padding: 4px 8px; font-size: 12px; width: auto; font-weight:600;" 
                                onchange="app.updateOrderStatus('${o.id}', this.value)">
                            <option value="PENDIENTE" ${o.status === 'PENDIENTE' ? 'selected' : ''}>⏳ Pendiente</option>
                            <option value="PAGADO" ${o.status === 'PAGADO' ? 'selected' : ''}>✅ Pagado</option>
                            <option value="ENVIADO" ${o.status === 'ENVIADO' ? 'selected' : ''}>🚚 Enviado</option>
                            <option value="CANCELADO" ${o.status === 'CANCELADO' ? 'selected' : ''}>❌ Cancelado</option>
                        </select>
                    </td>
                    <td>
                        <div class="admin-table-actions">
                            <button class="action-icon-btn" style="background:#22c55e; color:white; border-color:#22c55e;" onclick="app.sendOrderWhatsAppDirect('${o.id}')" title="Enviar Mensaje de Confirmación por WhatsApp">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                            <button class="action-icon-btn edit" onclick="app.viewOrderReceipt('${o.id}')" title="Ver Detalles del Pedido">
                                <i class="fas fa-file-invoice"></i>
                            </button>
                            <button class="action-icon-btn delete" onclick="app.deleteOrderToTrash('${o.id}')" title="Mover a Papelera">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async updateOrderStatus(id, newStatus) {
        try {
            await api.put(`/api/orders/${id}/status?status=${newStatus}`);
            Utils.showToast(`Estado de pedido actualizado a ${newStatus}.`, 'success');
            await this.render();
        } catch (err) {
            Utils.showToast('Error al actualizar estado: ' + err.message, 'danger');
        }
    }

    async deleteOrderToTrash(id) {
        if (!confirm('¿Mover este pedido a la papelera?')) return;

        try {
            await api.delete(`/api/orders/${id}`);
            Utils.showToast('Pedido movido a la papelera.', 'info');
            await this.render();
        } catch (err) {
            Utils.showToast('Error al mover a papelera: ' + err.message, 'danger');
        }
    }

    generateWhatsAppConfirmationMessage(order) {
        if (!order) return '';
        const orderNum = (order.id || '').substring(0, 8).toUpperCase();
        
        let orderDate = '';
        let orderTime = '';
        try {
            const d = new Date(order.createdAt || Date.now());
            orderDate = d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'numeric', day: 'numeric' });
            orderTime = d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) {
            orderDate = 'Hoy';
            orderTime = '';
        }

        const allProds = (this.store && this.store.catalog && this.store.catalog.allProducts) || [];

        const itemsLines = (order.items || []).map(i => {
            let prodName = i.name || i.productName;
            if (!prodName || prodName === 'Producto' || prodName === 'undefined') {
                const found = allProds.find(p => p.id === i.productId);
                if (found) prodName = found.name;
            }
            if (!prodName) prodName = 'Producto J&N';

            const variantText = (i.size || i.color) ? ` (${[i.size, i.color].filter(Boolean).join(' - ')})` : '';
            return ` • *${prodName}${variantText}* x${i.quantity} — ${Utils.formatPrice(i.price * i.quantity)}`;
        }).join('\n');

        const message = 
`✨ *Confirmación de Compra - J&N* ✨

*Cliente:* ${order.customerName || 'Cliente'}
*Pedido:* #${orderNum}
*Fecha:* ${orderDate}
*Hora:* ${orderTime}

📦 *PRODUCTOS:*
${itemsLines}

💰 *TOTAL A PAGAR:* *${Utils.formatPrice(order.total || 0)}*

Una vez que hayas confirmado y realizado el pago de tu pedido, te enviaremos tu *recibo de pago* como comprobante de la transacción.

Agradecemos sinceramente tu confianza y preferencia. En *J&N* trabajamos para brindarte la mejor experiencia de compra.

¡Gracias por elegirnos! 💖`;

        return message;
    }

    sendOrderWhatsAppDirect(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;
        this.selectedOrderForReceipt = order;
        this.sendCustomerWhatsAppConfirmation(order);
    }

    sendCustomerWhatsAppConfirmation(order = null) {
        const targetOrder = order || this.selectedOrderForReceipt || (this.store.cart && this.store.cart.lastCreatedOrder);
        if (!targetOrder) {
            Utils.showToast('No se encontró el pedido para notificar.', 'warning');
            return;
        }

        const text = this.generateWhatsAppConfirmationMessage(targetOrder);
        let phone = (targetOrder.customerPhone || '').replace(/\D/g, '');
        if (phone.length === 10 && !phone.startsWith('57')) {
            phone = '57' + phone;
        }

        const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    copyWhatsAppConfirmationText() {
        const targetOrder = this.selectedOrderForReceipt || (this.store.cart && this.store.cart.lastCreatedOrder);
        if (!targetOrder) return;
        const text = this.generateWhatsAppConfirmationMessage(targetOrder);
        navigator.clipboard.writeText(text).then(() => {
            Utils.showToast('¡Mensaje de WhatsApp copiado al portapapeles!', 'success');
        }).catch(() => {
            Utils.showToast('No se pudo copiar el texto automáticamente.', 'warning');
        });
    }

    viewOrderReceipt(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;
        this.selectedOrderForReceipt = order;
        this.openReceiptModal(order);
    }

    openReceiptModal(order) {
        const modal = document.getElementById('receipt-modal');
        if (!modal) return;

        this.selectedOrderForReceipt = order;

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
                    <p style="font-size:13px; margin-bottom:4px;"><strong>Dirección:</strong> ${Utils.escapeHtml(order.customerAddress || 'N/A')} (${Utils.escapeHtml(order.customerCity || 'Principal')})</p>
                    <p style="font-size:13px; margin-bottom:4px;"><strong>Método de Pago:</strong> ${Utils.escapeHtml(order.paymentMethod || 'Transferencia / Nequi')}</p>
                    <p style="font-size:13px; margin-bottom:4px;"><strong>Fecha / Hora:</strong> ${Utils.formatDate(order.createdAt)}</p>
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
}

window.AdminOrdersModule = AdminOrdersModule;
