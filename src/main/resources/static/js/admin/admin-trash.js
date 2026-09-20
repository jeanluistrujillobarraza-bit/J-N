/**
 * J&N Store - Admin Trash Module
 * Handles deleted products and deleted orders recovery / permanent deletion.
 */
class AdminTrashModule {
    constructor(store) {
        this.store = store;
        this.currentSubTab = 'products'; // 'products' or 'orders'
        this.deletedProducts = [];
        this.deletedOrders = [];

        // Real Pagination Component for Trash
        this.pagination = new Pagination({
            containerId: 'admin-trash-pagination-container',
            pageSize: 15,
            pageSizeOptions: [10, 15, 25, 50],
            onPageChange: (items) => this.renderCurrentTable(items)
        });
    }

    async render() {
        await Promise.all([
            this.fetchDeletedProducts(),
            this.fetchDeletedOrders()
        ]);
        this.applyTrashTab();
    }

    setTrashSubTab(tab) {
        this.currentSubTab = tab;
        const prodBtn = document.getElementById('trash-tab-products-btn');
        const ordersBtn = document.getElementById('trash-tab-orders-btn');

        if (tab === 'products') {
            if (prodBtn) prodBtn.classList.add('active');
            if (ordersBtn) ordersBtn.classList.remove('active');
        } else {
            if (prodBtn) prodBtn.classList.remove('active');
            if (ordersBtn) ordersBtn.classList.add('active');
        }

        this.applyTrashTab();
    }

    applyTrashTab() {
        const items = this.currentSubTab === 'products' ? this.deletedProducts : this.deletedOrders;
        const pageItems = this.pagination.setItems(items);
        this.pagination.render();
        this.renderCurrentTable(pageItems);
    }

    async fetchDeletedProducts() {
        try {
            const data = await api.get('/api/products/trash');
            this.deletedProducts = Array.isArray(data) ? data : [];
        } catch (e) {
            this.deletedProducts = [];
        }
    }

    async fetchDeletedOrders() {
        try {
            const data = await api.get('/api/orders/trash');
            this.deletedOrders = Array.isArray(data) ? data : [];
        } catch (e) {
            this.deletedOrders = [];
        }
    }

    renderCurrentTable(items) {
        const tableHead = document.getElementById('trash-table-head');
        const tableBody = document.getElementById('trash-table-body');
        if (!tableHead || !tableBody) return;

        if (this.currentSubTab === 'products') {
            tableHead.innerHTML = `
                <tr>
                    <th>Imagen</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Acciones</th>
                </tr>
            `;

            if (!items || items.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center; color:var(--text-secondary); padding:30px;">
                            <i class="fas fa-trash-restore" style="font-size:24px; margin-bottom:6px; display:block; color:var(--gold);"></i>
                            La papelera de productos está vacía.
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = items.map(p => {
                const img = (p.images && p.images.length > 0) ? p.images[0] : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';
                return `
                    <tr>
                        <td><img src="${img}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;"></td>
                        <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
                        <td><span class="pill">${Utils.escapeHtml(p.category || 'General')}</span></td>
                        <td><strong>${Utils.formatPrice(p.price)}</strong></td>
                        <td>
                            <div class="admin-table-actions">
                                <button class="action-icon-btn restore" onclick="app.restoreProduct('${p.id}')" title="Restaurar Producto">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button class="action-icon-btn delete" onclick="app.permanentDeleteProduct('${p.id}')" title="Eliminar Definitivamente">
                                    <i class="fas fa-times-circle"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tableHead.innerHTML = `
                <tr>
                    <th>ID Pedido</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Acciones</th>
                </tr>
            `;

            if (!items || items.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center; color:var(--text-secondary); padding:30px;">
                            <i class="fas fa-trash-restore" style="font-size:24px; margin-bottom:6px; display:block; color:var(--gold);"></i>
                            La papelera de pedidos está vacía.
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = items.map(o => `
                <tr>
                    <td><small>#${(o.id || '').substring(0, 8)}</small></td>
                    <td><strong>${Utils.escapeHtml(o.customerName)}</strong></td>
                    <td><small>${Utils.formatDate(o.createdAt)}</small></td>
                    <td><strong>${Utils.formatPrice(o.total)}</strong></td>
                    <td>
                        <div class="admin-table-actions">
                            <button class="action-icon-btn restore" onclick="app.restoreOrder('${o.id}')" title="Restaurar Pedido">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="action-icon-btn delete" onclick="app.permanentDeleteOrder('${o.id}')" title="Eliminar Definitivamente">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    async restoreProduct(id) {
        try {
            await api.put(`/api/products/${id}/restore`);
            Utils.showToast('Producto restaurado exitosamente.', 'success');
            await this.render();
            this.store.catalog.fetchProducts(true);
        } catch (err) {
            Utils.showToast('Error al restaurar producto: ' + err.message, 'danger');
        }
    }

    async permanentDeleteProduct(id) {
        if (!confirm('¿Estás seguro de eliminar este producto PERMANENTEMENTE? Esta acción no se puede deshacer.')) return;

        try {
            await api.delete(`/api/products/${id}/permanent`);
            Utils.showToast('Producto eliminado permanentemente.', 'info');
            await this.render();
        } catch (err) {
            Utils.showToast('Error al eliminar permanentemente: ' + err.message, 'danger');
        }
    }

    async restoreOrder(id) {
        try {
            await api.put(`/api/orders/${id}/restore`);
            Utils.showToast('Pedido restaurado exitosamente.', 'success');
            await this.render();
        } catch (err) {
            Utils.showToast('Error al restaurar pedido: ' + err.message, 'danger');
        }
    }

    async permanentDeleteOrder(id) {
        if (!confirm('¿Estás seguro de eliminar este pedido PERMANENTEMENTE? Esta acción no se puede deshacer.')) return;

        try {
            await api.delete(`/api/orders/${id}/permanent`);
            Utils.showToast('Pedido eliminado permanentemente.', 'info');
            await this.render();
        } catch (err) {
            Utils.showToast('Error al eliminar permanentemente: ' + err.message, 'danger');
        }
    }
}

window.AdminTrashModule = AdminTrashModule;
