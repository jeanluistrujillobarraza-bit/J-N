/**
 * J&N Store - Admin Categories Module
 * Manages Departments and Subcategories CRUD.
 */
class AdminCategoriesModule {
    constructor(store) {
        this.store = store;
        this.mainCategories = [];
        this.categories = [];
    }

    async render() {
        try {
            const [mainCats, subs] = await Promise.all([
                api.get('/api/main-categories').catch(() => []),
                api.get('/api/categories').catch(() => [])
            ]);
            this.mainCategories = Array.isArray(mainCats) ? mainCats : [];
            this.categories = Array.isArray(subs) ? subs : [];

            // Also keep catalog in sync if present
            if (this.store && this.store.catalog) {
                this.store.catalog.mainCategories = this.mainCategories;
                this.store.catalog.categories = this.categories;
            }
        } catch (e) {
            console.error('[AdminCategories] Error fetching data:', e);
        }

        this.renderMainCategoriesList();
        this.renderSubcategoriesList();
        this.populateParentCategorySelect();
    }

    renderMainCategoriesList() {
        const list = document.getElementById('admin-main-category-list');
        if (!list) return;

        const mainCats = this.mainCategories || [];
        if (mainCats.length === 0) {
            list.innerHTML = `<li style="color:var(--text-muted);">No hay departamentos creados.</li>`;
            return;
        }

        list.innerHTML = mainCats.map(m => `
            <li>
                <span><i class="fas fa-folder" style="color:var(--gold); margin-right:8px;"></i> <strong>${Utils.escapeHtml(m.name)}</strong></span>
                <button class="action-icon-btn delete" onclick="app.deleteMainCategory('${m.id}')" title="Eliminar Departamento">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </li>
        `).join('');
    }

    renderSubcategoriesList() {
        const list = document.getElementById('admin-sub-category-list');
        if (!list) return;

        const subs = this.categories || [];
        if (subs.length === 0) {
            list.innerHTML = `<li style="color:var(--text-muted);">No hay subcategorías creadas.</li>`;
            return;
        }

        list.innerHTML = subs.map(s => `
            <li>
                <div>
                    <strong>${Utils.escapeHtml(s.name)}</strong>
                    <span style="font-size:11px; color:var(--text-muted); display:block;">Dept: ${Utils.escapeHtml(s.parentCategory || 'Maquillaje')}</span>
                </div>
                <button class="action-icon-btn delete" onclick="app.deleteSubCategory('${s.id}')" title="Eliminar Subcategoría">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </li>
        `).join('');
    }

    populateParentCategorySelect() {
        const select = document.getElementById('new-subcategory-parent');
        if (!select) return;

        const mainCats = this.mainCategories || [];
        if (mainCats.length === 0) {
            select.innerHTML = `<option value="Maquillaje">Maquillaje (Por defecto)</option>`;
            return;
        }
        select.innerHTML = mainCats.map(m => `
            <option value="${Utils.escapeHtml(m.name)}">${Utils.escapeHtml(m.name)}</option>
        `).join('');
    }

    async addMainCategory() {
        const input = document.getElementById('new-main-category-name');
        if (!input) return;

        const name = input.value.trim();
        if (!name) {
            Utils.showToast('Ingresa el nombre del departamento.', 'warning');
            return;
        }

        try {
            await api.post('/api/main-categories', { name });
            Utils.showToast(`Departamento '${name}' creado.`, 'success');
            input.value = '';
            await this.render();
        } catch (err) {
            Utils.showToast('Error al crear departamento: ' + err.message, 'danger');
        }
    }

    async deleteMainCategory(id) {
        if (!confirm('¿Seguro que deseas eliminar este departamento?')) return;

        try {
            await api.delete(`/api/main-categories/${id}`);
            Utils.showToast('Departamento eliminado.', 'info');
            await this.render();
        } catch (err) {
            Utils.showToast('Error al eliminar: ' + err.message, 'danger');
        }
    }

    async addSubCategory() {
        const nameInput = document.getElementById('new-subcategory-name');
        const parentSelect = document.getElementById('new-subcategory-parent');

        if (!nameInput || !parentSelect) return;

        const name = nameInput.value.trim();
        const parentCategory = parentSelect.value;

        if (!name) {
            Utils.showToast('Ingresa el nombre de la subcategoría.', 'warning');
            return;
        }

        try {
            await api.post('/api/categories', { name, parentCategory });
            Utils.showToast(`Subcategoría '${name}' creada.`, 'success');
            nameInput.value = '';
            await this.render();
        } catch (err) {
            Utils.showToast('Error al crear subcategoría: ' + err.message, 'danger');
        }
    }

    async deleteSubCategory(id) {
        if (!confirm('¿Seguro que deseas eliminar esta subcategoría?')) return;

        try {
            await api.delete(`/api/categories/${id}`);
            Utils.showToast('Subcategoría eliminada.', 'info');
            await this.render();
        } catch (err) {
            Utils.showToast('Error al eliminar: ' + err.message, 'danger');
        }
    }
}

window.AdminCategoriesModule = AdminCategoriesModule;
