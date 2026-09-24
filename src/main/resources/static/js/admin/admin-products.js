/**
 * J&N Store - Admin Products Module
 * Manages product inventory table with pagination, search, creation/editing, image upload and trash.
 */
class AdminProductsModule {
    constructor(store) {
        this.store = store;
        this.searchQuery = '';
        this.selectedTypeFilter = 'todos';
        this.variationsList = [];
        this.allProducts = [];
        this.categories = [];
        this.mainCategories = [];

        // Real Server-Side Pagination for Admin Products (15 items per page default)
        this.pagination = new Pagination({
            containerId: 'admin-products-pagination-container',
            pageSize: 15,
            pageSizeOptions: [15, 30, 50],
            isServerSide: true,
            onServerPageChange: (page, size) => this.fetchProducts(page, size)
        });
    }

    async render() {
        await this.fetchCategories();
        this.populateTypeFilterSelect();
        this.populateCategorySelects();
        await this.fetchProducts(0, this.pagination.pageSize);
    }

    async fetchCategories() {
        try {
            const [subs, mains] = await Promise.all([
                api.get('/api/categories'),
                api.get('/api/main-categories')
            ]);
            this.categories = Array.isArray(subs) ? subs : [];
            this.mainCategories = Array.isArray(mains) ? mains : [];
        } catch (e) {
            this.categories = [];
            this.mainCategories = [];
        }
    }

    async fetchProducts(page = 0, size = this.pagination.pageSize) {
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('size', size);

            if (this.selectedTypeFilter && this.selectedTypeFilter.toLowerCase() !== 'todos') {
                params.append('type', this.selectedTypeFilter.toLowerCase());
            }
            if (this.searchQuery && this.searchQuery.trim()) {
                params.append('query', this.searchQuery.trim());
            }

            const data = await api.get(`/api/products?${params.toString()}`);

            if (data && Array.isArray(data.content)) {
                this.allProducts = data.content;
                this.pagination.setServerPage(data);
            } else if (Array.isArray(data)) {
                this.allProducts = data;
                this.pagination.setServerPage({
                    content: data,
                    page: page,
                    size: size,
                    totalElements: data.length,
                    totalPages: Math.max(1, Math.ceil(data.length / size))
                });
            } else {
                this.allProducts = [];
                this.pagination.setServerPage({
                    content: [],
                    page: 0,
                    size: size,
                    totalElements: 0,
                    totalPages: 1
                });
            }
            this.renderTableRows(this.allProducts);
        } catch (e) {
            console.error('[AdminProducts] Error al cargar productos:', e);
            this.allProducts = [];
            this.renderTableRows([]);
            this.pagination.setServerPage({
                content: [],
                page: 0,
                size: size,
                totalElements: 0,
                totalPages: 1
            });
        }
    }

    setSearch(q) {
        this.searchQuery = q || '';
        this.fetchProducts(0, this.pagination.pageSize);
    }

    setTypeFilter(type) {
        this.selectedTypeFilter = type || 'todos';
        this.fetchProducts(0, this.pagination.pageSize);
    }

    renderTableRows(items) {
        const tbody = document.getElementById('admin-products-table-body');
        if (!tbody) return;

        if (!items || items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px;">
                        <i class="fas fa-box-open" style="font-size: 28px; margin-bottom: 8px; display: block; color: var(--gold);"></i>
                        No se encontraron productos en el inventario.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(p => {
            const mainImg = (p.images && p.images.length > 0 && p.images[0])
                ? p.images[0]
                : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';

            let stockSummary = '';
            if (p.type === 'maquillaje') {
                stockSummary = `${p.generalStock || 0} unds`;
            } else {
                const sum = p.variations ? p.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0) : 0;
                stockSummary = `${sum} unds (${p.variations ? p.variations.length : 0} var)`;
            }

            return `
                <tr>
                    <td>
                        <img src="${mainImg}" alt="${Utils.escapeHtml(p.name)}" 
                             style="width: 42px; height: 42px; border-radius: 6px; object-fit: cover;"
                             onerror="if(!this.dataset.failed){this.dataset.failed='true';this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop';}">
                    </td>
                    <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
                    <td><span class="pill">${Utils.escapeHtml(p.category || p.type || 'General')}</span></td>
                    <td><strong>${Utils.formatPrice(p.price)}</strong></td>
                    <td>${stockSummary}</td>
                    <td>
                        <div class="admin-table-actions">
                            <button class="action-icon-btn edit" onclick="app.openProductModal('${p.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-icon-btn delete" onclick="app.deleteProductToTrash('${p.id}')" title="Mover a Papelera">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    populateTypeFilterSelect() {
        const filterSelect = document.getElementById('admin-type-filter');
        if (!filterSelect) return;

        const mainCats = this.mainCategories || [];
        const currentValue = this.selectedTypeFilter || 'todos';

        let html = `<option value="todos">Todos los Tipos</option>`;
        mainCats.forEach(m => {
            const val = (m.name || '').toLowerCase();
            html += `<option value="${Utils.escapeHtml(val)}" ${currentValue.toLowerCase() === val ? 'selected' : ''}>${Utils.escapeHtml(m.name)}</option>`;
        });

        filterSelect.innerHTML = html;
    }

    populateTypeModalSelect(selectedType = '') {
        const typeSelect = document.getElementById('prod-type');
        if (!typeSelect) return;

        const mainCats = this.mainCategories || [];
        if (mainCats.length === 0) {
            typeSelect.innerHTML = `<option value="general">General</option>`;
            return;
        }

        const currentVal = (selectedType || typeSelect.value || mainCats[0].name || '').toLowerCase();

        typeSelect.innerHTML = mainCats.map(m => {
            const val = (m.name || '').toLowerCase();
            const isSel = currentVal === val ? 'selected' : '';
            return `<option value="${Utils.escapeHtml(val)}" ${isSel}>${Utils.escapeHtml(m.name)}</option>`;
        }).join('');
    }

    populateCategorySelects() {
        const catSelect = document.getElementById('prod-category');
        if (!catSelect) return;

        const categories = this.categories || [];
        catSelect.innerHTML = `
            <option value="">Selecciona una subcategoría...</option>
            ${categories.map(c => `<option value="${Utils.escapeHtml(c.name)}">${Utils.escapeHtml(c.name)} (${Utils.escapeHtml(c.parentCategory || 'General')})</option>`).join('')}
        `;
    }

    async openProductModal(id = null) {
        const modal = document.getElementById('product-modal');
        if (!modal) return;

        const titleEl = document.getElementById('product-modal-title');
        const idInput = document.getElementById('prod-id');
        const nameInput = document.getElementById('prod-name');
        const descInput = document.getElementById('prod-desc');
        const priceInput = document.getElementById('prod-price');
        const typeSelect = document.getElementById('prod-type');
        const catSelect = document.getElementById('prod-category');
        const stockInput = document.getElementById('prod-stock');
        const imageInput = document.getElementById('prod-image-url');

        this.variationsList = [];
        this.populateCategorySelects();

        const defaultType = (this.mainCategories && this.mainCategories.length > 0)
            ? this.mainCategories[0].name.toLowerCase()
            : 'maquillaje';

        if (id) {
            let prod = this.allProducts.find(p => p.id === id);
            try {
                const fullProd = await api.get(`/api/products/${id}`);
                if (fullProd && fullProd.id) prod = fullProd;
            } catch (e) {}

            if (prod) {
                const targetType = (prod.type || defaultType).toLowerCase();
                this.populateTypeModalSelect(targetType);

                if (titleEl) titleEl.innerText = 'Editar Producto';
                if (idInput) idInput.value = prod.id;
                if (nameInput) nameInput.value = prod.name;
                if (descInput) descInput.value = prod.description || '';
                if (priceInput) priceInput.value = prod.price;
                if (typeSelect) typeSelect.value = targetType;
                if (catSelect) catSelect.value = prod.category || '';
                if (stockInput) stockInput.value = prod.generalStock || 0;
                
                const firstImg = (prod.images && prod.images.length > 0) ? prod.images[0] : '';
                if (imageInput) imageInput.value = firstImg;
                this.previewImageUrl(firstImg);

                this.variationsList = prod.variations ? JSON.parse(JSON.stringify(prod.variations)) : [];
            }
        } else {
            this.populateTypeModalSelect(defaultType);

            if (titleEl) titleEl.innerText = 'Nuevo Producto';
            if (idInput) idInput.value = '';
            if (nameInput) nameInput.value = '';
            if (descInput) descInput.value = '';
            if (priceInput) priceInput.value = '';
            if (typeSelect) typeSelect.value = defaultType;
            if (catSelect) catSelect.value = '';
            if (stockInput) stockInput.value = 10;
            if (imageInput) imageInput.value = '';
            this.previewImageUrl('');
        }

        this.toggleTypeFields();
        this.renderVariationsTable();
        modal.classList.remove('hidden');
    }

    previewImageUrl(url) {
        const previewImg = document.getElementById('image-preview-img');
        const previewBox = document.getElementById('image-preview');
        const placeholder = document.getElementById('image-preview-placeholder');

        if (!previewImg || !previewBox || !placeholder) return;

        const cleanUrl = (url || '').trim();
        if (cleanUrl) {
            // Loading feedback
            placeholder.style.display = 'block';
            placeholder.innerHTML = `<span style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando vista previa...</span>`;
            previewBox.style.display = 'none';

            previewImg.onload = () => {
                previewBox.style.display = 'flex';
                placeholder.style.display = 'none';
            };
            previewImg.onerror = () => {
                previewBox.style.display = 'none';
                placeholder.style.display = 'block';
                placeholder.innerHTML = `<span style="color:var(--danger); font-size:12px;"><i class="fas fa-exclamation-circle"></i> No se pudo cargar la imagen. Verifica que el enlace sea válido y directo (ej. PostImg).</span>`;
            };
            previewImg.src = cleanUrl;
        } else {
            previewBox.style.display = 'none';
            placeholder.style.display = 'block';
            placeholder.innerHTML = `
                <i class="fas fa-image" style="font-size: 24px; margin-bottom: 4px; display: block; opacity: 0.5;"></i>
                Vista previa de la imagen aparecerá aquí
            `;
        }
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) modal.classList.add('hidden');
    }

    toggleTypeFields() {
        const typeSelect = document.getElementById('prod-type');
        const makeupFields = document.getElementById('makeup-stock-fields');
        const clothingFields = document.getElementById('clothing-variations-fields');

        if (!typeSelect) return;
        const type = typeSelect.value;

        if (type === 'ropa') {
            if (makeupFields) makeupFields.classList.add('hidden');
            if (clothingFields) clothingFields.classList.remove('hidden');
        } else {
            if (makeupFields) makeupFields.classList.remove('hidden');
            if (clothingFields) clothingFields.classList.add('hidden');
        }
    }

    addVariation() {
        const sizeInput = document.getElementById('new-var-size');
        const colorInput = document.getElementById('new-var-color');
        const stockInput = document.getElementById('new-var-stock');

        if (!sizeInput || !colorInput || !stockInput) return;

        const size = sizeInput.value.trim();
        const color = colorInput.value.trim();
        const stock = parseInt(stockInput.value) || 0;

        if (!size || !color) {
            Utils.showToast('Ingresa talla y color para la variación.', 'warning');
            return;
        }

        this.variationsList.push({ size, color, stock });
        sizeInput.value = '';
        colorInput.value = '';
        stockInput.value = '5';
        this.renderVariationsTable();
    }

    removeVariation(idx) {
        this.variationsList.splice(idx, 1);
        this.renderVariationsTable();
    }

    renderVariationsTable() {
        const tbody = document.getElementById('variations-table-body');
        if (!tbody) return;

        if (this.variationsList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:10px;">Sin variaciones añadidas.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.variationsList.map((v, idx) => `
            <tr>
                <td><strong>${Utils.escapeHtml(v.size)}</strong></td>
                <td>${Utils.escapeHtml(v.color)}</td>
                <td>${v.stock}</td>
                <td>
                    <button type="button" class="action-icon-btn delete" onclick="app.removeProductVariation(${idx})">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async saveProduct(formElement) {
        const id = document.getElementById('prod-id').value;
        const name = document.getElementById('prod-name').value.trim();
        const description = document.getElementById('prod-desc').value.trim();
        const price = parseFloat(document.getElementById('prod-price').value) || 0;
        const type = document.getElementById('prod-type').value;
        const category = document.getElementById('prod-category').value || 'General';
        const generalStock = parseInt(document.getElementById('prod-stock').value) || 0;
        const imageUrl = (document.getElementById('prod-image-url')?.value || '').trim();

        if (!name || price <= 0) {
            Utils.showToast('Ingresa un nombre y precio válido.', 'warning');
            return;
        }

        const images = imageUrl ? [imageUrl] : [];

        const payload = {
            id: id || null,
            name,
            description,
            price,
            type,
            category,
            generalStock,
            images,
            variations: type === 'ropa' ? this.variationsList : [],
            deleted: false
        };

        try {
            await api.post('/api/products', payload);
            Utils.showToast(id ? 'Producto actualizado con éxito.' : 'Producto creado con éxito.', 'success');
            this.closeProductModal();
            await this.render();
            if (this.store && this.store.catalog) {
                this.store.catalog.applyFiltersAndRender();
            }
        } catch (err) {
            Utils.showToast('Error al guardar producto: ' + err.message, 'danger');
        }
    }

    async deleteProductToTrash(id) {
        if (!confirm('¿Estás seguro de mover este producto a la papelera?')) return;

        try {
            await api.delete(`/api/products/${id}`);
            Utils.showToast('Producto movido a la papelera.', 'info');
            await this.render();
            if (this.store && this.store.catalog) {
                this.store.catalog.applyFiltersAndRender();
            }
        } catch (err) {
            Utils.showToast('Error al eliminar producto: ' + err.message, 'danger');
        }
    }
}

window.AdminProductsModule = AdminProductsModule;
