/**
 * J&N Store - Reusable Real Pagination Component
 * Robust instance registry & event delegation without fragile inline onclicks.
 */
class Pagination {
    static instances = new Map();

    constructor(options = {}) {
        this.containerId = options.containerId || 'pagination-container';
        this.pageSize = options.pageSize || 15;
        this.pageSizeOptions = options.pageSizeOptions || [15, 30, 50];
        this.currentPage = 1;
        this.items = [];
        this.totalElements = 0;
        this.totalPages = 1;
        this.isServerSide = options.isServerSide || false;
        this.onPageChange = options.onPageChange || (() => {});
        this.onServerPageChange = options.onServerPageChange || options.onPageChange || (() => {});
        this.id = 'pg_' + Math.random().toString(36).substring(2, 9);

        Pagination.instances.set(this.id, this);
    }

    setServerPage(pageData) {
        this.isServerSide = true;
        this.currentPage = (pageData.page !== undefined ? pageData.page : 0) + 1;
        this.pageSize = pageData.size || this.pageSize;
        this.totalElements = pageData.totalElements || 0;
        this.totalPages = Math.max(1, pageData.totalPages || Math.ceil(this.totalElements / this.pageSize));
        this.render();
    }

    setItems(items) {
        this.isServerSide = false;
        this.items = items || [];
        this.totalElements = this.items.length;
        this.totalPages = this.getTotalPages();
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }
        return this.getCurrentPageItems();
    }

    getTotalPages() {
        if (this.isServerSide) return Math.max(1, this.totalPages);
        return Math.max(1, Math.ceil((this.items ? this.items.length : 0) / this.pageSize));
    }

    getCurrentPageItems() {
        if (!this.items || this.items.length === 0) return [];
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.items.slice(start, end);
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        const targetPage = Number(page);
        if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) return;
        this.currentPage = targetPage;
        
        if (this.isServerSide) {
            this.onServerPageChange(this.currentPage - 1, this.pageSize);
        } else {
            const pageItems = this.getCurrentPageItems();
            this.render();
            this.onPageChange(pageItems, this.currentPage, totalPages);
        }
    }

    changePageSize(newSize) {
        const size = Number(newSize);
        if (isNaN(size) || size <= 0) return;
        this.pageSize = size;
        this.currentPage = 1;

        if (this.isServerSide) {
            this.onServerPageChange(0, this.pageSize);
        } else {
            const pageItems = this.getCurrentPageItems();
            this.render();
            this.onPageChange(pageItems, this.currentPage, this.getTotalPages());
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const totalItems = this.isServerSide ? this.totalElements : (this.items ? this.items.length : 0);
        const totalPages = this.getTotalPages();

        if (totalItems === 0) {
            container.innerHTML = '';
            return;
        }

        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, totalItems);

        // Build Page Numbers to display (sliding window with ellipsis)
        let pageNumbersHtml = '';
        const maxVisibleButtons = 5;
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

        if (endPage - startPage < maxVisibleButtons - 1) {
            startPage = Math.max(1, endPage - maxVisibleButtons + 1);
        }

        if (startPage > 1) {
            pageNumbersHtml += `<button class="pagination-btn" data-pg-action="page" data-page="1" type="button">1</button>`;
            if (startPage > 2) {
                pageNumbersHtml += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage ? 'active' : '';
            pageNumbersHtml += `<button class="pagination-btn ${isActive}" data-pg-action="page" data-page="${i}" type="button">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbersHtml += `<span class="pagination-ellipsis">...</span>`;
            }
            pageNumbersHtml += `<button class="pagination-btn" data-pg-action="page" data-page="${totalPages}" type="button">${totalPages}</button>`;
        }

        // Size selector HTML
        const sizeOptionsHtml = this.pageSizeOptions
            .map(opt => `<option value="${opt}" ${opt === this.pageSize ? 'selected' : ''}>${opt} por pág.</option>`)
            .join('');

        container.innerHTML = `
            <div class="pagination-wrapper" data-pagination-id="${this.id}">
                <div class="pagination-info">
                    Mostrando <strong>${start} - ${end}</strong> de <strong>${totalItems}</strong> registros
                </div>
                
                <div class="pagination-controls">
                    <button class="pagination-btn" data-pg-action="page" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''} title="Anterior" type="button">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    ${pageNumbersHtml}
                    <button class="pagination-btn" data-pg-action="page" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''} title="Siguiente" type="button">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div class="pagination-size-selector">
                    <select class="pagination-size-select" data-pg-action="size" aria-label="Registros por página">
                        ${sizeOptionsHtml}
                    </select>
                </div>
            </div>
        `;

        // Attach direct scoped event listener on the rendered pagination wrapper
        const wrapper = container.querySelector(`[data-pagination-id="${this.id}"]`);
        if (wrapper) {
            wrapper.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-pg-action="page"]');
                if (btn && !btn.disabled) {
                    const page = parseInt(btn.getAttribute('data-page'), 10);
                    if (!isNaN(page)) {
                        this.goToPage(page);
                    }
                }
            });

            const select = wrapper.querySelector('select[data-pg-action="size"]');
            if (select) {
                select.addEventListener('change', (e) => {
                    this.changePageSize(e.target.value);
                });
            }
        }
    }
}

window.Pagination = Pagination;

