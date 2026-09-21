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
        this.storageKey = 'jn_auth_remembered_v1';
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
                this.updateAuthUI();
                return;
            }
        } catch (e) {
            console.warn('[Auth] Error verificando sesión en servidor:', e);
        }

        // Si la sesión del servidor no está activa, intentar auto-login si el usuario eligió "Recordarme"
        const saved = this.getRememberedCredentials();
        if (saved && saved.username && saved.password) {
            const autoLoginOk = await this.silentAutoLogin(saved.username, saved.password);
            if (autoLoginOk) return;
        }

        this.isAdmin = false;
        this.isClient = false;
        this.currentUser = null;
        this.updateAuthUI();
    }

    getRememberedCredentials() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {}
        return null;
    }

    saveRememberedCredentials(username, password) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({ username, password }));
        } catch (e) {}
    }

    clearRememberedCredentials() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) {}
    }

    async silentAutoLogin(username, password) {
        try {
            const res = await api.post('/api/auth/login', { username: username.trim(), password: password });
            if (res && res.role) {
                this.isAdmin = res.role === 'ADMIN';
                this.isClient = res.role === 'CLIENT';
                this.currentUser = {
                    username: res.username,
                    role: res.role,
                    firstName: res.firstName,
                    lastName: res.lastName,
                    phone: res.phone
                };
                this.updateAuthUI();
                console.log(`>>> [Auth] Sesión recordada restaurada para: ${res.username}`);
                return true;
            }
        } catch (err) {
            console.warn('[Auth] No se pudo restaurar sesión guardada:', err.message);
            // Si la contraseña cambió o falló, limpiar almacenamiento
            this.clearRememberedCredentials();
        }
        return false;
    }

    async login(username, password, remember = true) {
        if (!username || !password) {
            Utils.showToast('Por favor ingresa usuario y contraseña.', 'warning');
            return false;
        }

        const cleanUsername = username.trim();

        try {
            const res = await api.post('/api/auth/login', { username: cleanUsername, password: password.trim() });
            this.isAdmin = res.role === 'ADMIN';
            this.isClient = res.role === 'CLIENT';
            this.currentUser = {
                username: res.username,
                role: res.role,
                firstName: res.firstName,
                lastName: res.lastName,
                phone: res.phone
            };

            if (remember) {
                this.saveRememberedCredentials(cleanUsername, password.trim());
            } else {
                this.clearRememberedCredentials();
            }

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
            await api.post('/api/auth/register', {
                ...clientData,
                username: clientData.username.trim()
            });
            Utils.showToast('¡Registro exitoso! Ahora puedes iniciar sesión.', 'success');
            this.setAuthTab('login');
            
            const userInp = document.getElementById('login-username');
            if (userInp) userInp.value = clientData.username.trim();
            return true;
        } catch (err) {
            Utils.showToast(err.message || 'Error al registrar usuario.', 'danger');
            return false;
        }
    }

    async logout() {
        this.clearRememberedCredentials();
        try {
            await api.post('/api/auth/logout');
        } catch (e) {}

        this.isAdmin = false;
        this.isClient = false;
        this.currentUser = null;
        this.updateAuthUI();
        
        Utils.showToast('Sesión cerrada correctamente. Redirigiendo...', 'info');
        
        // Redirigir siempre a la tienda principal al cerrar sesión
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }

    togglePasswordVisibility(inputId, btnEl) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const icon = btnEl ? btnEl.querySelector('i') : null;
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.className = 'fas fa-eye-slash';
            }
        } else {
            input.type = 'password';
            if (icon) {
                icon.className = 'fas fa-eye';
            }
        }
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

            // Pre-fill username and remember checkbox if saved
            const saved = this.getRememberedCredentials();
            const userInp = document.getElementById('login-username');
            const passInp = document.getElementById('login-password');
            const remChk = document.getElementById('login-remember-me');
            
            if (saved && saved.username) {
                if (userInp && !userInp.value) userInp.value = saved.username;
                if (passInp && !passInp.value && saved.password) passInp.value = saved.password;
                if (remChk) remChk.checked = true;
            }
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

