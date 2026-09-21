/**
 * J&N Store - Admin Dashboard Module
 * Renders sales statistics, inventory metrics and stock alert lists.
 */
class AdminDashboardModule {
    constructor(store) {
        this.store = store;
    }

    async render() {
        const grid = document.getElementById('inventory-stats-grid');
        const alertsList = document.getElementById('alerts-list');

        const todaySalesEl = document.getElementById('stat-sales-today');
        const weekSalesEl = document.getElementById('stat-sales-week');
        const monthSalesEl = document.getElementById('stat-sales-month');
        const totalSalesEl = document.getElementById('stat-sales-total');

        try {
            const [statsRes, alertsRes] = await Promise.allSettled([
                api.get('/api/orders/stats'),
                api.get('/api/products/alerts')
            ]);

            const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
            const alerts = alertsRes.status === 'fulfilled' ? (alertsRes.value || []) : [];

            if (stats) {
                if (todaySalesEl) todaySalesEl.innerText = Utils.formatPrice(stats.todayRevenue || 0);
                if (weekSalesEl) weekSalesEl.innerText = Utils.formatPrice(stats.weekRevenue || 0);
                if (monthSalesEl) monthSalesEl.innerText = Utils.formatPrice(stats.monthRevenue || 0);
                if (totalSalesEl) totalSalesEl.innerText = Utils.formatPrice(stats.totalRevenue || 0);
            }

            // Products count from server stats
            const totalProductsCount = stats && stats.totalProducts !== undefined ? stats.totalProducts : 0;
            const makeupCount = stats && stats.makeupCount !== undefined ? stats.makeupCount : 0;
            const clothingCount = stats && stats.clothingCount !== undefined ? stats.clothingCount : 0;

            if (grid) {
                grid.innerHTML = '';

                // Total Products Card
                const totalCard = document.createElement('div');
                totalCard.className = 'stat-card';
                totalCard.innerHTML = `
                    <div class="stat-icon" style="background-color: rgba(30, 41, 59, 0.1); color: #1e293b;">
                        <i class="fas fa-boxes"></i>
                    </div>
                    <div class="stat-info">
                        <h4>${totalProductsCount}</h4>
                        <p>Total Productos</p>
                    </div>
                `;
                grid.appendChild(totalCard);

                // Department Cards (Maquillaje & Ropa)
                const makeupCard = document.createElement('div');
                makeupCard.className = 'stat-card';
                makeupCard.innerHTML = `
                    <div class="stat-icon pink-bg">
                        <i class="fas fa-magic"></i>
                    </div>
                    <div class="stat-info">
                        <h4>${makeupCount}</h4>
                        <p>Maquillaje</p>
                    </div>
                `;
                grid.appendChild(makeupCard);

                const clothingCard = document.createElement('div');
                clothingCard.className = 'stat-card';
                clothingCard.innerHTML = `
                    <div class="stat-icon" style="background-color: rgba(212, 175, 55, 0.15); color: var(--gold);">
                        <i class="fas fa-tshirt"></i>
                    </div>
                    <div class="stat-info">
                        <h4>${clothingCount}</h4>
                        <p>Ropa</p>
                    </div>
                `;
                grid.appendChild(clothingCard);

                // Alerts Card
                const alertCount = (stats && stats.criticalStockCount !== undefined) ? stats.criticalStockCount : alerts.length;
                const alertCard = document.createElement('div');
                alertCard.className = 'stat-card';
                alertCard.innerHTML = `
                    <div class="stat-icon alert-bg">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h4>${alertCount}</h4>
                        <p>Alertas de Stock</p>
                    </div>
                `;
                grid.appendChild(alertCard);
            }

            // Render Alerts List
            if (alertsList) {
                alertsList.innerHTML = '';
                if (alerts && alerts.length > 0) {
                    alerts.forEach(alert => {
                        const isSevere = alert.stock <= 0;
                        const alertItem = document.createElement('div');
                        alertItem.className = `alert-item ${isSevere ? '' : 'warning'}`;
                        alertItem.innerHTML = `
                            <div class="alert-item-info">
                                <h5>${Utils.escapeHtml(alert.productName)}</h5>
                                <p>${Utils.escapeHtml(alert.detail)} | Categoría: ${Utils.escapeHtml(alert.category || '')}</p>
                            </div>
                            <span class="alert-badge ${isSevere ? '' : 'warning'}">${isSevere ? 'Agotado' : 'Bajo Stock'}</span>
                        `;
                        alertsList.appendChild(alertItem);
                    });
                } else {
                    alertsList.innerHTML = `
                        <div style="text-align: center; color: var(--text-secondary); padding: 25px;">
                            <i class="fas fa-check-circle" style="color: var(--success); font-size: 24px; margin-bottom: 8px;"></i>
                            <p>¡Todo en orden! No hay productos con alertas de stock crítico.</p>
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.error('[Dashboard] Error rendering stats:', err);
        }
    }
}

window.AdminDashboardModule = AdminDashboardModule;
