// J&N Store Application Logic

class JNStore {
    constructor() {
        this.products = [];
        this.categories = [];
        this.mainCategories = [];
        this.cart = [];
        this.activeMainCategory = 'todos'; // 'todos', 'maquillaje', 'ropa', 'accesorios', 'perfumes', 'zapatos', etc.
        this.activeCategory = 'todos'; // subcategory: 'todos', 'bases', 'rubores', 'vestidos', etc.
        this.isPillsExpanded = false; // Collapsible subcategories pills toggle
        this.searchQuery = '';
        
        // Admin & Client Auth States
        this.isAdmin = false;
        this.isClient = false;
        this.currentUser = null;
        this.currentAdminTab = 'dashboard';
        this.orders = [];
        this.deletedOrders = [];
        this.deletedProducts = [];
        this.trashSubTab = 'products';
        
        // Temporary Form state
        this.formUploadedImages = [];
        
        // Detail Modal State
        this.selectedDetailProduct = null;
        this.selectedSize = '';
        this.selectedColor = '';
        this.selectedDetailImageIndex = 0;
    }

    // Initialize application
    async init() {
        this.loadCartFromStorage();
        this.loadRememberedUser();
        await this.checkSession();
        await this.fetchMainCategories();
        await this.fetchCategories();
        await this.fetchProducts();
        this.renderCart();
        
        // Seeding default categories list in forms
        this.populateCategorySelect();

        // Close dropdowns when clicking or touching outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('nav-more-dropdown');
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
            const filterWrapper = document.getElementById('filter-more-dropdown-wrapper');
            if (filterWrapper && !filterWrapper.contains(e.target)) {
                if (this.isPillsExpanded) {
                    this.isPillsExpanded = false;
                    this.renderNavigationCategories();
                }
            }
        });
        document.addEventListener('touchstart', (e) => {
            const dropdown = document.getElementById('nav-more-dropdown');
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
            const filterWrapper = document.getElementById('filter-more-dropdown-wrapper');
            if (filterWrapper && !filterWrapper.contains(e.target)) {
                if (this.isPillsExpanded) {
                    this.isPillsExpanded = false;
                    this.renderNavigationCategories();
                }
            }
        }, { passive: true });
    }

    // Load cart from local storage
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

    // Save cart to local storage
    saveCartToStorage() {
        localStorage.setItem('jn_cart', JSON.stringify(this.cart));
    }

    // Check backend session status
    async checkSession() {
        try {
            const res = await fetch('/api/auth/check');
            const data = await res.json();
            if (data.authenticated) {
                if (data.role === 'ADMIN') {
                    this.isAdmin = true;
                    this.isClient = false;
                    this.currentUser = { firstName: data.firstName, lastName: data.lastName, phone: data.phone || '' };
                } else {
                    this.isAdmin = false;
                    this.isClient = true;
                    this.currentUser = { firstName: data.firstName, lastName: data.lastName, phone: data.phone || '' };
                }
                this.prefillCustomerName(data.firstName, data.lastName, data.phone || '');
            } else {
                this.isAdmin = false;
                this.isClient = false;
                this.currentUser = null;
            }
            this.updateAdminHeaderUI();
        } catch (e) {
            console.error("Error al verificar sesión", e);
        }
    }

    prefillCustomerName(first, last, phone) {
        const firstNameEl = document.getElementById('cart-customer-first-name');
        const lastNameEl = document.getElementById('cart-customer-last-name');
        const phoneEl = document.getElementById('cart-customer-phone');
        if (firstNameEl && first) firstNameEl.value = first;
        if (lastNameEl && last) lastNameEl.value = last;
        if (phoneEl && phone) phoneEl.value = phone;
    }

    slugify(text) {
        return text.toString().toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remove accents
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }

    getMainCategories() {
        if (this.mainCategories && this.mainCategories.length > 0) {
            return this.mainCategories.map(m => m.name);
        }
        return ['Maquillaje', 'Ropa', 'Accesorios', 'Perfumes', 'Zapatos'];
    }

    renderNavigationCategories() {
        const headerNav = document.getElementById('header-nav-links');
        const filterPills = document.getElementById('catalog-filter-pills');

        const isCurrentMainActive = (mainName) => {
            if (!this.activeMainCategory) return false;
            return this.activeMainCategory.toLowerCase() === (mainName || '').toLowerCase();
        };

        const isCurrentSubActive = (subName) => {
            if (!this.activeCategory) return false;
            return this.activeCategory.toLowerCase() === (subName || '').toLowerCase();
        };

        // 1. Render Top Header Main Departments (Todos | Maquillaje | Ropa | Accesorios | Perfumes | Zapatos)
        if (headerNav) {
            const mainCats = this.getMainCategories();
            const isTodosActive = isCurrentMainActive('todos');
            let navHtml = `<a href="#" onclick="app.filterMainCategory('todos'); return false;" class="${isTodosActive ? 'active-nav' : ''}" id="nav-todos">Todos</a>`;

            const maxVisible = 6;
            const useDropdown = mainCats.length > maxVisible;
            const visibleMains = useDropdown ? mainCats.slice(0, 5) : mainCats;
            const moreMains = useDropdown ? mainCats.slice(5) : [];

            visibleMains.forEach(mainName => {
                const slug = this.slugify(mainName);
                const isActive = isCurrentMainActive(mainName);
                const safeName = mainName.replace(/'/g, "\\'");
                navHtml += `<a href="#" onclick="app.filterMainCategory('${safeName}'); return false;" class="${isActive ? 'active-nav' : ''}" id="nav-${slug}">${mainName}</a>`;
            });

            if (moreMains.length > 0) {
                const activeMore = moreMains.find(m => isCurrentMainActive(m));
                const isAnyMoreActive = !!activeMore;
                const dropdownLabel = activeMore ? activeMore : 'Más';

                navHtml += `
                    <div class="nav-dropdown" id="nav-more-dropdown">
                        <a href="#" class="nav-dropdown-btn ${isAnyMoreActive ? 'active-nav' : ''}" onclick="app.toggleMoreDropdown(event); return false;">
                            ${dropdownLabel} <i class="fas fa-chevron-down"></i>
                        </a>
                        <div class="nav-dropdown-menu" id="nav-dropdown-menu">
                `;

                moreMains.forEach(mainName => {
                    const slug = this.slugify(mainName);
                    const isActive = isCurrentMainActive(mainName);
                    const safeName = mainName.replace(/'/g, "\\'");
                    navHtml += `<a href="#" onclick="app.filterMainCategory('${safeName}'); app.closeMoreDropdown(); return false;" class="${isActive ? 'active-dropdown-item' : ''}" id="nav-${slug}">${mainName}</a>`;
                });

                navHtml += `
                        </div>
                    </div>
                `;
            }

            headerNav.innerHTML = navHtml;
        }

        // 2. Render Catalog Subcategory Filter Pills based on active Main Category
        if (filterPills) {
            let subCats = [];
            if (this.activeMainCategory === 'todos') {
                subCats = this.categories;
            } else {
                const activeMainLower = this.activeMainCategory.toLowerCase();
                subCats = this.categories.filter(c => {
                    const parentLower = (c.parentCategory || 'Maquillaje').toLowerCase();
                    return parentLower === activeMainLower || c.name.toLowerCase() === activeMainLower;
                });
            }

            const isTodosSubActive = isCurrentSubActive('todos');
            let pillsHtml = `<button class="pill ${isTodosSubActive ? 'active' : ''}" onclick="app.filterSubCategory('todos')" id="pill-todos">Todos</button>`;
            
            const maxVisiblePills = 3;
            const hasMore = subCats.length > maxVisiblePills;
            const visiblePills = subCats.slice(0, maxVisiblePills);
            const morePills = subCats.slice(maxVisiblePills);

            visiblePills.forEach(c => {
                const slug = this.slugify(c.name);
                const isActive = isCurrentSubActive(c.name);
                const safeName = (c.name || '').replace(/'/g, "\\'");
                pillsHtml += `<button class="pill ${isActive ? 'active' : ''}" onclick="app.filterSubCategory('${safeName}')" id="pill-${slug}">${c.name}</button>`;
            });

            if (hasMore) {
                const activeMore = morePills.find(c => isCurrentSubActive(c.name));
                const isAnyMoreActive = !!activeMore;
                const toggleLabel = activeMore ? activeMore.name : 'Ver Más';

                pillsHtml += `
                    <div class="filter-more-dropdown-wrapper" id="filter-more-dropdown-wrapper">
                        <button class="pill pill-toggle-more ${this.isPillsExpanded ? 'active-toggle' : ''} ${isAnyMoreActive ? 'active' : ''}" onclick="app.togglePillsExpanded(event)" id="pill-toggle-more">
                            ${toggleLabel} <i class="fas ${this.isPillsExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}" style="font-size: 10px; margin-left: 4px;"></i>
                        </button>
                        <div class="filter-more-dropdown ${this.isPillsExpanded ? 'show' : ''}" id="filter-more-dropdown-menu">
                `;

                morePills.forEach(c => {
                    const slug = this.slugify(c.name);
                    const isActive = isCurrentSubActive(c.name);
                    const safeName = (c.name || '').replace(/'/g, "\\'");
                    pillsHtml += `
                        <button type="button" class="dropdown-pill-item ${isActive ? 'active' : ''}" onclick="app.filterSubCategory('${safeName}'); app.closePillsExpanded();" id="pill-drop-${slug}">
                            <span>${c.name}</span>
                            ${isActive ? '<i class="fas fa-check" style="font-size: 10px; color: var(--white);"></i>' : ''}
                        </button>
                    `;
                });

                pillsHtml += `
                        </div>
                    </div>
                `;
            }

            filterPills.innerHTML = pillsHtml;
        }
    }

    togglePillsExpanded(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.isPillsExpanded = !this.isPillsExpanded;
        this.renderNavigationCategories();
    }

    closePillsExpanded() {
        this.isPillsExpanded = false;
        this.renderNavigationCategories();
    }

    toggleMoreDropdown(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const dd = document.getElementById('nav-more-dropdown');
        if (dd) {
            dd.classList.toggle('open');
        }
    }

    closeMoreDropdown() {
        const dd = document.getElementById('nav-more-dropdown');
        if (dd) {
            dd.classList.remove('open');
        }
    }

    // Fetch main categories (departments)
    async fetchMainCategories() {
        try {
            const res = await fetch('/api/main-categories');
            this.mainCategories = await res.json();
            this.renderMainCategoriesList();
            this.populateParentCategorySelect();
            this.renderNavigationCategories();
        } catch (e) {
            console.error("Error al obtener categorías principales", e);
        }
    }

    // Fetch categories (subcategories)
    async fetchCategories() {
        try {
            const res = await fetch('/api/categories');
            this.categories = await res.json();
            this.renderCategoriesList();
            this.populateCategorySelect();
            this.renderNavigationCategories();
        } catch (e) {
            console.error("Error al obtener categorías", e);
        }
    }

    // Fetch products
    async fetchProducts() {
        try {
            let url = '/api/products';
            const params = [];
            if (this.activeMainCategory && this.activeMainCategory !== 'todos') {
                params.push(`mainCategory=${encodeURIComponent(this.activeMainCategory)}`);
            }
            if (this.activeCategory && this.activeCategory !== 'todos') {
                params.push(`category=${encodeURIComponent(this.activeCategory)}`);
            }
            if (this.searchQuery) {
                params.push(`query=${encodeURIComponent(this.searchQuery)}`);
            }
            if (params.length > 0) {
                url += '?' + params.join('&');
            }

            const res = await fetch(url);
            this.products = await res.json();
            
            if (this.isAdmin) {
                this.renderAdminInventory();
                this.renderAdminDashboard();
            }
            this.renderProducts();
        } catch (e) {
            console.error("Error al obtener productos", e);
        }
    }

    // Render client catalog
    renderProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (this.products.length === 0) {
            grid.innerHTML = `
                <div class="empty-cart-message" style="grid-column: 1/-1;">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron productos en esta sección.</p>
                </div>`;
            return;
        }

        this.products.forEach(p => {
            const mainImg = p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';
            const isClothing = p.type === 'ropa';
            
            // Check overall stock
            let isOutOfStock = false;
            if (p.type === 'maquillaje') {
                isOutOfStock = p.generalStock <= 0;
            } else {
                // For clothing, out of stock if all variations are 0
                isOutOfStock = !p.variations || p.variations.length === 0 || p.variations.every(v => v.stock <= 0);
            }

            // Calculate stock display text
            let stockHtml = '';
            if (p.type === 'maquillaje') {
                if (isOutOfStock) {
                    stockHtml = `<span class="product-card-stock out-of-stock">Agotado</span>`;
                } else {
                    stockHtml = `<span class="product-card-stock">Quedan: ${p.generalStock} unidades</span>`;
                }
            } else {
                const totalStock = p.variations ? p.variations.reduce((acc, curr) => acc + curr.stock, 0) : 0;
                if (totalStock <= 0) {
                    stockHtml = `<span class="product-card-stock out-of-stock">Agotado</span>`;
                } else {
                    const availableSizes = p.variations ? [...new Set(p.variations.filter(v => v.stock > 0).map(v => v.size))] : [];
                    const sizeText = availableSizes.length > 0 ? ` (Tallas: ${availableSizes.join(', ')})` : '';
                    stockHtml = `<span class="product-card-stock">Quedan: ${totalStock} unidades${sizeText}</span>`;
                }
            }

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <span class="product-card-badge ${p.type}">${p.type}</span>
                <div class="product-card-image" onclick="app.openProductDetails('${p.id}')">
                    <img src="${mainImg}" alt="${p.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';">
                    <div class="quick-view-overlay">
                        <span>Ver Detalles</span>
                    </div>
                </div>
                <div class="product-card-info">
                    <span class="product-card-category">${p.category}</span>
                    <h4 class="product-card-title">${p.name}</h4>
                    <span class="product-card-price">${this.formatPrice(p.price)}</span>
                    ${stockHtml}
                    <div class="product-card-action">
                        <button onclick="app.openProductDetails('${p.id}')" ${isOutOfStock ? 'disabled' : ''}>
                            ${isOutOfStock ? 'Agotado' : 'Comprar'}
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Open detail modal
    openProductDetails(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        this.selectedDetailProduct = product;
        this.selectedSize = '';
        this.selectedColor = '';
        this.selectedDetailImageIndex = 0;

        const modal = document.getElementById('product-detail-modal');
        const content = document.getElementById('product-detail-content');
        
        modal.classList.remove('hidden');
        this.renderProductDetailsContent();
    }

    renderProductDetailsContent() {
        const p = this.selectedDetailProduct;
        const content = document.getElementById('product-detail-content');
        if (!p || !content) return;

        const images = p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop'];
        const currentMainImage = images[this.selectedDetailImageIndex];

        // Create Thumbnail buttons html
        let thumbsHtml = '';
        if (images.length > 1) {
            images.forEach((img, idx) => {
                thumbsHtml += `
                    <div class="thumb ${idx === this.selectedDetailImageIndex ? 'active' : ''}" onclick="app.setDetailImageIndex(${idx})">
                        <img src="${img}">
                    </div>`;
            });
        }

        // Determine stock availability
        let stockIndicatorHtml = '';
        let isGeneralOutOfStock = false;
        
        if (p.type === 'maquillaje') {
            isGeneralOutOfStock = p.generalStock <= 0;
            if (isGeneralOutOfStock) {
                stockIndicatorHtml = `<span class="stock-status-indicator out-of-stock">Agotado</span>`;
            } else {
                stockIndicatorHtml = `<span class="stock-status-indicator in-stock">Disponible (${p.generalStock} unidades)</span>`;
            }
        }

        // Variations logic for clothing
        let selectorsHtml = '';
        if (p.type === 'ropa') {
            // Unique sizes
            const sizes = [...new Set(p.variations.map(v => v.size))];
            
            let sizePills = '';
            sizes.forEach(sz => {
                // Check if this size has stock in ANY color
                const hasStock = p.variations.some(v => v.size === sz && v.stock > 0);
                sizePills += `
                    <button class="size-pill ${this.selectedSize === sz ? 'active' : ''} ${!hasStock ? 'disabled' : ''}" 
                            onclick="app.selectDetailSize('${sz}')" ${!hasStock ? 'disabled' : ''}>
                        ${sz}
                    </button>`;
            });

            // Get available colors for selected size (or all if none selected)
            let colors = [];
            if (this.selectedSize) {
                colors = p.variations.filter(v => v.size === this.selectedSize).map(v => v.color);
            } else {
                colors = [...new Set(p.variations.map(v => v.color))];
            }

            let colorPills = '';
            colors.forEach(col => {
                // Check if this specific combo (or general color if no size selected) is in stock
                let hasStock = false;
                if (this.selectedSize) {
                    hasStock = p.variations.some(v => v.size === this.selectedSize && v.color === col && v.stock > 0);
                } else {
                    hasStock = p.variations.some(v => v.color === col && v.stock > 0);
                }
                
                colorPills += `
                    <button class="color-pill ${this.selectedColor === col ? 'active' : ''} ${!hasStock ? 'disabled' : ''}"
                            onclick="app.selectDetailColor('${col}')" ${!hasStock ? 'disabled' : ''}>
                        ${col}
                    </button>`;
            });

            // Stock details for selection
            let currentComboStock = -1;
            if (this.selectedSize && this.selectedColor) {
                const match = p.variations.find(v => v.size === this.selectedSize && v.color === this.selectedColor);
                currentComboStock = match ? match.stock : 0;
            }

            if (this.selectedSize && this.selectedColor) {
                if (currentComboStock <= 0) {
                    stockIndicatorHtml = `<span class="stock-status-indicator out-of-stock">Esta combinación está Agotada</span>`;
                } else {
                    stockIndicatorHtml = `<span class="stock-status-indicator in-stock">Disponible (${currentComboStock} unidades)</span>`;
                }
            } else {
                stockIndicatorHtml = `<span class="stock-status-indicator">Selecciona talla y color para ver existencias.</span>`;
            }

            selectorsHtml = `
                <div class="detail-selectors">
                    <div class="selector-group">
                        <label>Talla</label>
                        <div class="size-selector">${sizePills}</div>
                    </div>
                    <div class="selector-group">
                        <label>Color</label>
                        <div class="color-selector">${colorPills}</div>
                    </div>
                </div>`;
        }

        // Disable button check
        let isBtnDisabled = false;
        if (p.type === 'maquillaje' && isGeneralOutOfStock) {
            isBtnDisabled = true;
        } else if (p.type === 'ropa') {
            if (!this.selectedSize || !this.selectedColor) {
                isBtnDisabled = true;
            } else {
                const match = p.variations.find(v => v.size === this.selectedSize && v.color === this.selectedColor);
                if (!match || match.stock <= 0) {
                    isBtnDisabled = true;
                }
            }
        }

        content.innerHTML = `
            <div class="detail-images-container">
                <div class="main-detail-image">
                    <img src="${currentMainImage}" id="detail-main-img-el" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';">
                </div>
                <div class="thumbnail-images">${thumbsHtml}</div>
            </div>
            <div class="detail-info">
                <span class="detail-category">${p.category}</span>
                <h2 class="detail-title">${p.name}</h2>
                <span class="detail-price">${this.formatPrice(p.price)}</span>
                <p class="detail-description">${p.description}</p>
                
                ${selectorsHtml}
                
                <div style="margin-bottom: 20px;">
                    ${stockIndicatorHtml}
                </div>

                <button class="gold-btn w-100" onclick="app.addItemToCart()" ${isBtnDisabled ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> Agregar al Carrito
                </button>
            </div>
        `;
    }

    setDetailImageIndex(idx) {
        this.selectedDetailImageIndex = idx;
        this.renderProductDetailsContent();
    }

    selectDetailSize(size) {
        this.selectedSize = size;
        // Reset color selection if it is no longer valid for the selected size
        const p = this.selectedDetailProduct;
        if (this.selectedColor) {
            const isValid = p.variations.some(v => v.size === size && v.color === this.selectedColor && v.stock > 0);
            if (!isValid) this.selectedColor = '';
        }
        this.renderProductDetailsContent();
    }

    selectDetailColor(color) {
        this.selectedColor = color;
        this.renderProductDetailsContent();
    }

    closeDetailModal() {
        document.getElementById('product-detail-modal').classList.add('hidden');
        this.selectedDetailProduct = null;
    }

    // Cart Operations
    addItemToCart() {
        const p = this.selectedDetailProduct;
        if (!p) return;

        let cartItem = {
            productId: p.id,
            name: p.name,
            price: p.price,
            image: p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop',
            type: p.type,
            quantity: 1
        };

        if (p.type === 'ropa') {
            cartItem.size = this.selectedSize;
            cartItem.color = this.selectedColor;
        }

        // Check if already in cart
        const existingIdx = this.cart.findIndex(item => {
            if (item.productId !== p.id) return false;
            if (p.type === 'ropa') {
                return item.size === this.selectedSize && item.color === this.selectedColor;
            }
            return true;
        });

        // Check stock availability
        let availableStock = 0;
        if (p.type === 'maquillaje') {
            availableStock = p.generalStock;
        } else {
            const match = p.variations.find(v => v.size === this.selectedSize && v.color === this.selectedColor);
            availableStock = match ? match.stock : 0;
        }

        const currentQtyInCart = existingIdx !== -1 ? this.cart[existingIdx].quantity : 0;
        if (currentQtyInCart + 1 > availableStock) {
            alert(`No puedes agregar más unidades. Solo quedan ${availableStock} disponibles en inventario.`);
            return;
        }

        if (existingIdx !== -1) {
            this.cart[existingIdx].quantity += 1;
        } else {
            this.cart.push(cartItem);
        }

        this.saveCartToStorage();
        this.renderCart();
        this.closeDetailModal();
        this.toggleCart(true); // Open cart sidebar
    }

    toggleCart(forceOpen = false) {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('drawer-overlay');
        
        if (forceOpen || !drawer.classList.contains('open')) {
            drawer.classList.add('open');
            overlay.classList.add('open');
        } else {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
        }
    }

    renderCart() {
        const itemsContainer = document.getElementById('cart-drawer-items');
        const badgeCount = document.getElementById('cart-badge-count');
        const totalPriceEl = document.getElementById('cart-total-price');

        if (!itemsContainer) return;

        itemsContainer.innerHTML = '';
        
        let totalCount = 0;
        let totalPrice = 0;

        if (this.cart.length === 0) {
            itemsContainer.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Tu carrito está vacío.</p>
                </div>`;
            badgeCount.innerText = '0';
            totalPriceEl.innerText = this.formatPrice(0);
            return;
        }

        this.cart.forEach((item, idx) => {
            totalCount += item.quantity;
            const subtotal = item.price * item.quantity;
            totalPrice += subtotal;

            const variationText = item.type === 'ropa' ? `Talla: ${item.size} | Color: ${item.color}` : 'Maquillaje';

            const row = document.createElement('div');
            row.className = 'cart-item';
            row.innerHTML = `
                <div class="cart-item-img">
                    <img src="${item.image}">
                </div>
                <div class="cart-item-details">
                    <h5 class="cart-item-name">${item.name}</h5>
                    <p class="cart-item-variation">${variationText}</p>
                    <span class="cart-item-price">${this.formatPrice(item.price)}</span>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="app.updateCartQty(${idx}, -1)"><i class="fas fa-minus"></i></button>
                        <span class="qty-val">${item.quantity}</span>
                        <button class="qty-btn" onclick="app.updateCartQty(${idx}, 1)"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                <button class="remove-cart-item" onclick="app.removeFromCart(${idx})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            itemsContainer.appendChild(row);
        });

        badgeCount.innerText = totalCount;
        totalPriceEl.innerText = this.formatPrice(totalPrice);
    }

    updateCartQty(index, change) {
        const item = this.cart[index];
        if (!item) return;

        const newQty = item.quantity + change;
        if (newQty <= 0) {
            this.removeFromCart(index);
            return;
        }

        // Fetch original product to validate stock
        const p = this.products.find(prod => prod.id === item.productId);
        if (p) {
            let availableStock = 0;
            if (p.type === 'maquillaje') {
                availableStock = p.generalStock;
            } else {
                const match = p.variations.find(v => v.size === item.size && v.color === item.color);
                availableStock = match ? match.stock : 0;
            }

            if (newQty > availableStock) {
                alert(`No puedes agregar más unidades. El stock máximo es ${availableStock}.`);
                return;
            }
        }

        item.quantity = newQty;
        this.saveCartToStorage();
        this.renderCart();
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.saveCartToStorage();
        this.renderCart();
    }

    async finalizePurchase() {
        if (this.cart.length === 0) return;

        let customerName = '';
        let customerPhone = '';
        const firstNameEl = document.getElementById('cart-customer-first-name');
        const lastNameEl = document.getElementById('cart-customer-last-name');
        const phoneEl = document.getElementById('cart-customer-phone');

        if (this.isClient && this.currentUser) {
            customerName = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            customerPhone = this.currentUser.phone || '';
        } else {
            if (!firstNameEl || !firstNameEl.value.trim() || !lastNameEl || !lastNameEl.value.trim() || !phoneEl || !phoneEl.value.trim()) {
                alert('Por favor, ingresa tu Nombre, Apellido y WhatsApp para realizar el pedido.');
                if (firstNameEl && !firstNameEl.value.trim()) firstNameEl.focus();
                else if (lastNameEl && !lastNameEl.value.trim()) lastNameEl.focus();
                else if (phoneEl) phoneEl.focus();
                return;
            }
            customerName = `${firstNameEl.value.trim()} ${lastNameEl.value.trim()}`;
            customerPhone = phoneEl.value.trim();
        }

        try {
            // Map cart items to OrderItems
            const orderItems = this.cart.map(item => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                size: item.size || null,
                color: item.color || null,
                type: item.type
            }));

            // Create Order in DB
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: customerName,
                    customerPhone: customerPhone,
                    items: orderItems
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                alert(errData.error || 'Ocurrió un error al registrar el pedido.');
                return;
            }

            const newOrder = await res.json();

            let total = 0;
            this.cart.forEach(item => {
                total += item.price * item.quantity;
            });

            const dateObj = new Date();
            const currentDate = dateObj.toLocaleDateString('es-CO');
            const currentTime = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

            const phone = "3135794396";
            
            const eSparkles = String.fromCodePoint(0x2728);
            const eHeart = String.fromCodePoint(0x1F496);
            const eBag = String.fromCodePoint(0x1F6CD, 0xFE0F);
            const eMoney = String.fromCodePoint(0x1F4B0);
            const eDoc = String.fromCodePoint(0x1F4C4);
            
            let orderText = `${eSparkles} *Confirmación de Compra - J&N* ${eSparkles}\n\n`;
            orderText += `*Cliente:* ${newOrder.customerName}\n`;
            orderText += `*Pedido:* #${newOrder.orderNumber}\n`;
            orderText += `*Fecha:* ${currentDate}\n`;
            orderText += `*Hora:* ${currentTime}\n\n`;
            
            orderText += `${eBag} *PRODUCTOS:*\n`;
            this.cart.forEach(item => {
                const subtotal = item.price * item.quantity;
                const detail = item.type === 'ropa' ? ` (Talla: ${item.size} | Color: ${item.color})` : '';
                orderText += `• *${item.name}* x${item.quantity}${detail} — ${this.formatPrice(subtotal)}\n`;
            });

            orderText += `\n${eMoney} *TOTAL A PAGAR: ${this.formatPrice(total)}*\n\n`;
            orderText += `Una vez que hayas confirmado y realizado el pago de tu pedido, te enviaremos tu *recibo de pago* como comprobante de la transacción.\n\n`;
            orderText += `Agradecemos sinceramente tu confianza y preferencia. En J&N trabajamos para brindarte la mejor experiencia de compra.\n\n`;
            orderText += `¡Gracias por elegirnos! ${eHeart}`;

            const waUrl = `https://api.whatsapp.com/send?phone=57${phone}&text=${encodeURIComponent(orderText)}`;

            // Reset cart
            this.cart = [];
            if (firstNameEl) firstNameEl.value = '';
            if (lastNameEl) lastNameEl.value = '';
            if (phoneEl) phoneEl.value = '';
            this.saveCartToStorage();
            this.renderCart();
            this.toggleCart(false);

            // Redirect
            window.open(waUrl, '_blank');
        } catch (e) {
            console.error(e);
            alert('Error de conexión al procesar el pedido.');
        }
    }

    // Filter by Main Department (TODOS, MAQUILLAJE, ROPA, ACCESORIOS, PERFUMES, ZAPATOS)
    filterMainCategory(mainCategory) {
        this.activeMainCategory = mainCategory || 'todos';
        this.activeCategory = 'todos'; // Reset subcategory filter when switching main department

        // Hide banner if not on Home/Todos
        const banner = document.getElementById('hero-banner');
        if (banner) {
            if (this.activeMainCategory.toLowerCase() === 'todos' && !this.isAdmin) {
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }

        this.renderNavigationCategories();
        this.showCatalog();
        this.fetchProducts();
    }

    // Filter by Subcategory Pill in Catalog
    filterSubCategory(subCategory) {
        this.activeCategory = subCategory || 'todos';

        this.renderNavigationCategories();
        this.showCatalog();
        this.fetchProducts();
    }

    // Generic Category Filter for backwards compatibility
    filterCategory(category) {
        const catLower = (category || 'todos').toLowerCase();
        const mainCats = this.getMainCategories().map(m => m.toLowerCase());
        if (mainCats.includes(catLower) || catLower === 'todos') {
            this.filterMainCategory(category);
        } else {
            this.filterSubCategory(category);
        }
    }

    handleSearch(event) {
        this.searchQuery = event.target.value;
        this.showCatalog();
        this.fetchProducts();
    }

    showCatalog() {
        document.getElementById('catalog-section').classList.remove('hidden');
        if (this.activeMainCategory === 'todos') {
            document.getElementById('hero-banner').classList.remove('hidden');
        } else {
            document.getElementById('hero-banner').classList.add('hidden');
        }
        document.getElementById('admin-section').classList.add('hidden');
    }

    // Admin/Client Navigation Router
    handleAdminNav() {
        if (this.isAdmin) {
            // Admin already logged in: switch view to panel
            document.getElementById('catalog-section').classList.add('hidden');
            document.getElementById('hero-banner').classList.add('hidden');
            document.getElementById('admin-section').classList.remove('hidden');
            this.setAdminTab(this.currentAdminTab);
        } else if (this.isClient) {
            // Client logged in: click header button to logout
            if (confirm(`Hola ${this.currentUser.firstName}, ¿deseas cerrar tu sesión?`)) {
                this.handleLogout();
            }
        } else {
            // Not logged in: open modal
            document.getElementById('login-modal').classList.remove('hidden');
            this.setAuthTab('login');
        }
    }

    loadRememberedUser() {
        const savedUsername = localStorage.getItem('jn_remember_username');
        const isRemembered = localStorage.getItem('jn_remember_me') === 'true';
        const userEl = document.getElementById('login-username');
        const remEl = document.getElementById('login-remember-me');
        if (userEl && savedUsername && isRemembered) {
            userEl.value = savedUsername;
        }
        if (remEl) {
            remEl.checked = isRemembered;
        }
    }

    showAuthError(formType, message) {
        const errorEl = document.getElementById(`${formType}-error-msg`);
        if (errorEl) {
            errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>${message}</span>`;
            errorEl.classList.remove('hidden');
        } else {
            alert(message);
        }
    }

    clearAuthErrors() {
        const loginErr = document.getElementById('login-error-msg');
        const regErr = document.getElementById('register-error-msg');
        if (loginErr) {
            loginErr.innerHTML = '';
            loginErr.classList.add('hidden');
        }
        if (regErr) {
            regErr.innerHTML = '';
            regErr.classList.add('hidden');
        }
    }

    closeLoginModal() {
        document.getElementById('login-modal').classList.add('hidden');
        this.clearAuthErrors();
        // Clear login inputs (preserve username if remember me is active)
        const isRemembered = localStorage.getItem('jn_remember_me') === 'true';
        const savedUsername = localStorage.getItem('jn_remember_username') || '';
        const userEl = document.getElementById('login-username');
        const loginPass = document.getElementById('login-password');
        
        if (userEl) {
            userEl.value = isRemembered ? savedUsername : '';
        }
        if (loginPass) {
            loginPass.value = '';
            loginPass.type = 'password';
        }
        // Clear register inputs
        document.getElementById('register-first-name').value = '';
        document.getElementById('register-last-name').value = '';
        document.getElementById('register-phone').value = '';
        document.getElementById('register-username').value = '';
        const regPass = document.getElementById('register-password');
        if (regPass) {
            regPass.value = '';
            regPass.type = 'password';
        }
        // Reset eye icons
        document.querySelectorAll('.toggle-password-btn i').forEach(icon => {
            icon.className = 'fas fa-eye';
        });
        document.querySelectorAll('.toggle-password-btn').forEach(btn => {
            btn.title = 'Mostrar contraseña';
            btn.setAttribute('aria-label', 'Mostrar contraseña');
        });
    }

    togglePasswordVisibility(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.className = 'fas fa-eye-slash';
            }
            btn.title = 'Ocultar contraseña';
            btn.setAttribute('aria-label', 'Ocultar contraseña');
        } else {
            input.type = 'password';
            if (icon) {
                icon.className = 'fas fa-eye';
            }
            btn.title = 'Mostrar contraseña';
            btn.setAttribute('aria-label', 'Mostrar contraseña');
        }
    }

    setAuthTab(tab) {
        this.clearAuthErrors();
        const loginBtn = document.getElementById('auth-tab-login');
        const registerBtn = document.getElementById('auth-tab-register');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const subtitle = document.getElementById('auth-subtitle');

        if (tab === 'login') {
            this.loadRememberedUser();
            if (loginBtn) {
                loginBtn.style.color = 'var(--gold)';
                loginBtn.style.borderBottom = '2px solid var(--gold)';
            }
            if (registerBtn) {
                registerBtn.style.color = 'var(--gray-dark)';
                registerBtn.style.borderBottom = 'none';
            }
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (subtitle) subtitle.innerText = 'ACCESO DE CLIENTES';
        } else {
            if (loginBtn) {
                loginBtn.style.color = 'var(--gray-dark)';
                loginBtn.style.borderBottom = 'none';
            }
            if (registerBtn) {
                registerBtn.style.color = 'var(--gold)';
                registerBtn.style.borderBottom = '2px solid var(--gold)';
            }
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
            if (subtitle) subtitle.innerText = 'Crea tu Cuenta de Cliente';
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        this.clearAuthErrors();

        const usernameEl = document.getElementById('login-username');
        const passwordEl = document.getElementById('login-password');
        const rememberEl = document.getElementById('login-remember-me');
        const submitBtn = document.getElementById('login-submit-btn');

        const usernameVal = usernameEl.value.trim();
        const passwordVal = passwordEl.value;

        if (rememberEl && rememberEl.checked) {
            localStorage.setItem('jn_remember_username', usernameVal);
            localStorage.setItem('jn_remember_me', 'true');
        } else {
            localStorage.removeItem('jn_remember_username');
            localStorage.removeItem('jn_remember_me');
        }

        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Iniciar Sesión';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameVal, password: passwordVal })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.role === 'ADMIN') {
                    this.isAdmin = true;
                    this.isClient = false;
                    this.currentUser = { firstName: data.firstName, lastName: data.lastName, phone: data.phone || '' };
                    this.updateAdminHeaderUI();
                    this.closeLoginModal();
                    await this.fetchProducts();
                    this.handleAdminNav();
                } else {
                    this.isAdmin = false;
                    this.isClient = true;
                    this.currentUser = { firstName: data.firstName, lastName: data.lastName, phone: data.phone || '' };
                    this.prefillCustomerName(data.firstName, data.lastName, data.phone || '');
                    this.updateAdminHeaderUI();
                    this.closeLoginModal();
                    alert(`¡Bienvenida, ${data.firstName}! Ya puedes realizar tus pedidos.`);
                }
            } else {
                const err = await res.json();
                const msg = err.error || 'Usuario no existente';
                this.showAuthError('login', msg);
            }
        } catch (e) {
            this.showAuthError('login', 'Error de conexión al servidor.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        this.clearAuthErrors();

        const firstName = document.getElementById('register-first-name').value.trim();
        const lastName = document.getElementById('register-last-name').value.trim();
        const phone = document.getElementById('register-phone').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const submitBtn = document.getElementById('register-submit-btn');

        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Crear Cuenta';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, phone, username, password, role: 'CLIENT' })
            });

            if (res.ok) {
                alert('¡Registro exitoso! Ya puedes iniciar sesión con tu usuario.');
                document.getElementById('login-username').value = username;
                this.setAuthTab('login');
            } else {
                const err = await res.json();
                const msg = err.error || 'Error al registrar la cuenta.';
                this.showAuthError('register', msg);
            }
        } catch (e) {
            this.showAuthError('register', 'Error de conexión.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.isAdmin = false;
            this.isClient = false;
            this.currentUser = null;
            this.updateAdminHeaderUI();
            this.showCatalog();
            
            const firstNameEl = document.getElementById('cart-customer-first-name');
            const lastNameEl = document.getElementById('cart-customer-last-name');
            const phoneEl = document.getElementById('cart-customer-phone');
            if (firstNameEl) firstNameEl.value = '';
            if (lastNameEl) lastNameEl.value = '';
            if (phoneEl) phoneEl.value = '';

            await this.fetchProducts();
        } catch (e) {
            console.error(e);
        }
    }

    updateAdminHeaderUI() {
        const guestFields = document.getElementById('cart-guest-fields');
        const container = document.getElementById('auth-header-actions');

        // Toggle guest name fields in cart drawer
        if (guestFields) {
            if (this.isClient) {
                guestFields.classList.add('hidden');
            } else {
                guestFields.classList.remove('hidden');
            }
        }

        if (!container) return;

        if (this.isAdmin) {
            container.innerHTML = `
                <button class="admin-btn" onclick="app.handleAdminNav()" style="border-color: var(--gold); color: var(--gold);">
                    <i class="fas fa-cog"></i> <span class="btn-text">Panel</span>
                </button>
                <button class="admin-btn" onclick="app.handleLogout()" style="border-color: var(--danger); color: var(--danger);">
                    <i class="fas fa-sign-out-alt"></i> <span class="btn-text">Salir</span>
                </button>`;
        } else if (this.isClient) {
            container.innerHTML = `
                <button class="admin-btn" style="pointer-events: none; border-color: var(--gold); color: var(--gold);">
                    <i class="fas fa-user"></i> <span class="btn-text">Hola, ${this.currentUser.firstName}</span>
                </button>
                <button class="admin-btn" onclick="app.handleLogout()" style="border-color: var(--danger); color: var(--danger);">
                    <i class="fas fa-sign-out-alt"></i> <span class="btn-text">Salir</span>
                </button>`;
        } else {
            container.innerHTML = `
                <button class="admin-btn" id="header-login-btn" onclick="app.openLoginTab()">
                    <i class="fas fa-sign-in-alt"></i> <span class="btn-text">Ingresar</span>
                </button>
                <button class="admin-btn" id="header-register-btn" onclick="app.openRegisterTab()">
                    <i class="fas fa-user-plus"></i> <span class="btn-text">Registrarse</span>
                </button>`;
        }
    }

    openLoginTab() {
        document.getElementById('login-modal').classList.remove('hidden');
        this.setAuthTab('login');
    }

    openRegisterTab() {
        document.getElementById('login-modal').classList.remove('hidden');
        this.setAuthTab('register');
    }

    setAdminTab(tab) {
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
            this.renderAdminDashboard();
        } else if (tab === 'products') {
            this.renderAdminInventory();
        } else if (tab === 'categories') {
            this.fetchMainCategories();
            this.fetchCategories();
        } else if (tab === 'orders') {
            this.fetchOrders();
        } else if (tab === 'trash') {
            this.fetchDeletedProducts();
            this.fetchDeletedOrders();
        }
    }

    // Admin Dashboard Render
    async renderAdminDashboard() {
        const makeupEl = document.getElementById('stat-makeup-count');
        const clothingEl = document.getElementById('stat-clothing-count');
        const alertEl = document.getElementById('stat-alert-count');
        const alertsList = document.getElementById('alerts-list');
        const alertsBg = document.getElementById('stat-alerts-bg');

        // Sales Elements
        const todaySalesEl = document.getElementById('stat-sales-today');
        const weekSalesEl = document.getElementById('stat-sales-week');
        const monthSalesEl = document.getElementById('stat-sales-month');
        const totalSalesEl = document.getElementById('stat-sales-total');

        if (!makeupEl) return;

        try {
            const statsRes = await fetch('/api/orders/stats');
            if (statsRes.ok) {
                const stats = await statsRes.json();
                
                makeupEl.innerText = stats.makeupCount;
                clothingEl.innerText = stats.clothingCount;
                alertEl.innerText = stats.criticalStockCount;
                
                if (todaySalesEl) todaySalesEl.innerText = this.formatPrice(stats.todayRevenue);
                if (weekSalesEl) weekSalesEl.innerText = this.formatPrice(stats.weekRevenue);
                if (monthSalesEl) monthSalesEl.innerText = this.formatPrice(stats.monthRevenue);
                if (totalSalesEl) totalSalesEl.innerText = this.formatPrice(stats.totalRevenue);
            }
        } catch (e) {
            console.error("Error al obtener estadísticas de ventas", e);
            // Fallback for inventory
            const makeupCount = this.products.filter(p => p.type === 'maquillaje').length;
            const clothingCount = this.products.filter(p => p.type === 'ropa').length;
            makeupEl.innerText = makeupCount;
            clothingEl.innerText = clothingCount;
        }

        try {
            // Get alerts list
            const res = await fetch('/api/products/alerts');
            const alerts = await res.json();
            
            if (alerts.length > 0) {
                alertsBg.className = "stat-icon alert-bg danger-alert";
                
                alertsList.innerHTML = '';
                alerts.forEach(alert => {
                    const isSevere = alert.stock <= 0;
                    const alertClass = isSevere ? '' : 'warning';
                    const badgeClass = isSevere ? '' : 'warning';
                    
                    const item = document.createElement('div');
                    item.className = `alert-item ${alertClass}`;
                    item.innerHTML = `
                        <div class="alert-item-info">
                            <h5>${alert.productName}</h5>
                            <p>${alert.detail} | Categoría: ${alert.category}</p>
                        </div>
                        <span class="alert-badge ${badgeClass}">${isSevere ? 'Agotado' : 'Bajo Stock'}</span>
                    `;
                    alertsList.appendChild(item);
                });
            } else {
                alertsBg.className = "stat-icon alert-bg";
                alertsList.innerHTML = `
                    <div class="no-alerts-placeholder">
                        <i class="fas fa-check-circle"></i>
                        <p>¡Todo en orden! No hay productos con bajo inventario.</p>
                    </div>`;
            }

        } catch (e) {
            console.error("Error al obtener alertas de inventario", e);
        }
    }

    // Admin Inventory List Table
    renderAdminInventory() {
        const tbody = document.getElementById('admin-products-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.products.forEach(p => {
            const mainImg = p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';
            
            let stockSummary = '';
            if (p.type === 'maquillaje') {
                stockSummary = `${p.generalStock} unds`;
            } else {
                // Sum all variation stocks
                const sum = p.variations ? p.variations.reduce((acc, curr) => acc + curr.stock, 0) : 0;
                stockSummary = `${sum} unds (${p.variations ? p.variations.length : 0} var)`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${mainImg}" alt="${p.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';"></td>
                <td><strong>${p.name}</strong></td>
                <td><span class="product-card-badge ${p.type}" style="position:static; padding: 2px 6px;">${p.category}</span></td>
                <td>${this.formatPrice(p.price)}</td>
                <td>${stockSummary}</td>
                <td>
                    <div class="admin-table-actions">
                        <button class="action-icon-btn edit" onclick="app.openProductModal('${p.id}')"><i class="fas fa-edit"></i></button>
                        <button class="action-icon-btn delete" onclick="app.handleDeleteProduct('${p.id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Admin Main Categories List
    renderMainCategoriesList() {
        const list = document.getElementById('admin-main-category-list');
        if (!list) return;

        list.innerHTML = '';

        if (!this.mainCategories || this.mainCategories.length === 0) {
            list.innerHTML = '<li style="padding: 20px; color: var(--gray-dark); text-align: center; list-style: none;">No hay categorías principales registradas.</li>';
            return;
        }

        this.mainCategories.forEach(m => {
            const li = document.createElement('li');
            li.className = 'category-list-item';
            const escapedName = (m.name || '').replace(/'/g, "\\'");
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="cat-item-name" style="font-weight: 700; color: var(--dark-neutral);">${m.name}</span>
                </div>
                <div class="cat-item-actions">
                    <button type="button" class="btn-edit-cat" onclick="app.startEditMainCategory('${m.id}', '${escapedName}')" title="Editar categoría principal ${escapedName}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button type="button" class="btn-delete-cat" onclick="app.handleDeleteMainCategory('${m.id}', '${escapedName}')" title="Eliminar categoría principal ${escapedName}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    populateParentCategorySelect() {
        const select = document.getElementById('category-parent');
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = '';

        const mains = this.getMainCategories();
        mains.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });

        if (currentVal && mains.includes(currentVal)) {
            select.value = currentVal;
        } else if (mains.length > 0) {
            select.value = mains[0];
        }
    }

    // Admin Categories Tab
    renderCategoriesList() {
        const catList = document.getElementById('admin-category-list');
        if (!catList) return;

        catList.innerHTML = '';

        if (!this.categories || this.categories.length === 0) {
            catList.innerHTML = '<li style="padding: 20px; color: var(--gray-dark); text-align: center; list-style: none;">No hay categorías registradas en el sistema.</li>';
            return;
        }

        this.categories.forEach(c => {
            const li = document.createElement('li');
            li.className = 'category-list-item';
            const escapedName = (c.name || '').replace(/'/g, "\\'");
            const escapedParent = (c.parentCategory || 'Maquillaje').replace(/'/g, "\\'");
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="cat-item-name">${c.name}</span>
                    <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(212,175,55,0.12); color: var(--dark-neutral); font-weight: 600; border: 1px solid rgba(212,175,55,0.3);">${c.parentCategory || 'Maquillaje'}</span>
                </div>
                <div class="cat-item-actions">
                    <button type="button" class="btn-edit-cat" onclick="app.startEditCategory('${c.id}', '${escapedName}', '${escapedParent}')" title="Editar categoría ${escapedName}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button type="button" class="btn-delete-cat" onclick="app.handleDeleteCategory('${c.id}', '${escapedName}')" title="Eliminar categoría ${escapedName}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            `;
            catList.appendChild(li);
        });
    }

    populateCategorySelect() {
        const select = document.getElementById('form-product-category');
        if (!select) return;

        select.innerHTML = '';
        const cats = this.categories && this.categories.length > 0 
            ? this.categories 
            : [
                { id: '1', name: 'Maquillaje' }, 
                { id: '2', name: 'Ropa' }, 
                { id: '3', name: 'Vestidos' }, 
                { id: '4', name: 'Labiales' }, 
                { id: '5', name: 'Cuidado Facial' }, 
                { id: '6', name: 'Accesorios' }
              ];

        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.innerText = c.name;
            select.appendChild(opt);
        });
    }

    // Product Create / Edit Modal logic
    openProductModal(productId = null) {
        try {
            const form = document.getElementById('product-form');
            if (form) form.reset();
            
            this.formUploadedImages = [];
            const previews = document.getElementById('image-previews-container');
            if (previews) previews.innerHTML = '';
            const varList = document.getElementById('form-variations-list');
            if (varList) varList.innerHTML = '';

            this.populateCategorySelect();

            if (productId) {
                // Edit mode
                const p = this.products.find(prod => prod.id === productId);
                if (p) {
                    const title = document.getElementById('product-form-title');
                    if (title) title.innerText = 'Editar Producto';
                    const idEl = document.getElementById('form-product-id');
                    if (idEl) idEl.value = p.id;
                    const nameEl = document.getElementById('form-product-name');
                    if (nameEl) nameEl.value = p.name || '';
                    const priceEl = document.getElementById('form-product-price');
                    if (priceEl) priceEl.value = p.price || '';
                    const descEl = document.getElementById('form-product-description');
                    if (descEl) descEl.value = p.description || '';
                    const typeEl = document.getElementById('form-product-type');
                    if (typeEl) typeEl.value = p.type || 'maquillaje';
                    const catEl = document.getElementById('form-product-category');
                    if (catEl) catEl.value = p.category || '';

                    // Load images
                    if (p.images) {
                        this.formUploadedImages = [...p.images];
                        this.renderFormImagePreviews();
                    }

                    // Handle type sections
                    this.handleProductTypeChange();

                    if (p.type === 'maquillaje') {
                        const stockEl = document.getElementById('form-product-stock');
                        if (stockEl) stockEl.value = p.generalStock || 0;
                    } else if (p.variations) {
                        p.variations.forEach(v => {
                            this.addVariationRow(v.size, v.color, v.stock);
                        });
                    }
                }
            } else {
                // Add mode
                const title = document.getElementById('product-form-title');
                if (title) title.innerText = 'Agregar Nuevo Producto';
                const idEl = document.getElementById('form-product-id');
                if (idEl) idEl.value = '';
                
                // Set defaults
                const typeEl = document.getElementById('form-product-type');
                if (typeEl) typeEl.value = 'maquillaje';
                this.handleProductTypeChange();
                const stockEl = document.getElementById('form-product-stock');
                if (stockEl) stockEl.value = 10;
            }
        } catch (e) {
            console.error("Error al abrir modal de producto:", e);
        }

        const modal = document.getElementById('product-form-modal');
        if (modal) modal.classList.remove('hidden');
    }

    closeProductModal() {
        document.getElementById('product-form-modal').classList.add('hidden');
    }

    handleProductTypeChange() {
        const type = document.getElementById('form-product-type').value;
        const makeupStock = document.getElementById('makeup-stock-container');
        const clothingVars = document.getElementById('clothing-variations-container');

        if (type === 'maquillaje') {
            makeupStock.classList.remove('hidden');
            clothingVars.classList.add('hidden');
        } else {
            makeupStock.classList.add('hidden');
            clothingVars.classList.remove('hidden');
            
            // Ensure at least one variation row is present if empty
            const list = document.getElementById('form-variations-list');
            if (list.children.length === 0) {
                this.addVariationRow('M', 'Negro', 10);
            }
        }
    }

    // Variations Manager
    addVariationRow(size = '', color = '', stock = 5) {
        const container = document.getElementById('form-variations-list');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'variation-row';
        row.innerHTML = `
            <input type="text" placeholder="Talla (e.g. S, M)" value="${size}" class="var-size" required>
            <input type="text" placeholder="Color (e.g. Negro, Dorado)" value="${color}" class="var-color" required>
            <input type="number" placeholder="Cantidad" value="${stock}" class="var-stock" min="0" required>
            <button type="button" class="remove-variation-btn" onclick="this.parentElement.remove()"><i class="fas fa-trash-alt"></i></button>
        `;
        container.appendChild(row);
    }

    // Image Uploads on Admin Form
    async handleImageSelection(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        try {
            const res = await fetch('/api/products/upload-images', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                this.formUploadedImages.push(...data.urls);
                this.renderFormImagePreviews();
            } else {
                alert('No se pudieron cargar algunas imágenes.');
            }
        } catch (e) {
            console.error(e);
            alert('Error de red al subir imágenes.');
        }

        // Clear files input
        event.target.value = '';
    }

    renderFormImagePreviews() {
        const container = document.getElementById('image-previews-container');
        if (!container) return;

        container.innerHTML = '';
        this.formUploadedImages.forEach((url, idx) => {
            const thumb = document.createElement('div');
            thumb.className = 'preview-thumb';
            thumb.innerHTML = `
                <img src="${url}">
                <button type="button" class="remove-img-btn" onclick="app.removeFormImage(${idx})"><i class="fas fa-times"></i></button>
            `;
            container.appendChild(thumb);
        });
    }

    removeFormImage(index) {
        this.formUploadedImages.splice(index, 1);
        this.renderFormImagePreviews();
    }

    // CRUD Product Save
    async handleSaveProduct(event) {
        event.preventDefault();

        const id = document.getElementById('form-product-id').value;
        const name = document.getElementById('form-product-name').value;
        const price = parseFloat(document.getElementById('form-product-price').value);
        const description = document.getElementById('form-product-description').value;
        const type = document.getElementById('form-product-type').value;
        const category = document.getElementById('form-product-category').value;

        // Construct object
        let productObj = {
            id: id ? id : null,
            name: name,
            price: price,
            description: description,
            type: type,
            category: category,
            images: this.formUploadedImages
        };

        if (type === 'maquillaje') {
            productObj.generalStock = parseInt(document.getElementById('form-product-stock').value) || 0;
            productObj.variations = [];
        } else {
            productObj.generalStock = 0;
            // Parse variations list
            const variationRows = document.querySelectorAll('.variation-row');
            const variations = [];
            variationRows.forEach(row => {
                const sz = row.querySelector('.var-size').value;
                const col = row.querySelector('.var-color').value;
                const st = parseInt(row.querySelector('.var-stock').value) || 0;
                if (sz && col) {
                    variations.add ? variations.push({ size: sz, color: col, stock: st }) : variations.push({ size: sz, color: col, stock: st });
                }
            });
            productObj.variations = variations;
        }

        if (!productObj.images || productObj.images.length === 0) {
            productObj.images = type === 'ropa'
                ? ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop']
                : ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop'];
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Guardar Producto';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }

        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productObj)
            });

            if (res.ok) {
                this.closeProductModal();
                await this.fetchProducts();
                alert('¡Producto guardado exitosamente!');
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'Error al guardar el producto.');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión al guardar el producto.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        }
    }

    async handleDeleteProduct(productId) {
        if (!confirm('¿Deseas mover este producto a la papelera? Podrás restaurarlo o eliminarlo definitivamente en cualquier momento.')) return;

        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await this.fetchProducts();
                alert('¡Producto movido a la papelera con éxito!');
            } else if (res.status === 401) {
                alert('Tu sesión de administrador ha expirado tras el reinicio del servidor. Por favor, vuelve a iniciar sesión con tu usuario y contraseña.');
                this.openLoginTab();
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'No se pudo eliminar el producto.');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión al eliminar el producto.');
        }
    }

    // Main Categories (Departments) CRUD actions
    startEditMainCategory(id, name) {
        const idInput = document.getElementById('main-category-id');
        const nameInput = document.getElementById('main-category-name');
        const formTitle = document.getElementById('main-category-form-title');
        const submitBtn = document.getElementById('main-category-submit-btn');
        const cancelBtn = document.getElementById('main-category-cancel-btn');

        if (idInput) idInput.value = id;
        if (nameInput) {
            nameInput.value = name;
            nameInput.focus();
        }
        if (formTitle) formTitle.textContent = 'Editar Categoría Principal';
        if (submitBtn) submitBtn.textContent = 'Guardar Cambios';
        if (cancelBtn) cancelBtn.classList.remove('hidden');
    }

    cancelEditMainCategory() {
        const idInput = document.getElementById('main-category-id');
        const nameInput = document.getElementById('main-category-name');
        const formTitle = document.getElementById('main-category-form-title');
        const submitBtn = document.getElementById('main-category-submit-btn');
        const cancelBtn = document.getElementById('main-category-cancel-btn');

        if (idInput) idInput.value = '';
        if (nameInput) nameInput.value = '';
        if (formTitle) formTitle.textContent = 'Nueva Categoría Principal';
        if (submitBtn) submitBtn.textContent = 'Crear Categoría Principal';
        if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    async handleSaveMainCategory(event) {
        event.preventDefault();
        const idInput = document.getElementById('main-category-id');
        const nameInput = document.getElementById('main-category-name');
        if (!nameInput) return;

        const mainId = idInput ? idInput.value.trim() : '';
        const name = nameInput.value.trim();
        if (!name) return;

        const isEditing = !!mainId;
        const submitBtn = document.getElementById('main-category-submit-btn');
        const originalText = submitBtn ? submitBtn.innerHTML : (isEditing ? 'Guardar Cambios' : 'Crear Categoría Principal');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEditing ? 'Guardando...' : 'Creando...'}`;
        }

        try {
            const url = isEditing ? `/api/main-categories/${mainId}` : '/api/main-categories';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            });

            if (res.ok) {
                this.cancelEditMainCategory();
                await this.fetchMainCategories();
                await this.fetchCategories();
                await this.fetchProducts();
                alert(isEditing ? `Categoría principal actualizada a "${name}".` : `Categoría principal "${name}" creada exitosamente.`);
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || `Error al ${isEditing ? 'actualizar' : 'crear'} la categoría principal.`);
            }
        } catch (e) {
            console.error(`Error al guardar categoría principal:`, e);
            alert(`Error de conexión.`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async handleDeleteMainCategory(mainId, mainName = '') {
        const msg = mainName ? `¿Deseas eliminar la categoría principal "${mainName}"? (Las subcategorías asociadas mantendrán sus nombres)` : '¿Deseas eliminar esta categoría principal?';
        if (!confirm(msg)) return;

        try {
            const res = await fetch(`/api/main-categories/${mainId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await this.fetchMainCategories();
                await this.fetchCategories();
                await this.fetchProducts();
                alert('Categoría principal eliminada exitosamente.');
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'No se pudo eliminar la categoría principal.');
            }
        } catch (e) {
            console.error("Error al eliminar categoría principal:", e);
            alert('Error de conexión.');
        }
    }

    // Categories CRUD actions
    startEditCategory(catId, catName, catParent = 'Maquillaje') {
        const idInput = document.getElementById('category-id');
        const nameInput = document.getElementById('category-name');
        const parentInput = document.getElementById('category-parent');
        const formTitle = document.getElementById('category-form-title');
        const submitBtn = document.getElementById('category-submit-btn');
        const cancelBtn = document.getElementById('category-cancel-btn');

        if (idInput) idInput.value = catId;
        if (nameInput) {
            nameInput.value = catName;
            nameInput.focus();
        }
        if (parentInput) parentInput.value = catParent || 'Maquillaje';
        if (formTitle) formTitle.textContent = 'Editar Categoría';
        if (submitBtn) submitBtn.textContent = 'Guardar Cambios';
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        // Scroll to form smoothly on mobile
        const formCard = document.querySelector('.category-form-card');
        if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
    }

    cancelEditCategory() {
        const idInput = document.getElementById('category-id');
        const nameInput = document.getElementById('category-name');
        const parentInput = document.getElementById('category-parent');
        const formTitle = document.getElementById('category-form-title');
        const submitBtn = document.getElementById('category-submit-btn');
        const cancelBtn = document.getElementById('category-cancel-btn');

        if (idInput) idInput.value = '';
        if (nameInput) nameInput.value = '';
        if (parentInput) parentInput.value = 'Maquillaje';
        if (formTitle) formTitle.textContent = 'Nueva Categoría';
        if (submitBtn) submitBtn.textContent = 'Crear Categoría';
        if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    async handleSaveCategory(event) {
        event.preventDefault();
        const idInput = document.getElementById('category-id');
        const nameInput = document.getElementById('category-name');
        const parentInput = document.getElementById('category-parent');
        if (!nameInput) return;

        const catId = idInput ? idInput.value.trim() : '';
        const name = nameInput.value.trim();
        const parentCategory = parentInput ? parentInput.value.trim() : 'Maquillaje';
        if (!name) return;

        const isEditing = !!catId;
        const submitBtn = document.getElementById('category-submit-btn');
        const originalText = submitBtn ? submitBtn.innerHTML : (isEditing ? 'Guardar Cambios' : 'Crear Categoría');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEditing ? 'Guardando...' : 'Creando...'}`;
        }

        try {
            const url = isEditing ? `/api/categories/${catId}` : '/api/categories';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, parentCategory: parentCategory || 'Maquillaje' })
            });

            if (res.ok) {
                this.cancelEditCategory();
                await this.fetchCategories();
                await this.fetchProducts(); // Refresh products in case category name changed
                alert(isEditing ? `Categoría actualizada exitosamente a "${name}".` : `Categoría "${name}" creada exitosamente.`);
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || `Error al ${isEditing ? 'actualizar' : 'crear'} la categoría.`);
            }
        } catch (e) {
            console.error(`Error al ${isEditing ? 'actualizar' : 'crear'} categoría:`, e);
            alert(`Error de conexión al ${isEditing ? 'actualizar' : 'crear'} categoría.`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async handleDeleteCategory(catId, catName = '') {
        const msg = catName ? `¿Deseas eliminar la categoría "${catName}"?` : '¿Deseas eliminar esta categoría?';
        if (!confirm(msg)) return;

        try {
            const res = await fetch(`/api/categories/${catId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await this.fetchCategories();
                alert('Categoría eliminada exitosamente.');
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'No se pudo eliminar la categoría.');
            }
        } catch (e) {
            console.error("Error al eliminar categoría:", e);
            alert('Error de conexión al eliminar categoría.');
        }
    }

    // Formatter helpers
    formatPrice(amount) {
        return '$' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(amount);
    }

    // Orders management methods
    async fetchOrders() {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                this.orders = await res.json();
                this.renderAdminOrders();
            } else {
                console.error("Error al obtener pedidos");
            }
        } catch (e) {
            console.error(e);
        }
    }

    renderAdminOrders() {
        const tbody = document.getElementById('admin-orders-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--gray-dark); padding: 30px;">
                        No se han registrado pedidos en el sistema.
                    </td>
                </tr>`;
            return;
        }

        this.orders.forEach(order => {
            // Build items list
            let itemsHtml = '<ul class="order-items-list">';
            order.items.forEach(item => {
                const detail = item.type === 'ropa' ? ` (Talla: ${item.size} | Color: ${item.color})` : '';
                itemsHtml += `<li>${item.name}${detail} <strong>x${item.quantity}</strong> - ${this.formatPrice(item.price * item.quantity)}</li>`;
            });
            itemsHtml += '</ul>';

            // Status badge classes
            const statusClass = order.status.toLowerCase();
            const dateStr = new Date(order.createdAt).toLocaleString('es-CO');

            // Action button logic: only show checkmark/confirm payment if PENDIENTE
            let actionHtml = '';
            if (order.status === 'PENDIENTE') {
                actionHtml += `
                    <button class="action-icon-btn edit" title="Confirmar Pago" onclick="app.confirmOrderPayment('${order.id}')">
                        <i class="fas fa-check-circle" style="color: var(--success); font-size: 16px;"></i> Marcar Pago
                    </button>`;
            }
            actionHtml += `
                <button class="action-icon-btn edit" title="Mandar Recibo por WhatsApp" onclick="app.sendWaPaymentReceipt('${order.id}')" style="border-color: #25d366; color: #25d366;">
                    <i class="fab fa-whatsapp"></i> Mandar Recibo
                </button>`;
            actionHtml += `
                <button class="action-icon-btn edit" title="Imprimir Recibo PDF" onclick="app.printOrderInvoice('${order.id}')" style="border-color: var(--gold); color: var(--gold);">
                    <i class="fas fa-print"></i> Recibo PDF
                </button>`;
            actionHtml += `
                <button class="action-icon-btn delete" title="Mover a Papelera" onclick="app.deleteOrder('${order.id}')">
                    <i class="fas fa-trash-alt"></i>
                </button>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${order.orderNumber}</strong></td>
                <td><strong>${order.customerName}</strong></td>
                <td>${dateStr}</td>
                <td>${itemsHtml}</td>
                <td><strong style="color: var(--gold);">${this.formatPrice(order.total)}</strong></td>
                <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                <td>
                    <div class="admin-table-actions">
                        ${actionHtml}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async confirmOrderPayment(orderId) {
        if (!confirm('¿Confirmar que la compra ha sido realizada y pagada? Esto restará las cantidades correspondientes del inventario.')) return;

        try {
            const res = await fetch(`/api/orders/${orderId}/complete`, {
                method: 'POST'
            });

            if (res.ok) {
                alert('Pago confirmado e inventario descontado con éxito.');
                await this.fetchProducts(); // Refresh products to update stocks in UI
                await this.fetchOrders();    // Refresh orders list
                await this.renderAdminDashboard(); // Refresh dashboard alerts/counts
            } else {
                const errData = await res.json();
                alert(errData.error || 'Error al confirmar el pago.');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión.');
        }
    }

    async deleteOrder(orderId) {
        if (!confirm('¿Estás seguro de que deseas mover este pedido a la papelera?')) return;

        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Pedido movido a la papelera.');
                await this.fetchOrders();
                await this.renderAdminDashboard();
            } else {
                alert('Error al eliminar el pedido.');
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Trash / soft delete management methods
    setTrashSubTab(tab) {
        this.trashSubTab = tab;
        const prodBtn = document.getElementById('trash-tab-products-btn');
        const ordersBtn = document.getElementById('trash-tab-orders-btn');
        const prodSec = document.getElementById('trash-products-section');
        const ordersSec = document.getElementById('trash-orders-section');

        if (tab === 'products') {
            if (prodBtn) prodBtn.className = 'gold-btn btn-sm';
            if (ordersBtn) ordersBtn.className = 'outline-btn btn-sm';
            if (prodSec) prodSec.classList.remove('hidden');
            if (ordersSec) ordersSec.classList.add('hidden');
            this.fetchDeletedProducts();
        } else {
            if (prodBtn) prodBtn.className = 'outline-btn btn-sm';
            if (ordersBtn) ordersBtn.className = 'gold-btn btn-sm';
            if (prodSec) prodSec.classList.add('hidden');
            if (ordersSec) ordersSec.classList.remove('hidden');
            this.fetchDeletedOrders();
        }
    }

    async fetchDeletedProducts() {
        try {
            const res = await fetch('/api/products/deleted');
            if (res.ok) {
                this.deletedProducts = await res.json();
                this.renderAdminTrashProducts();
            } else {
                console.error("Error al obtener productos eliminados");
            }
        } catch (e) {
            console.error(e);
        }
    }

    renderAdminTrashProducts() {
        const tbody = document.getElementById('admin-trash-products-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!this.deletedProducts || this.deletedProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--gray-dark); padding: 30px;">
                        No hay productos en la papelera.
                    </td>
                </tr>`;
            return;
        }

        this.deletedProducts.forEach(p => {
            const mainImg = p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${mainImg}" alt="${p.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';" style="width: 45px; height: 45px; border-radius: 6px; object-fit: cover;"></td>
                <td><strong>${p.name}</strong></td>
                <td><span class="product-card-badge ${p.type}" style="position:static; padding: 2px 6px;">${p.category || p.type}</span></td>
                <td>${this.formatPrice(p.price)}</td>
                <td>
                    <div class="admin-table-actions">
                        <button class="action-icon-btn edit" title="Restaurar Producto" onclick="app.restoreProduct('${p.id}')">
                            <i class="fas fa-trash-restore-alt" style="color: var(--success); font-size: 14px;"></i> Restaurar
                        </button>
                        <button class="action-icon-btn delete" title="Eliminar Definitivamente" onclick="app.permanentlyDeleteProduct('${p.id}')">
                            <i class="fas fa-times-circle" style="color: var(--danger); font-size: 14px;"></i> Purgar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async restoreProduct(productId) {
        try {
            const res = await fetch(`/api/products/${productId}/restore`, {
                method: 'POST'
            });

            if (res.ok) {
                alert('¡Producto restaurado exitosamente al inventario!');
                await this.fetchProducts();
                await this.fetchDeletedProducts();
                await this.renderAdminDashboard();
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'Error al restaurar el producto.');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión al restaurar el producto.');
        }
    }

    async permanentlyDeleteProduct(productId) {
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente este producto de la base de datos? Esta acción no se puede deshacer.')) return;

        try {
            const res = await fetch(`/api/products/${productId}/permanent`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Producto eliminado definitivamente.');
                await this.fetchDeletedProducts();
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'Error al eliminar definitivamente.');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión.');
        }
    }

    async fetchDeletedOrders() {
        try {
            const res = await fetch('/api/orders/deleted');
            if (res.ok) {
                this.deletedOrders = await res.json();
                this.renderAdminTrashOrders();
            } else {
                console.error("Error al obtener pedidos eliminados");
            }
        } catch (e) {
            console.error(e);
        }
    }

    renderAdminTrashOrders() {
        const tbody = document.getElementById('admin-trash-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!this.deletedOrders || this.deletedOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--gray-dark); padding: 30px;">
                        No hay pedidos en la papelera.
                    </td>
                </tr>`;
            return;
        }

        this.deletedOrders.forEach(order => {
            let itemsHtml = '<ul class="order-items-list">';
            order.items.forEach(item => {
                const detail = item.type === 'ropa' ? ` (Talla: ${item.size} | Color: ${item.color})` : '';
                itemsHtml += `<li>${item.name}${detail} <strong>x${item.quantity}</strong> - ${this.formatPrice(item.price * item.quantity)}</li>`;
            });
            itemsHtml += '</ul>';

            const dateStr = new Date(order.createdAt).toLocaleString('es-CO');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${order.orderNumber}</strong></td>
                <td><strong>${order.customerName}</strong></td>
                <td>${dateStr}</td>
                <td>${itemsHtml}</td>
                <td><strong style="color: var(--gold);">${this.formatPrice(order.total)}</strong></td>
                <td>
                    <div class="admin-table-actions">
                        <button class="action-icon-btn edit" title="Restaurar Pedido" onclick="app.restoreOrder('${order.id}')">
                            <i class="fas fa-trash-restore-alt" style="color: var(--success); font-size: 14px;"></i> Restaurar
                        </button>
                        <button class="action-icon-btn delete" title="Eliminar Permanentemente" onclick="app.permanentlyDeleteOrder('${order.id}')">
                            <i class="fas fa-times-circle" style="color: var(--danger); font-size: 14px;"></i> Purgar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async restoreOrder(orderId) {
        try {
            const res = await fetch(`/api/orders/${orderId}/restore`, {
                method: 'POST'
            });

            if (res.ok) {
                alert('Pedido restaurado con éxito.');
                await this.fetchOrders();
                await this.fetchDeletedOrders();
                await this.renderAdminDashboard();
            } else {
                alert('Error al restaurar el pedido.');
            }
        } catch (e) {
            console.error(e);
        }
    }

    async permanentlyDeleteOrder(orderId) {
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente este pedido de la base de datos? Esta acción no se puede deshacer.')) return;

        try {
            const res = await fetch(`/api/orders/${orderId}/permanent`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Pedido purgado permanentemente.');
                await this.fetchDeletedOrders();
                await this.renderAdminDashboard();
            } else {
                alert('Error al eliminar permanentemente.');
            }
        } catch (e) {
            console.error(e);
        }
    }

    goHome() {
        const searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.value = '';
        this.searchQuery = '';
        this.filterMainCategory('todos');
    }

    generateReceiptPDF(order, total, date, time) {
        const printWindow = window.open('', '_blank');
        
        let itemsRows = '';
        order.items.forEach(item => {
            const detail = item.type === 'ropa' ? `Talla: ${item.size} | Color: ${item.color}` : 'Maquillaje';
            itemsRows += `
                <tr>
                    <td>${item.name}</td>
                    <td>${detail}</td>
                    <td>${item.quantity}</td>
                    <td>${this.formatPrice(item.price)}</td>
                    <td class="text-right">${this.formatPrice(item.price * item.quantity)}</td>
                </tr>`;
        });

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Pedido J&N #${order.orderNumber}</title>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Montserrat', sans-serif;
                    background-color: #fffafb;
                    color: #1a1a1a;
                    margin: 0;
                    padding: 40px;
                    display: flex;
                    justify-content: center;
                }
                .invoice-card {
                    background-color: #ffffff;
                    width: 100%;
                    max-width: 650px;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    border: 1px solid rgba(224, 155, 169, 0.3);
                    padding: 40px;
                    box-sizing: border-box;
                    position: relative;
                }
                .invoice-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 6px;
                    background: linear-gradient(90deg, #e09ba9 0%, #d4af37 100%);
                    border-radius: 16px 16px 0 0;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .logo {
                    font-family: 'Playfair Display', serif;
                    font-size: 38px;
                    font-weight: 700;
                    color: #1a1a1a;
                    letter-spacing: 2px;
                    margin: 0;
                }

                .subtitle {
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #d4af37;
                    letter-spacing: 4px;
                    margin-top: 5px;
                    font-weight: 600;
                }
                .title-receipt {
                    text-align: center;
                    font-family: 'Playfair Display', serif;
                    font-size: 20px;
                    color: #e09ba9;
                    margin-top: 15px;
                    margin-bottom: 25px;
                    font-style: italic;
                }
                .details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 30px;
                    font-size: 13px;
                    border-bottom: 1px solid #f1f1f1;
                    padding-bottom: 20px;
                }
                .detail-item {
                    line-height: 1.6;
                }
                .detail-item strong {
                    color: #e09ba9;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                    margin-bottom: 30px;
                }
                .items-table th {
                    border-bottom: 2px solid #e09ba9;
                    padding: 10px 5px;
                    text-align: left;
                    color: #777;
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 11px;
                }
                .items-table td {
                    border-bottom: 1px solid #f1f1f1;
                    padding: 12px 5px;
                    vertical-align: middle;
                }
                .text-right {
                    text-align: right;
                }
                .total-row {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    margin-top: 20px;
                    margin-bottom: 35px;
                    border-top: 2px solid #f1f1f1;
                    padding-top: 15px;
                }
                .total-label {
                    font-size: 14px;
                    font-weight: 600;
                    margin-right: 15px;
                }
                .total-amount {
                    font-family: 'Playfair Display', serif;
                    font-size: 26px;
                    font-weight: 700;
                    color: #d4af37;
                }
                .footer {
                    text-align: center;
                    border-top: 1px solid #f9d5e3;
                    padding-top: 25px;
                    margin-top: 20px;
                }
                .footer p {
                    margin: 5px 0;
                    font-size: 11px;
                    line-height: 1.6;
                }
                .footer .highlight {
                    font-weight: 600;
                    color: #e09ba9;
                    font-size: 12px;
                }
                .footer .shop-name {
                    font-family: 'Playfair Display', serif;
                    font-size: 14px;
                    color: #d4af37;
                    margin-top: 10px;
                    font-weight: 600;
                }
                @media print {
                    body {
                        background-color: #ffffff;
                        padding: 0;
                    }
                    .invoice-card {
                        box-shadow: none;
                        border: none;
                        padding: 20px;
                        max-width: 100%;
                    }
                    .invoice-card::before {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-card">
                <div class="header">
                    <h1 class="logo">J&amp;N</h1>
                    <div class="subtitle">Maquillaje & Moda</div>
                </div>
                
                <div class="title-receipt">¡Gracias por tu Compra!</div>
                
                <div class="details-grid">
                    <div class="detail-item">
                        <strong>Cliente:</strong> ${order.customerName}<br>
                        <strong>N° Pedido:</strong> #${order.orderNumber}
                    </div>
                    <div class="detail-item text-right">
                        <strong>Fecha:</strong> ${date}<br>
                        <strong>Hora:</strong> ${time}
                    </div>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Variación</th>
                            <th>Cant.</th>
                            <th>Precio Unit.</th>
                            <th class="text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
                
                <div class="total-row">
                    <span class="total-label">Total a pagar:</span>
                    <span class="total-amount">${this.formatPrice(total)}</span>
                </div>
                
                <div class="footer">
                    <p class="highlight">💕 GRACIAS POR CONFIAR EN NOSOTROS 💕</p>
                    <p class="highlight">✨ GRACIAS POR ELEGIRNOS COMO TU TIENDA FAVORITA ✨</p>
                    <p class="shop-name">CON AGRADECIMIENTO J&N!! ❤️</p>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>`;

        printWindow.document.write(html);
        printWindow.document.close();
    }

    openSuccessWaLink() {
        if (this.pendingWaUrl) {
            window.open(this.pendingWaUrl, '_blank');
        }
    }

    openSuccessPdf() {
        if (this.pendingPdfArgs) {
            this.generateReceiptPDF(
                this.pendingPdfArgs.order,
                this.pendingPdfArgs.total,
                this.pendingPdfArgs.date,
                this.pendingPdfArgs.time
            );
        }
    }

    closeSuccessModal() {
        const modal = document.getElementById('success-modal');
        if (modal) modal.classList.add('hidden');
    }

    printOrderInvoice(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const dateObj = new Date(order.createdAt);
        const dateStr = dateObj.toLocaleDateString('es-CO');
        const timeStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

        this.generateReceiptPDF(order, order.total, dateStr, timeStr);
    }

    sendWaPaymentReceipt(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const dateObj = new Date(order.createdAt);
        const dateStr = dateObj.toLocaleDateString('es-CO');
        const timeStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

        const receiptUrl = `${window.location.origin}/api/orders/receipt/${order.id}`;

        const eReceipt = String.fromCodePoint(0x1F9FE);
        const eCheck = String.fromCodePoint(0x2705);
        const ePackage = String.fromCodePoint(0x1F4E6);
        const eUser = String.fromCodePoint(0x1F464);
        const eCalendar = String.fromCodePoint(0x1F4C5);
        const eBag = String.fromCodePoint(0x1F6CD, 0xFE0F);
        const eMoney = String.fromCodePoint(0x1F4B0);
        const eTruck = String.fromCodePoint(0x1F69A);
        const eDoc = String.fromCodePoint(0x1F4C4);
        const eHeart = String.fromCodePoint(0x1F496);
        const eSparkles = String.fromCodePoint(0x2728);

        let receiptText = `${eReceipt} *RECIBO DE PAGO J&N*\n\n`;
        receiptText += `${eCheck} *¡Hola! Hemos verificado tu pago de forma exitosa.*\n\n`;
        receiptText += `${ePackage} *N.° de Pedido:* #${order.orderNumber}\n`;
        receiptText += `${eUser} *Cliente:* ${order.customerName}\n`;
        receiptText += `${eCalendar} *Fecha de Pago:* ${dateStr} - ${timeStr}\n\n`;

        receiptText += `${eBag} *DETALLE DE COMPRA*\n`;
        order.items.forEach(item => {
            const detail = item.type === 'ropa' ? ` (Talla: ${item.size} | Color: ${item.color})` : '';
            receiptText += `• *${item.name}* x${item.quantity}${detail} — ${this.formatPrice(item.price * item.quantity)}\n`;
        });

        receiptText += `\n${eMoney} *TOTAL PAGADO: ${this.formatPrice(order.total)}*\n\n`;
        receiptText += `${eTruck} *TU PEDIDO YA ESTÁ SIENDO PREPARADO*\n\n`;
        receiptText += `${eDoc} *Descarga tu recibo en PDF:*\n${receiptUrl}\n\n`;
        receiptText += `${eHeart} *Gracias por confiar en J&N.*\n`;
        receiptText += `${eSparkles} *Gracias por elegirnos como tu tienda favorita.*`;

        // Strip non-digits from phone number
        const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
        const waUrl = `https://api.whatsapp.com/send?phone=57${cleanPhone}&text=${encodeURIComponent(receiptText)}`;
        window.open(waUrl, '_blank');
    }
}

// Global hook
const app = new JNStore();
document.addEventListener('DOMContentLoaded', () => app.init());
