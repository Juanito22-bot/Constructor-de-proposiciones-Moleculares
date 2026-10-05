/**
 * AUTH.JS - Módulo de Autenticación, Perfiles y Persistencia (localStorage)
 * Gestiona registro de usuarios, login de usuarios regulares,
 * acceso de administrador (con contraseña maestra), sesiones y estadísticas.
 */

const AuthStorageKeys = {
    USERS: 'fbf_users_db',
    ADMIN_PASS: 'fbf_admin_password',
    CURRENT_SESSION: 'fbf_current_session',
    STATS: 'fbf_app_stats',
    CONFIG: 'fbf_app_config'
};

const DEFAULT_ADMIN_PASS = 'admin123';

const DEFAULT_APP_CONFIG = {
    title: 'Constructor de Proposiciones Moleculares',
    darkMode: true,
    examples: [
        '((p ∧ q) → ¬r)',
        '(p ∨ q) ↔ (r → s)',
        '¬(p ∧ q) ∨ r',
        '(p → (q → r)) ↔ ((p ∧ q) → r)',
        '¬(p ∨ ¬q) ∧ (r → s)'
    ]
};

const DEFAULT_STATS = {
    formulasBuilt: 0,
    connectivesCount: {
        '¬': 0,
        '∧': 0,
        '∨': 0,
        '→': 0,
        '↔': 0
    }
};

/**
 * Inicializa datos por defecto en localStorage si no existen
 */
function initAuthStorage() {
    if (typeof localStorage === 'undefined') return;

    // 1. Contraseña de administrador
    if (!localStorage.getItem(AuthStorageKeys.ADMIN_PASS)) {
        localStorage.setItem(AuthStorageKeys.ADMIN_PASS, DEFAULT_ADMIN_PASS);
    }

    // 2. Usuarios registrados
    if (!localStorage.getItem(AuthStorageKeys.USERS)) {
        // Usuario demo inicial
        const initialUsers = [
            {
                id: 'usr_demo_1',
                username: 'estudiante',
                password: 'password123',
                createdAt: new Date().toISOString(),
                formulasBuilt: 3
            }
        ];
        localStorage.setItem(AuthStorageKeys.USERS, JSON.stringify(initialUsers));
    }

    // 3. Configuración de la aplicación
    if (!localStorage.getItem(AuthStorageKeys.CONFIG)) {
        localStorage.setItem(AuthStorageKeys.CONFIG, JSON.stringify(DEFAULT_APP_CONFIG));
    }

    // 4. Estadísticas
    if (!localStorage.getItem(AuthStorageKeys.STATS)) {
        localStorage.setItem(AuthStorageKeys.STATS, JSON.stringify(DEFAULT_STATS));
    }
}

// Ejecutar inicialización inmediata
initAuthStorage();

/**
 * Obtiene la lista de usuarios registrados
 * @returns {Array<{id: string, username: string, password: string, createdAt: string, formulasBuilt: number}>}
 */
function getUsers() {
    try {
        const raw = localStorage.getItem(AuthStorageKeys.USERS);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Error al leer usuarios de localStorage', e);
        return [];
    }
}

/**
 * Guarda la lista de usuarios en localStorage
 * @param {Array} users
 */
function saveUsers(users) {
    try {
        localStorage.setItem(AuthStorageKeys.USERS, JSON.stringify(users));
    } catch (e) {
        console.error('Error al guardar usuarios en localStorage', e);
    }
}

/**
 * Registra un nuevo usuario en localStorage
 * @param {string} username
 * @param {string} password
 * @returns {{success: boolean, message: string, user?: object}}
 */
function registerUser(username, password) {
    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanUsername || cleanUsername.length < 3) {
        return { success: false, message: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    }

    if (!cleanPassword || cleanPassword.length < 4) {
        return { success: false, message: 'La contraseña debe tener al menos 4 caracteres.' };
    }

    if (cleanUsername.toLowerCase() === 'admin' || cleanUsername.toLowerCase() === 'administrador') {
        return { success: false, message: 'El nombre "admin" está reservado para el administrador.' };
    }

    const users = getUsers();
    const exists = users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());

    if (exists) {
        return { success: false, message: `El usuario "${cleanUsername}" ya se encuentra registrado.` };
    }

    const newUser = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        username: cleanUsername,
        password: cleanPassword,
        createdAt: new Date().toISOString(),
        formulasBuilt: 0
    };

    users.push(newUser);
    saveUsers(users);

    return {
        success: true,
        message: '¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.',
        user: newUser
    };
}

/**
 * Inicia sesión para un usuario regular
 * @param {string} username
 * @param {string} password
 * @returns {{success: boolean, message: string, session?: object}}
 */
function loginUser(username, password) {
    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanUsername || !cleanPassword) {
        return { success: false, message: 'Ingrese usuario y contraseña.' };
    }

    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());

    if (!user || user.password !== cleanPassword) {
        return { success: false, message: 'Nombre de usuario o contraseña incorrectos.' };
    }

    const session = {
        id: user.id,
        username: user.username,
        role: 'user',
        loginTime: new Date().toISOString()
    };

    setCurrentSession(session);

    return {
        success: true,
        message: `¡Bienvenido, ${user.username}!`,
        session
    };
}

/**
 * Inicia sesión como Administrador mediante contraseña maestra
 * @param {string} password
 * @returns {{success: boolean, message: string, session?: object}}
 */
function loginAdmin(password) {
    const cleanPassword = (password || '').trim();
    const adminPass = localStorage.getItem(AuthStorageKeys.ADMIN_PASS) || DEFAULT_ADMIN_PASS;

    if (cleanPassword !== adminPass) {
        return { success: false, message: 'Contraseña maestra de administrador incorrecta.' };
    }

    const session = {
        id: 'admin_root',
        username: 'Administrador',
        role: 'admin',
        loginTime: new Date().toISOString()
    };

    setCurrentSession(session);

    return {
        success: true,
        message: '¡Acceso concedido al Panel de Administrador!',
        session
    };
}

/**
 * Obtiene la sesión actualmente activa en localStorage
 * @returns {{username: string, role: string, loginTime: string}|null}
 */
function getCurrentSession() {
    try {
        const raw = localStorage.getItem(AuthStorageKeys.CURRENT_SESSION);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Establece la sesión activa
 * @param {object} session
 */
function setCurrentSession(session) {
    try {
        localStorage.setItem(AuthStorageKeys.CURRENT_SESSION, JSON.stringify(session));
    } catch (e) {
        console.error('Error al guardar sesión activa', e);
    }
}

/**
 * Cierra la sesión activa actual
 */
function logout() {
    try {
        localStorage.removeItem(AuthStorageKeys.CURRENT_SESSION);
    } catch (e) {
        console.error('Error al cerrar sesión', e);
    }
}

/**
 * Elimina un usuario por su ID (función de administrador)
 * @param {string} userId
 * @returns {boolean}
 */
function deleteUser(userId) {
    let users = getUsers();
    const initialLen = users.length;
    users = users.filter(u => u.id !== userId);
    if (users.length !== initialLen) {
        saveUsers(users);
        return true;
    }
    return false;
}

/**
 * Cambia la contraseña de un usuario (función de administrador o usuario)
 * @param {string} userId
 * @param {string} newPassword
 * @returns {boolean}
 */
function changeUserPassword(userId, newPassword) {
    if (!newPassword || newPassword.trim().length < 4) return false;
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.password = newPassword.trim();
        saveUsers(users);
        return true;
    }
    return false;
}

/**
 * Cambia la contraseña maestra de administrador
 * @param {string} newPassword
 * @returns {boolean}
 */
function changeAdminPassword(newPassword) {
    if (!newPassword || newPassword.trim().length < 4) return false;
    try {
        localStorage.setItem(AuthStorageKeys.ADMIN_PASS, newPassword.trim());
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Obtiene la configuración de la aplicación
 * @returns {object}
 */
function getAppConfig() {
    try {
        const raw = localStorage.getItem(AuthStorageKeys.CONFIG);
        return raw ? { ...DEFAULT_APP_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_APP_CONFIG };
    } catch (e) {
        return { ...DEFAULT_APP_CONFIG };
    }
}

/**
 * Guarda la configuración de la aplicación
 * @param {object} config
 */
function saveAppConfig(config) {
    try {
        localStorage.setItem(AuthStorageKeys.CONFIG, JSON.stringify(config));
    } catch (e) {
        console.error('Error al guardar configuración', e);
    }
}

/**
 * Obtiene las estadísticas de la aplicación
 * @returns {object}
 */
function getAppStats() {
    try {
        const raw = localStorage.getItem(AuthStorageKeys.STATS);
        return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : { ...DEFAULT_STATS };
    } catch (e) {
        return { ...DEFAULT_STATS };
    }
}

/**
 * Registra la construcción o análisis de una fórmula y los conectivos usados
 * @param {string[]} connectivesUsed Lista de símbolos de conectivos usados
 */
function trackFormulaBuilt(connectivesUsed = []) {
    const stats = getAppStats();
    stats.formulasBuilt = (stats.formulasBuilt || 0) + 1;

    if (!stats.connectivesCount) {
        stats.connectivesCount = { ...DEFAULT_STATS.connectivesCount };
    }

    if (Array.isArray(connectivesUsed)) {
        connectivesUsed.forEach(sym => {
            if (stats.connectivesCount[sym] !== undefined) {
                stats.connectivesCount[sym] += 1;
            } else {
                stats.connectivesCount[sym] = 1;
            }
        });
    }

    try {
        localStorage.setItem(AuthStorageKeys.STATS, JSON.stringify(stats));
    } catch (e) {}

    // Si hay un usuario regular activo, incrementamos también su conteo personal
    const session = getCurrentSession();
    if (session && session.role === 'user' && session.id) {
        const users = getUsers();
        const u = users.find(user => user.id === session.id);
        if (u) {
            u.formulasBuilt = (u.formulasBuilt || 0) + 1;
            saveUsers(users);
        }
    }
}

/**
 * Reinicia las estadísticas de la app (función de administrador)
 */
function resetAppStats() {
    try {
        localStorage.setItem(AuthStorageKeys.STATS, JSON.stringify(DEFAULT_STATS));
        return true;
    } catch (e) {
        return false;
    }
}

// Exportación Universal (Navegador y Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AuthStorageKeys,
        DEFAULT_ADMIN_PASS,
        getUsers,
        saveUsers,
        registerUser,
        loginUser,
        loginAdmin,
        getCurrentSession,
        setCurrentSession,
        logout,
        deleteUser,
        changeUserPassword,
        changeAdminPassword,
        getAppConfig,
        saveAppConfig,
        getAppStats,
        trackFormulaBuilt,
        resetAppStats
    };
}

if (typeof window !== 'undefined') {
    window.Auth = {
        AuthStorageKeys,
        DEFAULT_ADMIN_PASS,
        getUsers,
        saveUsers,
        registerUser,
        loginUser,
        loginAdmin,
        getCurrentSession,
        setCurrentSession,
        logout,
        deleteUser,
        changeUserPassword,
        changeAdminPassword,
        getAppConfig,
        saveAppConfig,
        getAppStats,
        trackFormulaBuilt,
        resetAppStats
    };
}
