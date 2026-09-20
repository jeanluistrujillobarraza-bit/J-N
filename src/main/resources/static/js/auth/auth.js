/**
 * J&N Store - Authentication Module
 * Manages Admin & Client Login, Registration, Session and UI state.
 */
class AuthModule {
    constructor(store) {
        this.store = store;
        this.isAdmin = false;
        this.isClient = false;
        this.currentUser = null;
    }

    async checkSession() {
        try {
            const data = await api.get('/api/auth/check');
            if (data && data.authenticated) {
                this.isAdmin = data.role === 'ADMIN';
                this.isClient = data.role === 'CLIENT';
                this.currentUser = {
                    username: data.username,
                    role: data.role,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone
                };
            } else {
                this.isAdmin = false;
                this.isClient = false;
                this.currentUser = null;
            }
        } catch (e) {
            this.isAdmin = false;
            this.isClient = false;
            this.currentUser = null;
        }
        this.updateAuthUI();
    }

    async login(username, password) {
        if (!username || !password) {
            Utils.showToast('Por favor ingresa usuario y contraseña.', 'warning');
            return false;
        }

        try {
            const res = await api.post('/api/auth/login', { username, password });
            this.isAdmin = res.role === 'ADMIN';
            this.isClient = res.role === 'CLIENT';
            this.currentUser = {
                username: res.username,
                role: res.role,
                firstName: res.firstName,
                lastName: res.lastName,
                phone: res.phone
            };

            Utils.showToast(`¡Bienvenido de nuevo, ${res.firstName || res.username}!`, 'success');
            this.closeAuthModal();
            this.updateAuthUI();

            if (this.isAdmin) {
                this.store.openAdminSection();
            } else {
                this.store.closeAdminSection();
            }
            return true;
        } catch (err) {
            Utils.showToast(err.message || 'Error al iniciar sesión.', 'danger');
            return false;
        }
    }

    async register(clientData) {
        if (!clientData.username || !clientData.password) {
            Utils.showToast('Usuario y contraseña son requeridos.', 'warning');
            return false;
        }

        try {
            await api.post('/api/auth/register', clientData);
            Utils.showToast('¡Registro exitoso! Ahora puedes iniciar sesión.', 'success');
            this.setAuthTab('login');
            return true;
        } catch (err) {
            Utils.showToast(err.message || 'Error al registrar usuario.', 'danger');
            return false;
        }
    }

    async logout() {
        try {
            await api.post('/api/auth/logout');
        } catch (e) {}

        this.isAdmin = false;
        this.isClient = false;
        this.currentUser = null;
        this.updateAuthUI();
        this.store.closeAdminSection();
        Utils.showToast('Sesión cerrada correctamente.', 'info');
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('header-login-btn');
        const registerBtn = document.getElementById('header-register-btn');
        const adminWorkspaceBtn = document.getElementById('header-admin-btn');
        const userGreetingBtn = document.getElementById('header-user-btn');

        if (this.isAdmin) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            if (adminWorkspaceBtn) adminWorkspaceBtn.classList.remove('hidden');
            if (userGreetingBtn) {
                userGreetingBtn.classList.remove('hidden');
                userGreetingBtn.innerHTML = `<i class="fas fa-user-shield"></i> Admin (${this.currentUser?.firstName || 'Jayner'})`;
            }
        } else if (this.isClient) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            if (adminWorkspaceBtn) adminWorkspaceBtn.classList.add('hidden');
            if (userGreetingBtn) {
                userGreetingBtn.classList.remove('hidden');
                userGreetingBtn.innerHTML = `<i class="fas fa-user"></i> ${this.currentUser?.firstName || this.currentUser?.username}`;
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (registerBtn) registerBtn.classList.remove('hidden');
            if (adminWorkspaceBtn) adminWorkspaceBtn.classList.add('hidden');
            if (userGreetingBtn) userGreetingBtn.classList.add('hidden');
        }
    }

    openAuthModal(tab = 'login') {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.setAuthTab(tab);
        }
    }

    closeAuthModal() {
        const modal = document.getElementById('login-modal');
        if (modal) modal.classList.add('hidden');
    }

    setAuthTab(tab) {
        const loginTab = document.getElementById('auth-tab-login');
        const registerTab = document.getElementById('auth-tab-register');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (tab === 'login') {
            if (loginTab) loginTab.classList.add('active');
            if (registerTab) registerTab.classList.remove('active');
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
        } else {
            if (loginTab) loginTab.classList.remove('active');
            if (registerTab) registerTab.classList.add('active');
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
        }
    }
}

window.AuthModule = AuthModule;
