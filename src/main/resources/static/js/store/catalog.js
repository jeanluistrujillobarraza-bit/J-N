/**
 * J&N Store - Catalog & Products Module
 * Handles loading, department/subcategory filtering, live search, and detail modal.
 */
class CatalogModule {
    constructor(store) {
        this.store = store;
        this.allProducts = [];
        this.mainCategories = [];
        this.categories = [];
        
        this.activeMainCategory = 'todos';
        this.activeCategory = 'todos';
        this.searchQuery = '';
        this.isPillsExpanded = false;

        // Detail Modal State
        this.selectedDetailProduct = null;
        this.selectedSize = '';
        this.selectedColor = '';
        this.selectedDetailImageIndex = 0;
    }

    async init() {
        await Promise.all([
            this.fetchMainCategories(),
            this.fetchCategories()
        ]);
        await this.fetchProducts();
    }

    async fetchMainCategories() {
        try {
            this.mainCategories = await api.get('/api/main-categories') || [];
            this.renderDepartmentNav();
        } catch (e) {
            this.mainCategories = [{ name: 'Maquillaje' }, { name: 'Ropa' }];
            this.renderDepartmentNav();
        }
    }

    async fetchCategories() {
        try {
            this.categories = await api.get('/api/categories') || [];
            this.renderSubcategoryPills();
        } catch (e) {
            this.categories = [];
        }
    }

    async fetchProducts() {
        this.renderProductsSkeleton();

        try {
            const data = await api.get('/api/products');
            if (Array.isArray(data)) {
                this.allProducts = data;
            } else if (data && Array.isArray(data.content)) {
                this.allProducts = data.content;
            } else {
                this.allProducts = [];
            }
            this.applyFiltersAndRender();
        } catch (e) {
            console.error('[Catalog] Error al obtener productos:', e);
            this.allProducts = [];
            this.applyFiltersAndRender();
        }
    }

    renderDepartmentNav() {
        const navContainer = document.getElementById('nav-departments');
        const mobileNavContainer = document.getElementById('mobile-nav-departments');

        let html = `
            <button class="nav-dept-btn ${this.activeMainCategory.toLowerCase() === 'todos' ? 'active' : ''}" 
                    onclick="app.filterMainCategory('todos')">
                <i class="fas fa-th-large"></i> Todos
            </button>
        `;

        let mobileHtml = `
            <button class="mobile-nav-item ${this.activeMainCategory.toLowerCase() === 'todos' ? 'active' : ''}" 
                    onclick="app.filterMainCategory('todos'); app.closeMobileMenu();">
                <span><i class="fas fa-th-large"></i> Todos los Departamentos</span>
                <i class="fas fa-chevron-right" style="font-size: 11px; opacity: 0.5;"></i>
            </button>
        `;

        this.mainCategories.forEach(m => {
            const isActive = this.activeMainCategory.toLowerCase() === (m.name || '').toLowerCase();
            let icon = 'fa-tag';
            const nameLower = (m.name || '').toLowerCase();
            if (nameLower.includes('maquillaj')) icon = 'fa-palette';
            else if (nameLower.includes('ropa')) icon = 'fa-tshirt';
            else if (nameLower.includes('accesori')) icon = 'fa-gem';
            else if (nameLower.includes('perfum')) icon = 'fa-spray-can';
            else if (nameLower.includes('zapat')) icon = 'fa-shoe-prints';

            html += `
                <button class="nav-dept-btn ${isActive ? 'active' : ''}" 
                        onclick="app.filterMainCategory('${Utils.escapeHtml(m.name)}')">
                    <i class="fas ${icon}"></i> ${m.name}
                </button>
            `;

            mobileHtml += `
                <button class="mobile-nav-item ${isActive ? 'active' : ''}" 
                        onclick="app.filterMainCategory('${Utils.escapeHtml(m.name)}'); app.closeMobileMenu();">
                    <span><i class="fas ${icon}"></i> ${m.name}</span>
                    <i class="fas fa-chevron-right" style="font-size: 11px; opacity: 0.5;"></i>
                </button>
            `;
        });

        if (navContainer) navContainer.innerHTML = html;
        if (mobileNavContainer) mobileNavContainer.innerHTML = mobileHtml;
    }

    renderSubcategoryPills() {
        const filterPills = document.getElementById('filter-pills');
        const mobileFilterPills = document.getElementById('mobile-filter-pills');

        let availableSubs = this.categories;
        if (this.activeMainCategory && this.activeMainCategory.toLowerCase() !== 'todos') {
            const mainLower = this.activeMainCategory.toLowerCase();
            availableSubs = this.categories.filter(c => (c.parentCategory || 'Maquillaje').toLowerCase() === mainLower);
        }

        const isCurrentSubActive = (name) => this.activeCategory.toLowerCase() === (name || '').toLowerCase();

        const maxVisible = 7;
        const visiblePills = availableSubs.slice(0, maxVisible);
        const morePills = availableSubs.slice(maxVisible);
        const hasMore = morePills.length > 0;

        let mainRowHtml = `<div class="filter-pills-row">`;
        mainRowHtml += `
            <button type="button" class="pill ${this.activeCategory === 'todos' ? 'active' : ''}" 
                    onclick="app.filterSubCategory('todos')">Todas las Subcategorías</button>
        `;

        visiblePills.forEach(c => {
            const isActive = isCurrentSubActive(c.name);
            mainRowHtml += `
                <button type="button" class="pill ${isActive ? 'active' : ''}" 
                        onclick="app.filterSubCategory('${Utils.escapeHtml(c.name)}')">${c.name}</button>
            `;
        });

        if (hasMore) {
            const toggleText = this.isPillsExpanded ? 'Menos' : `+${morePills.length} más`;
            const toggleIcon = this.isPillsExpanded ? 'fa-chevron-up' : 'fa-chevron-down';
            mainRowHtml += `
                <button type="button" class="pill pill-toggle-more" onclick="app.togglePillsExpanded(event)">
                    ${toggleText} <i class="fas ${toggleIcon}" style="font-size: 10px; margin-left: 4px;"></i>
                </button>
            `;
        }
        mainRowHtml += `</div>`;

        let moreRowHtml = '';
        if (hasMore) {
            moreRowHtml = `<div class="filter-pills-more-row ${this.isPillsExpanded ? 'show' : ''}">`;
            morePills.forEach(c => {
                const isActive = isCurrentSubActive(c.name);
                moreRowHtml += `
                    <button type="button" class="pill ${isActive ? 'active' : ''}" 
                            onclick="app.filterSubCategory('${Utils.escapeHtml(c.name)}')">${c.name}</button>
                `;
            });
            moreRowHtml += `</div>`;
        }

        if (filterPills) filterPills.innerHTML = mainRowHtml + moreRowHtml;

        // Mobile drawer subcategory list
        if (mobileFilterPills) {
            let mobSubHtml = `
                <button class="mobile-nav-item ${this.activeCategory === 'todos' ? 'active' : ''}" 
                        onclick="app.filterSubCategory('todos'); app.closeMobileMenu();">
                    <span>Todas las Subcategorías</span>
                    <i class="fas fa-check" style="${this.activeCategory === 'todos' ? '' : 'display:none;'}"></i>
                </button>
            `;

            availableSubs.forEach(c => {
                const isActive = isCurrentSubActive(c.name);
                mobSubHtml += `
                    <button class="mobile-nav-item ${isActive ? 'active' : ''}" 
                            onclick="app.filterSubCategory('${Utils.escapeHtml(c.name)}'); app.closeMobileMenu();">
                        <span>${c.name}</span>
                        <i class="fas fa-check" style="${isActive ? '' : 'display:none;'}"></i>
                    </button>
                `;
            });

            mobileFilterPills.innerHTML = mobSubHtml;
        }
    }

    filterMainCategory(main) {
        this.activeMainCategory = main || 'todos';
        this.activeCategory = 'todos';
        this.renderDepartmentNav();
        this.renderSubcategoryPills();
        this.applyFiltersAndRender();
    }

    filterSubCategory(sub) {
        this.activeCategory = sub || 'todos';
        this.renderSubcategoryPills();
        this.applyFiltersAndRender();
    }

    setSearchQuery(q) {
        this.searchQuery = q || '';
        this.applyFiltersAndRender();
    }

    togglePillsExpanded(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.isPillsExpanded = !this.isPillsExpanded;
        this.renderSubcategoryPills();
    }

    applyFiltersAndRender() {
        if (!this.allProducts || this.allProducts.length === 0) {
            this.filteredProducts = [];
            this.renderProductCards([]);
            this.updateCatalogCounter(0);
            return;
        }

        const hasMain = this.activeMainCategory && this.activeMainCategory.toLowerCase() !== 'todos';
        const hasSub = this.activeCategory && this.activeCategory.toLowerCase() !== 'todos';
        const q = (this.searchQuery || '').trim().toLowerCase();

        let matchingSubCatNames = [];
        if (hasMain) {
            const mainLower = this.activeMainCategory.toLowerCase();
            matchingSubCatNames = this.categories
                .filter(c => (c.parentCategory || 'Maquillaje').toLowerCase() === mainLower || (c.name || '').toLowerCase() === mainLower)
                .map(c => (c.name || '').toLowerCase());
            matchingSubCatNames.push(mainLower);
        }

        this.filteredProducts = this.allProducts.filter(p => {
            const pCat = (p.category || '').toLowerCase();
            const pType = (p.type || '').toLowerCase();

            // Subcategory filter
            if (hasSub) {
                const subLower = this.activeCategory.toLowerCase();
                if (pCat !== subLower && pType !== subLower) return false;
            }

            // Department filter
            if (hasMain && !hasSub) {
                const mainLower = this.activeMainCategory.toLowerCase();
                const matchesMain = pType === mainLower || matchingSubCatNames.includes(pCat) || pCat === mainLower;
                if (!matchesMain) return false;
            }

            // Search query
            if (q) {
                const nameMatch = (p.name || '').toLowerCase().includes(q);
                const descMatch = (p.description || '').toLowerCase().includes(q);
                const catMatch = pCat.includes(q) || pType.includes(q);
                if (!nameMatch && !descMatch && !catMatch) return false;
            }

            return true;
        });

        this.updateCatalogCounter(this.filteredProducts.length, this.allProducts.length);
        this.renderProductCards(this.filteredProducts);
    }

    updateCatalogCounter(filteredCount, totalCount = filteredCount) {
        const container = document.getElementById('catalog-pagination-container');
        if (!container) return;

        if (totalCount === 0) {
            container.innerHTML = '';
            return;
        }

        let label = `Mostrando <strong>${filteredCount}</strong> productos`;
        if (filteredCount !== totalCount) {
            label = `Mostrando <strong>${filteredCount}</strong> de <strong>${totalCount}</strong> productos encontrados`;
        }

        container.innerHTML = `
            <div class="catalog-summary-bar">
                <div class="catalog-count-badge">
                    <i class="fas fa-boxes" style="color: var(--accent-pink);"></i>
                    <span>${label}</span>
                </div>
            </div>
        `;
    }

    renderProductCards(items) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        if (!items || items.length === 0) {
            grid.innerHTML = `
                <div class="empty-cart-message" style="grid-column: 1/-1;">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron productos con los filtros seleccionados.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = items.map(p => {
            const mainImg = (p.images && p.images.length > 0 && p.images[0])
                ? p.images[0]
                : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';
            
            const isOutOfStock = p.type === 'maquillaje' 
                ? (p.generalStock || 0) <= 0 
                : (!p.variations || p.variations.every(v => (v.stock || 0) <= 0));

            let stockHtml = '';
            if (p.type === 'maquillaje') {
                stockHtml = isOutOfStock
                    ? `<span class="product-card-stock out-of-stock">Agotado</span>`
                    : `<span class="product-card-stock"><i class="fas fa-check-circle" style="color:var(--success); font-size:11px;"></i> Quedan: ${p.generalStock || 0} unds</span>`;
            } else {
                const totalStock = p.variations ? p.variations.reduce((acc, c) => acc + (c.stock || 0), 0) : 0;
                stockHtml = totalStock <= 0
                    ? `<span class="product-card-stock out-of-stock">Agotado</span>`
                    : `<span class="product-card-stock"><i class="fas fa-check-circle" style="color:var(--success); font-size:11px;"></i> Quedan: ${totalStock} unds</span>`;
            }

            return `
                <div class="product-card">
                    <span class="product-card-badge ${p.type || 'general'}">${p.category || p.type || 'General'}</span>
                    <div class="product-card-image" onclick="app.openProductDetails('${p.id}')">
                        <img src="${mainImg}" alt="${Utils.escapeHtml(p.name)}" loading="lazy" decoding="async"
                             onerror="if(!this.dataset.failed){this.dataset.failed='true';this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';}">
                        <div class="quick-view-overlay">
                            <span><i class="fas fa-eye"></i> Ver Detalles</span>
                        </div>
                    </div>
                    <div class="product-card-info">
                        <span class="product-card-category">${p.category || 'General'}</span>
                        <h4 class="product-card-title">${Utils.escapeHtml(p.name)}</h4>
                        <span class="product-card-price">${Utils.formatPrice(p.price || 0)}</span>
                        ${stockHtml}
                        <div class="product-card-actions">
                            <button class="add-to-cart-btn" onclick="app.quickAddToCart('${p.id}')" ${isOutOfStock ? 'disabled' : ''}>
                                <i class="fas fa-shopping-bag"></i> ${isOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderProductsSkeleton() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;
        let skeletonHtml = '';
        for (let i = 0; i < 8; i++) {
            skeletonHtml += `
                <div class="product-card skeleton" style="height: 360px;"></div>
            `;
        }
        grid.innerHTML = skeletonHtml;
    }

    // Detail Modal
    async openProductDetails(id) {
        let prod = this.allProducts.find(p => p.id === id);
        try {
            const fullProd = await api.get(`/api/products/${id}`);
            if (fullProd && fullProd.id) {
                prod = fullProd;
            }
        } catch (e) {}

        if (!prod) return;

        this.selectedDetailProduct = prod;
        this.selectedSize = '';
        this.selectedColor = '';
        this.selectedDetailImageIndex = 0;

        const modal = document.getElementById('product-detail-modal');
        if (!modal) return;

        // Populate detail fields
        const titleEl = document.getElementById('detail-product-name');
        const catEl = document.getElementById('detail-product-category');
        const priceEl = document.getElementById('detail-product-price');
        const descEl = document.getElementById('detail-product-description');
        const mainImg = document.getElementById('detail-main-img');
        const thumbsContainer = document.getElementById('detail-thumbnails');
        const variationsContainer = document.getElementById('detail-variations-container');
        const qtyInput = document.getElementById('detail-quantity');

        if (titleEl) titleEl.innerText = prod.name;
        if (catEl) catEl.innerText = `${prod.category} | ${prod.type.toUpperCase()}`;
        if (priceEl) priceEl.innerText = Utils.formatPrice(prod.price);
        if (descEl) descEl.innerText = prod.description || 'Sin descripción detallada disponible.';
        if (qtyInput) qtyInput.value = 1;

        const defaultFallback = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';
        const imgs = prod.images && prod.images.length > 0 ? prod.images : [defaultFallback];
        
        if (mainImg) {
            mainImg.src = imgs[0];
            mainImg.onerror = () => { mainImg.src = defaultFallback; };
        }

        if (thumbsContainer) {
            thumbsContainer.innerHTML = imgs.map((img, idx) => `
                <img src="${img}" class="thumbnail-img ${idx === 0 ? 'active' : ''}" 
                     onclick="app.selectDetailImage(${idx})"
                     onerror="this.src='${defaultFallback}'"
                     alt="Miniatura">
            `).join('');
        }

        // Variations for clothing
        if (variationsContainer) {
            if (prod.type === 'ropa' && prod.variations && prod.variations.length > 0) {
                const sizes = [...new Set(prod.variations.map(v => v.size).filter(Boolean))];
                const colors = [...new Set(prod.variations.map(v => v.color).filter(Boolean))];
                this.selectedSize = sizes[0] || '';
                this.selectedColor = colors[0] || '';

                variationsContainer.innerHTML = `
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 6px;">Seleccionar Talla:</label>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${sizes.map(s => `
                                <button type="button" class="pill ${s === this.selectedSize ? 'active' : ''}" 
                                        onclick="app.selectDetailSize('${s}')">${s}</button>
                            `).join('')}
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 6px;">Seleccionar Color:</label>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${colors.map(c => `
                                <button type="button" class="pill ${c === this.selectedColor ? 'active' : ''}" 
                                        onclick="app.selectDetailColor('${c}')">${c}</button>
                            `).join('')}
                        </div>
                    </div>
                `;
                variationsContainer.classList.remove('hidden');
            } else {
                variationsContainer.innerHTML = '';
                variationsContainer.classList.add('hidden');
            }
        }

        modal.classList.remove('hidden');
    }

    closeProductDetails() {
        const modal = document.getElementById('product-detail-modal');
        if (modal) modal.classList.add('hidden');
        this.selectedDetailProduct = null;
    }

    selectDetailImage(idx) {
        if (!this.selectedDetailProduct || !this.selectedDetailProduct.images) return;
        const mainImg = document.getElementById('detail-main-img');
        const thumbs = document.querySelectorAll('#detail-thumbnails .thumbnail-img');
        if (mainImg && this.selectedDetailProduct.images[idx]) {
            mainImg.src = this.selectedDetailProduct.images[idx];
            thumbs.forEach((t, i) => {
                if (i === idx) t.classList.add('active');
                else t.classList.remove('active');
            });
        }
    }

    openImageLightbox() {
        const mainImg = document.getElementById('detail-main-img');
        const lightboxModal = document.getElementById('image-lightbox-modal');
        const lightboxImg = document.getElementById('lightbox-img');
        if (mainImg && lightboxModal && lightboxImg) {
            lightboxImg.src = mainImg.src;
            lightboxModal.classList.remove('hidden');
        }
    }

    closeImageLightbox() {
        const lightboxModal = document.getElementById('image-lightbox-modal');
        if (lightboxModal) lightboxModal.classList.add('hidden');
    }

    selectDetailSize(size) {
        this.selectedSize = size;
        if (this.selectedDetailProduct) this.openProductDetails(this.selectedDetailProduct.id);
    }

    selectDetailColor(color) {
        this.selectedColor = color;
        if (this.selectedDetailProduct) this.openProductDetails(this.selectedDetailProduct.id);
    }
}

window.CatalogModule = CatalogModule;
