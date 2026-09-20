/**
 * J&N Store - Centralized API Service
 * Handles HTTP requests, headers, credentials, error codes and toasts.
 */
class ApiService {
    constructor() {
        this.baseUrl = '';
    }

    async request(url, options = {}) {
        const config = {
            headers: {
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(`${this.baseUrl}${url}`, config);
            
            // Handle HTTP error statuses
            if (!response.ok) {
                let errorMsg = `Error (${response.status})`;
                try {
                    const errData = await response.json();
                    errorMsg = errData.error || errData.message || errorMsg;
                } catch (e) {
                    errorMsg = response.statusText || errorMsg;
                }

                if (response.status === 401) {
                    console.warn(`[API] 401 No autorizado en ${url}: ${errorMsg}`);
                } else if (response.status === 403) {
                    Utils.showToast('No tienes permisos para realizar esta acción.', 'danger');
                } else if (response.status === 404) {
                    console.warn(`[API] 404 No encontrado: ${url}`);
                } else if (response.status >= 500) {
                    Utils.showToast('Ocurrió un problema en el servidor. Intenta de nuevo.', 'danger');
                }

                const error = new Error(errorMsg);
                error.status = response.status;
                throw error;
            }

            // Return JSON if present, else plain text or boolean
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (err) {
            if (err.name === 'AbortError') {
                console.warn(`[API] Petición cancelada: ${url}`);
            } else if (!err.status) {
                console.error(`[API] Error de conexión: ${url}`, err);
            }
            throw err;
        }
    }

    get(url, options = {}) {
        return this.request(url, { method: 'GET', ...options });
    }

    post(url, body, options = {}) {
        return this.request(url, { method: 'POST', body, ...options });
    }

    put(url, body, options = {}) {
        return this.request(url, { method: 'PUT', body, ...options });
    }

    delete(url, options = {}) {
        return this.request(url, { method: 'DELETE', ...options });
    }

    upload(url, formData, options = {}) {
        return this.request(url, {
            method: 'POST',
            body: formData,
            headers: {}, // Let browser set multipart boundary
            ...options
        });
    }
}

window.api = new ApiService();
