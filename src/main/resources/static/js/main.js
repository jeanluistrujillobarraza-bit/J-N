/**
 * J&N Store - Main Application Orchestrator
 * Integrates all modules, sets up global facade and DOM events.
 */
class JNStoreApp {
    constructor() {
        // Initialize submodules
        this.auth = new AuthModule(this);
        this.catalog = new CatalogModule(this);
        this.cart = new CartModule(this);
        
        // Admin modules
        this.adminDashboard = new AdminDashboardModule(this);
        this.adminProducts = new AdminProductsModule(this);
        this.adminCategories = new AdminCategoriesModule(this);
        this.adminOrders = new AdminOrdersModule(this);
        this.adminTrash = new AdminTrashModule(this);

        this.currentAdminTab = 'dashboard';

        // Connect pagination callbacks to app instance for template onclicks
        this.setupPaginationBindings();
    }

    setupPaginationBindings() {
        // Catalog
        this['pagination_catalog-pagination-container'] = (p) => this.catalog.pagination.goToPage(p);
        this['paginationSize_catalog-pagination-container'] = (s) => this.catalog.pagination.changePageSize(s);

        // Admin Products
        this['pagination_admin-products-pagination-container'] = (p) => this.adminProducts.pagination.goToPage(p);
        this['paginationSize_admin-products-pagination-container'] = (s) => this.adminProducts.pagination.changePageSize(s);

        // Admin Orders
        this['pagination_admin-orders-pagination-container'] = (p) => this.adminOrders.pagination.goToPage(p);
        this['paginationSize_admin-orders-pagination-container'] = (s) => this.adminOrders.pagination.changePageSize(s);

        // Admin Trash
        this['pagination_admin-trash-pagination-container'] = (p) => this.adminTrash.pagination.goToPage(p);
        this['paginationSize_admin-trash-pagination-container'] = (s) => this.adminTrash.pagination.changePageSize(s);
    }

    async init() {
        console.log('>>> [J&N Store] Inicializando aplicación modular...');
        await this.auth.checkSession();
        await this.catalog.init();
        this.cart.renderCart();

        // Search Input live debouncing
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.catalog.setSearchQuery(e.target.value);
            }, 200));
        }

        // Admin search inputs
        const adminProdSearch = document.getElementById('admin-prod-search');
        if (adminProdSearch) {
            adminProdSearch.addEventListener('input', Utils.debounce((e) => {
                this.adminProducts.setSearch(e.target.value);
            }, 200));
        }

        const adminOrderSearch = document.getElementById('admin-order-search');
        if (adminOrderSearch) {
            adminOrderSearch.addEventListener('input', Utils.debounce((e) => {
                this.adminOrders.setSearch(e.target.value);
            }, 200));
        }

        // Checkout form submission
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('checkout-name')?.value.trim();
                const phone = document.getElementById('checkout-phone')?.value.trim();
                const address = document.getElementById('checkout-address')?.value.trim();
                const city = document.getElementById('checkout-city')?.value.trim();
                const paymentMethod = document.getElementById('checkout-payment')?.value;
                const notes = document.getElementById('checkout-notes')?.value.trim();

                this.cart.processCheckout({ name, phone, address, city, paymentMethod, notes });
            });
        }

        // Product edit form submission
        const prodForm = document.getElementById('product-form');
        if (prodForm) {
            prodForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.adminProducts.saveProduct(prodForm);
            });
        }
    }

    /* ==========================================================================
       FACADE API METHODS (for seamless HTML onclick integration)
       ========================================================================== */

    // Auth methods
    openLoginTab() { this.auth.openAuthModal('login'); }
    openRegisterTab() { this.auth.openAuthModal('register'); }
    closeLoginModal() { this.auth.closeAuthModal(); }
    setAuthTab(tab) { this.auth.setAuthTab(tab); }
    submitLogin(e) {
        if (e) e.preventDefault();
        const user = document.getElementById('login-username')?.value.trim();
        const pass = document.getElementById('login-password')?.value;
        this.auth.login(user, pass);
    }
    submitRegister(e) {
        if (e) e.preventDefault();
        const username = document.getElementById('reg-username')?.value.trim();
        const password = document.getElementById('reg-password')?.value;
        const firstName = document.getElementById('reg-firstname')?.value.trim();
        const lastName = document.getElementById('reg-lastname')?.value.trim();
        const phone = document.getElementById('reg-phone')?.value.trim();
        this.auth.register({ username, password, firstName, lastName, phone });
    }
    adminLogout() { this.auth.logout(); }

    // Mobile Hamburger Menu methods
    toggleMobileMenu() {
        const drawer = document.getElementById('mobile-menu-drawer');
        const overlay = document.getElementById('mobile-menu-overlay');
        if (drawer && overlay) {
            const isOpen = drawer.classList.contains('open');
            if (isOpen) {
                this.closeMobileMenu();
            } else {
                this.openMobileMenu();
            }
        }
    }

    openMobileMenu() {
        const drawer = document.getElementById('mobile-menu-drawer');
        const overlay = document.getElementById('mobile-menu-overlay');
        if (drawer) drawer.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeMobileMenu() {
        const drawer = document.getElementById('mobile-menu-drawer');
        const overlay = document.getElementById('mobile-menu-overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Catalog & Filter methods
    filterMainCategory(main) { this.catalog.filterMainCategory(main); }
    filterSubCategory(sub) { this.catalog.filterSubCategory(sub); }
    togglePillsExpanded(e) { this.catalog.togglePillsExpanded(e); }
    openProductDetails(id) { this.catalog.openProductDetails(id); }
    closeProductDetails() { this.catalog.closeProductDetails(); }
    openImageLightbox() { this.catalog.openImageLightbox(); }
    closeImageLightbox() { this.catalog.closeImageLightbox(); }
    selectDetailImage(idx) { this.catalog.selectDetailImage(idx); }
    selectDetailSize(size) { this.catalog.selectDetailSize(size); }
    selectDetailColor(color) { this.catalog.selectDetailColor(color); }

    // Cart methods
    openCart() { this.cart.openCart(); }
    closeCart() { this.cart.closeCart(); }
    updateCartQty(idx, delta) { this.cart.updateQuantity(idx, delta); }
    removeCartItem(idx) { this.cart.removeItem(idx); }
    openCheckout() { this.cart.openCheckout(); }
    closeCheckout() { this.cart.closeCheckout(); }
    closeReceiptModal() { this.cart.closeReceiptModal(); }
    
    quickAddToCart(id) {
        const prod = this.catalog.allProducts.find(p => p.id === id);
        if (!prod) return;
        if (prod.type === 'ropa' && prod.variations && prod.variations.length > 0) {
            this.openProductDetails(id);
        } else {
            this.cart.addToCart(prod, 1);
        }
    }

    addDetailToCart() {
        const prod = this.catalog.selectedDetailProduct;
        if (!prod) return;
        const qty = parseInt(document.getElementById('detail-quantity')?.value) || 1;
        this.cart.addToCart(prod, qty, this.catalog.selectedSize, this.catalog.selectedColor);
        this.closeProductDetails();
    }

    // Admin Navigation
    toggleAdminSection() {
        const adminSection = document.getElementById('admin-section');
        const storeSection = document.getElementById('store-section');
        if (adminSection) {
            if (adminSection.classList.contains('hidden')) {
                this.openAdminSection();
            } else {
                this.closeAdminSection();
            }
        }
    }

    openAdminSection() {
        const adminSection = document.getElementById('admin-section');
        const storeSection = document.getElementById('store-section');
        if (adminSection) adminSection.classList.remove('hidden');
        if (storeSection) storeSection.classList.add('hidden');
        this.setAdminTab(this.currentAdminTab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    closeAdminSection() {
        const adminSection = document.getElementById('admin-section');
        const storeSection = document.getElementById('store-section');
        if (adminSection) adminSection.classList.add('hidden');
        if (storeSection) storeSection.classList.remove('hidden');
    }

    async setAdminTab(tab) {
        this.currentAdminTab = tab;
        const tabs = ['dashboard', 'products', 'categories', 'orders', 'trash'];

        tabs.forEach(t => {
            const tabBtn = document.getElementById(`tab-${t}`);
            const contentEl = document.getElementById(`content-${t}`);
            if (tabBtn) {
                if (t === tab) tabBtn.classList.add('active');
                else tabBtn.classList.remove('active');
            }
            if (contentEl) {
                if (t === tab) contentEl.classList.remove('hidden');
                else contentEl.classList.add('hidden');
            }
        });

        if (tab === 'dashboard') {
            await this.adminDashboard.render();
        } else if (tab === 'products') {
            await this.adminProducts.render();
        } else if (tab === 'categories') {
            await this.adminCategories.render();
        } else if (tab === 'orders') {
            await this.adminOrders.render();
        } else if (tab === 'trash') {
            await this.adminTrash.render();
        }
    }

    // Admin Product Actions
    openProductModal(id = null) { this.adminProducts.openProductModal(id); }
    closeProductModal() { this.adminProducts.closeProductModal(); }
    previewProductImageUrl(url) { this.adminProducts.previewImageUrl(url); }
    toggleTypeFields() { this.adminProducts.toggleTypeFields(); }
    addProductVariation() { this.adminProducts.addVariation(); }
    removeProductVariation(idx) { this.adminProducts.removeVariation(idx); }
    deleteProductToTrash(id) { this.adminProducts.deleteProductToTrash(id); }
    filterAdminProductsByType(type) { this.adminProducts.setTypeFilter(type); }

    // Admin Category Actions
    addMainCategory() { this.adminCategories.addMainCategory(); }
    deleteMainCategory(id) { this.adminCategories.deleteMainCategory(id); }
    addSubCategory() { this.adminCategories.addSubCategory(); }
    deleteSubCategory(id) { this.adminCategories.deleteSubCategory(id); }

    // Admin Order Actions
    updateOrderStatus(id, status) { this.adminOrders.updateOrderStatus(id, status); }
    deleteOrderToTrash(id) { this.adminOrders.deleteOrderToTrash(id); }
    viewOrderReceipt(id) { this.adminOrders.viewOrderReceipt(id); }
    sendOrderWhatsAppDirect(id) { this.adminOrders.sendOrderWhatsAppDirect(id); }
    sendCustomerWhatsAppConfirmation() { this.adminOrders.sendCustomerWhatsAppConfirmation(); }
    copyWhatsAppConfirmationText() { this.adminOrders.copyWhatsAppConfirmationText(); }
    filterAdminOrdersByStatus(status) { this.adminOrders.setStatusFilter(status); }

    // Admin Trash Actions
    setTrashSubTab(tab) { this.adminTrash.setTrashSubTab(tab); }
    restoreProduct(id) { this.adminTrash.restoreProduct(id); }
    permanentDeleteProduct(id) { this.adminTrash.permanentDeleteProduct(id); }
    restoreOrder(id) { this.adminTrash.restoreOrder(id); }
    permanentDeleteOrder(id) { this.adminTrash.permanentDeleteOrder(id); }
}

// Global initialization
window.app = new JNStoreApp();
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
