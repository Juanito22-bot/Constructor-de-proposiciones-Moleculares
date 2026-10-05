/**
 * UI - Controlador de Interfaz de Usuario
 * Gestiona:
 * 1. Autenticación (Login usuario, Registro, Acceso Admin maestro, Sesiones y Tema).
 * 2. Modo Construir (teclado virtual, deshacer/rehacer, validación FBF en tiempo real).
 * 3. Modo Inverso (análisis de conectivos, subfórmulas, AST SVG/ASCII, reconstrucción).
 * 4. Módulo de Inteligencia Artificial (Traductor de lenguaje natural, Explicador paso a paso).
 * 5. Panel de Administrador (Gestión de usuarios, configuración global, gestor de ejemplos y estadísticas).
 * 6. Suite de Pruebas Unitarias Integrada.
 */

// Estado global de la aplicación
const AppState = {
    activeTab: 'build-tab',
    buildHistory: [],
    historyIndex: -1,
    maxHistory: 50
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initAppThemeAndConfig();
    initAuthSystem();
    initTabs();
    initBuildMode();
    initReverseMode();
    initDictionary();
    initAIAssistant();
    initAdminPanel();
    initDynamicExamples();
    initTestRunner();
});

// ========================================================
// 0. TEMA Y CONFIGURACIÓN GLOBAL
// ========================================================
function initAppThemeAndConfig() {
    const config = window.Auth ? window.Auth.getAppConfig() : { title: 'Constructor de Proposiciones Moleculares', darkMode: true };

    // 1. Aplicar título
    applyAppTitle(config.title);

    // 2. Aplicar tema
    applyTheme(config.darkMode !== false);
}

function applyAppTitle(title) {
    if (!title) return;
    const headerTitle = document.getElementById('app-header-title');
    const footerTitle = document.getElementById('footer-app-title');
    const pageTitle = document.getElementById('page-title');

    if (headerTitle) headerTitle.textContent = title;
    if (footerTitle) footerTitle.textContent = title;
    if (pageTitle) pageTitle.textContent = `${title} - Lógica Proposicional`;
}

function applyTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const toggleBtn = document.getElementById('btn-theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = isDark ? '🌙' : '☀️';
        toggleBtn.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    }
}

// ========================================================
// 1. SISTEMA DE AUTENTICACIÓN Y PERFILES (localStorage)
// ========================================================
function initAuthSystem() {
    const authOverlay = document.getElementById('auth-overlay');
    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    const tabAdmin = document.getElementById('auth-tab-admin');

    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const formAdmin = document.getElementById('form-admin');

    const alertBox = document.getElementById('auth-alert');
    const logoutBtn = document.getElementById('btn-logout');
    const themeToggleBtn = document.getElementById('btn-theme-toggle');

    // Comprobación de sesión existente
    const currentSession = window.Auth ? window.Auth.getCurrentSession() : null;

    if (!currentSession) {
        showAuthModal('login');
    } else {
        hideAuthModal();
        updateUserHeader(currentSession);
    }

    // Navegación entre las 3 opciones del modal de bienvenida
    function switchAuthForm(mode) {
        hideAuthAlert();
        [tabLogin, tabRegister, tabAdmin].forEach(t => t.classList.remove('active'));
        [formLogin, formRegister, formAdmin].forEach(f => f.classList.add('hidden'));

        if (mode === 'login') {
            tabLogin.classList.add('active');
            formLogin.classList.remove('hidden');
            const uInput = document.getElementById('login-username');
            if (uInput) uInput.focus();
        } else if (mode === 'register') {
            tabRegister.classList.add('active');
            formRegister.classList.remove('hidden');
            const rInput = document.getElementById('register-username');
            if (rInput) rInput.focus();
        } else if (mode === 'admin') {
            tabAdmin.classList.add('active');
            formAdmin.classList.remove('hidden');
            const aInput = document.getElementById('admin-password');
            if (aInput) aInput.focus();
        }
    }

    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthForm('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchAuthForm('register'));
    if (tabAdmin) tabAdmin.addEventListener('click', () => switchAuthForm('admin'));

    // 1. Formulario Iniciar Sesión (Usuario)
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            const res = window.Auth.loginUser(username, password);
            if (res.success) {
                hideAuthModal();
                updateUserHeader(res.session);
                showToast(res.message);
                formLogin.reset();
            } else {
                showAuthAlert(res.message, 'error');
            }
        });
    }

    // 2. Formulario Registrarse
    if (formRegister) {
        formRegister.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            const confirm = document.getElementById('register-password-confirm').value;

            if (password !== confirm) {
                showAuthAlert('Las contraseñas no coinciden.', 'error');
                return;
            }

            const res = window.Auth.registerUser(username, password);
            if (res.success) {
                // Auto login tras registro exitoso
                const loginRes = window.Auth.loginUser(username, password);
                if (loginRes.success) {
                    hideAuthModal();
                    updateUserHeader(loginRes.session);
                    showToast('¡Cuenta creada y sesión iniciada!');
                    formRegister.reset();
                } else {
                    switchAuthForm('login');
                    showAuthAlert(res.message, 'success');
                }
            } else {
                showAuthAlert(res.message, 'error');
            }
        });
    }

    // 3. Formulario Administrador (Contraseña Maestra)
    if (formAdmin) {
        formAdmin.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password').value;

            const res = window.Auth.loginAdmin(password);
            if (res.success) {
                hideAuthModal();
                updateUserHeader(res.session);
                showToast(res.message);
                formAdmin.reset();
            } else {
                showAuthAlert(res.message, 'error');
            }
        });
    }

    // Cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('¿Deseas cerrar tu sesión actual?')) {
                window.Auth.logout();
                showAuthModal('login');
                updateUserHeader(null);
                switchTab('build-tab');
                showToast('Sesión finalizada.');
            }
        });
    }

    // Toggle de tema claro / oscuro en cabecera
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newIsDark = currentTheme !== 'dark';
            applyTheme(newIsDark);

            const config = window.Auth.getAppConfig();
            config.darkMode = newIsDark;
            window.Auth.saveAppConfig(config);
            showToast(`Modo ${newIsDark ? 'oscuro' : 'claro'} activado`);
        });
    }
}

function showAuthModal(defaultMode = 'login') {
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) {
        authOverlay.classList.remove('hidden');
        const tabBtn = document.getElementById(`auth-tab-${defaultMode}`);
        if (tabBtn) tabBtn.click();
    }
}

function hideAuthModal() {
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) authOverlay.classList.add('hidden');
    hideAuthAlert();
}

function showAuthAlert(msg, type = 'error') {
    const alertBox = document.getElementById('auth-alert');
    if (alertBox) {
        alertBox.className = `auth-alert alert-${type}`;
        alertBox.textContent = msg;
        alertBox.classList.remove('hidden');
    }
}

function hideAuthAlert() {
    const alertBox = document.getElementById('auth-alert');
    if (alertBox) alertBox.classList.add('hidden');
}

function updateUserHeader(session) {
    const nameEl = document.getElementById('user-display-name');
    const roleBadge = document.getElementById('user-role-badge');
    const adminTabBtn = document.getElementById('tab-btn-admin');

    if (!session) {
        if (nameEl) nameEl.textContent = 'Sin sesión';
        if (roleBadge) {
            roleBadge.textContent = 'INVITADO';
            roleBadge.className = 'user-role-badge';
        }
        if (adminTabBtn) adminTabBtn.classList.add('hidden');
        return;
    }

    if (nameEl) nameEl.textContent = session.username;

    if (roleBadge) {
        if (session.role === 'admin') {
            roleBadge.textContent = 'ADMIN';
            roleBadge.className = 'user-role-badge role-admin';
        } else {
            roleBadge.textContent = 'USUARIO';
            roleBadge.className = 'user-role-badge role-user';
        }
    }

    // Mostrar u ocultar pestaña de Administrador según el rol
    if (adminTabBtn) {
        if (session.role === 'admin') {
            adminTabBtn.classList.remove('hidden');
        } else {
            adminTabBtn.classList.add('hidden');
            if (AppState.activeTab === 'admin-tab') {
                switchTab('build-tab');
            }
        }
    }
}

// ========================================================
// 2. SISTEMA DE PESTAÑAS (TABS)
// ========================================================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            switchTab(targetId);
        });
    });
}

function switchTab(tabId) {
    // Si intenta acceder a admin sin ser admin, bloquear
    if (tabId === 'admin-tab') {
        const session = window.Auth ? window.Auth.getCurrentSession() : null;
        if (!session || session.role !== 'admin') {
            showToast('⚠️ Acceso restringido solo para administradores.');
            return;
        }
        renderAdminDashboard();
    }

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(b => {
        const isActive = b.getAttribute('data-tab') === tabId;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    tabContents.forEach(c => {
        const isActive = c.id === tabId;
        c.classList.toggle('active', isActive);
    });

    AppState.activeTab = tabId;

    if (tabId === 'build-tab') {
        const input = document.getElementById('build-input');
        if (input) input.focus();
    } else if (tabId === 'reverse-tab') {
        const input = document.getElementById('reverse-input');
        if (input) input.focus();
    } else if (tabId === 'dict-tab') {
        if (typeof renderDictionaryTable === 'function') renderDictionaryTable();
        const input = document.getElementById('dict-letter-input');
        if (input) input.focus();
    } else if (tabId === 'ai-tab') {
        const input = document.getElementById('ai-nl-input');
        if (input) input.focus();
    }
}

// ========================================================
// 3. BARRA DE EJEMPLOS PREDEFINIDOS DINÁMICOS
// ========================================================
function initDynamicExamples() {
    renderGlobalExamples();
}

function renderGlobalExamples() {
    const container = document.getElementById('global-examples-container');
    if (!container) return;

    const config = window.Auth ? window.Auth.getAppConfig() : { examples: [] };
    const examples = config.examples || [];

    container.innerHTML = examples.map(f => `
        <button type="button" class="example-chip" data-formula="${escapeHtml(f)}">${escapeHtml(f)}</button>
    `).join('');

    container.querySelectorAll('.example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const formula = chip.getAttribute('data-formula');
            if (!formula) return;

            if (AppState.activeTab === 'build-tab') {
                const buildInput = document.getElementById('build-input');
                buildInput.value = formula;
                pushBuildState(formula);
                updateBuildView();
                buildInput.focus();
            } else if (AppState.activeTab === 'reverse-tab') {
                const reverseInput = document.getElementById('reverse-input');
                reverseInput.value = formula;
                analyzeReverseFormula();
                reverseInput.focus();
            } else if (AppState.activeTab === 'ai-tab') {
                const explainInput = document.getElementById('ai-explain-input');
                if (explainInput) {
                    explainInput.value = formula;
                    explainInput.focus();
                }
            } else {
                switchTab('build-tab');
                const buildInput = document.getElementById('build-input');
                buildInput.value = formula;
                pushBuildState(formula);
                updateBuildView();
                buildInput.focus();
            }
        });
    });
}

// ========================================================
// 4. MODO CONSTRUIR (BUILD MODE)
// ========================================================
function initBuildMode() {
    const input = document.getElementById('build-input');
    const clearBtn = document.getElementById('btn-clear');
    const backspaceBtn = document.getElementById('btn-backspace');
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    const transferBtn = document.getElementById('btn-transfer-reverse');
    const copyBuildBtn = document.getElementById('btn-copy-build');

    pushBuildState('');

    input.addEventListener('input', () => {
        pushBuildState(input.value);
        updateBuildView();
    });

    input.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undoBuildState();
        } else if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
            e.preventDefault();
            redoBuildState();
        }
    });

    document.querySelectorAll('[data-insert]').forEach(btn => {
        btn.addEventListener('click', () => {
            const textToInsert = btn.getAttribute('data-insert');
            insertTextAtCursor(input, textToInsert);
            pushBuildState(input.value);
            updateBuildView();
        });
    });

    const customAtomInput = document.getElementById('custom-atom-input');
    const customAtomBtn = document.getElementById('btn-insert-custom-atom');
    if (customAtomBtn && customAtomInput) {
        const insertCustom = () => {
            const val = customAtomInput.value.trim().toLowerCase();
            if (val && /^[a-z][a-z0-9_]*$/i.test(val)) {
                insertTextAtCursor(input, val);
                pushBuildState(input.value);
                updateBuildView();
                customAtomInput.value = '';
            }
        };
        customAtomBtn.addEventListener('click', insertCustom);
        customAtomInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                insertCustom();
            }
        });
    }

    if (backspaceBtn) {
        backspaceBtn.addEventListener('click', () => {
            handleBackspace(input);
            pushBuildState(input.value);
            updateBuildView();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            pushBuildState('');
            updateBuildView();
            input.focus();
        });
    }

    if (undoBtn) undoBtn.addEventListener('click', undoBuildState);
    if (redoBtn) redoBtn.addEventListener('click', redoBuildState);

    if (copyBuildBtn) {
        copyBuildBtn.addEventListener('click', () => {
            if (input.value) {
                navigator.clipboard.writeText(input.value);
                showToast('¡Fórmula copiada al portapapeles!');
            }
        });
    }

    const copyTranslationBtn = document.getElementById('btn-copy-build-translation');
    if (copyTranslationBtn) {
        copyTranslationBtn.addEventListener('click', () => {
            const el = document.getElementById('build-translation-text');
            if (el && el.innerText && !el.querySelector('.empty-hint')) {
                navigator.clipboard.writeText(el.innerText);
                showToast('¡Traducción al español copiada!');
            }
        });
    }

    if (transferBtn) {
        transferBtn.addEventListener('click', () => {
            const formula = input.value.trim();
            if (!formula) return;
            const reverseInput = document.getElementById('reverse-input');
            if (reverseInput) {
                reverseInput.value = formula;
                switchTab('reverse-tab');
                analyzeReverseFormula();
            }
        });
    }

    updateBuildView();
}

function insertTextAtCursor(input, text) {
    input.focus();
    const startPos = input.selectionStart || 0;
    const endPos = input.selectionEnd || 0;
    const currentVal = input.value;

    const newVal = currentVal.substring(0, startPos) + text + currentVal.substring(endPos);
    input.value = newVal;

    const newCursorPos = startPos + text.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
}

function handleBackspace(input) {
    input.focus();
    const startPos = input.selectionStart || 0;
    const endPos = input.selectionEnd || 0;

    if (startPos !== endPos) {
        input.value = input.value.substring(0, startPos) + input.value.substring(endPos);
        input.setSelectionRange(startPos, startPos);
        return;
    }

    if (startPos === 0) return;

    const val = input.value;
    let deleteCount = 1;

    if (val.slice(startPos - 3, startPos) === '<->' || val.slice(startPos - 3, startPos) === '<=>') {
        deleteCount = 3;
    } else if (val.slice(startPos - 2, startPos) === '->' || val.slice(startPos - 2, startPos) === '=>' ||
               val.slice(startPos - 2, startPos) === '&&' || val.slice(startPos - 2, startPos) === '||') {
        deleteCount = 2;
    }

    input.value = val.substring(0, startPos - deleteCount) + val.substring(startPos);
    const newPos = startPos - deleteCount;
    input.setSelectionRange(newPos, newPos);
}

function pushBuildState(text) {
    if (AppState.historyIndex >= 0 && AppState.buildHistory[AppState.historyIndex] === text) {
        return;
    }
    AppState.buildHistory = AppState.buildHistory.slice(0, AppState.historyIndex + 1);
    AppState.buildHistory.push(text);
    if (AppState.buildHistory.length > AppState.maxHistory) {
        AppState.buildHistory.shift();
    } else {
        AppState.historyIndex++;
    }
    updateUndoRedoButtons();
}

function undoBuildState() {
    if (AppState.historyIndex > 0) {
        AppState.historyIndex--;
        const input = document.getElementById('build-input');
        input.value = AppState.buildHistory[AppState.historyIndex];
        updateBuildView();
        updateUndoRedoButtons();
    }
}

function redoBuildState() {
    if (AppState.historyIndex < AppState.buildHistory.length - 1) {
        AppState.historyIndex++;
        const input = document.getElementById('build-input');
        input.value = AppState.buildHistory[AppState.historyIndex];
        updateBuildView();
        updateUndoRedoButtons();
    }
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = AppState.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = AppState.historyIndex >= AppState.buildHistory.length - 1;
}

let lastTrackedValidFormula = '';

function updateBuildView() {
    const input = document.getElementById('build-input');
    const formulaStr = input ? input.value : '';

    const statusBadge = document.getElementById('build-status-badge');
    const statusText = document.getElementById('build-status-text');
    const errorContainer = document.getElementById('build-error-container');
    const errorHighlight = document.getElementById('build-error-highlight');
    const errorExplanation = document.getElementById('build-error-explanation');
    const tokensContainer = document.getElementById('build-tokens-preview');
    const transferBtn = document.getElementById('btn-transfer-reverse');

    if (!formulaStr.trim()) {
        statusBadge.className = 'status-badge status-empty';
        statusText.textContent = 'En espera de fórmula...';
        errorContainer.classList.add('hidden');
        tokensContainer.innerHTML = '<span class="empty-hint">La fórmula está vacía. Use los botones o escriba una expresión.</span>';
        if (transferBtn) transferBtn.disabled = true;
        updateBuildTranslation('');
        return;
    }

    const result = window.validateAndParse(formulaStr);

    if (result.isValid) {
        statusBadge.className = 'status-badge status-valid';
        statusText.innerHTML = '<strong>✓ FBF VÁLIDA:</strong> La fórmula cumple con todas las reglas de formación.';
        errorContainer.classList.add('hidden');
        if (transferBtn) transferBtn.disabled = false;

        renderTokensList(result.tokens, tokensContainer);

        // Registro de estadísticas en localStorage si es una fórmula nueva construida
        if (formulaStr.trim() !== lastTrackedValidFormula && formulaStr.length > 2) {
            lastTrackedValidFormula = formulaStr.trim();
            const connData = window.collectConnectives(result.ast);
            if (window.Auth) {
                window.Auth.trackFormulaBuilt(connData.list);
            }
        }
    } else {
        statusBadge.className = 'status-badge status-invalid';
        statusText.innerHTML = '<strong>✗ FBF INVÁLIDA O INCOMPLETA:</strong> Hay un error sintáctico o léxico.';
        errorContainer.classList.remove('hidden');
        if (transferBtn) transferBtn.disabled = true;

        renderErrorPosition(formulaStr, result.error, errorHighlight);

        errorExplanation.innerHTML = `
            <div class="error-msg-main">
                <span class="error-pos-badge">Posición ${result.error.position + 1}</span>
                <span class="error-desc">${escapeHtml(result.error.message)}</span>
            </div>
            ${result.error.suggestion ? `<div class="error-suggestion">💡 <strong>Consejo:</strong> ${escapeHtml(result.error.suggestion)}</div>` : ''}
        `;

        tokensContainer.innerHTML = '<span class="empty-hint">Corrija la fórmula para visualizar los tokens completos.</span>';
    }

    // Actualizar recuadro de traducción al español con el Diccionario
    updateBuildTranslation(formulaStr);
}

function updateBuildTranslation(formulaStr) {
    const translationEl = document.getElementById('build-translation-text');
    if (!translationEl) return;

    if (!formulaStr || !formulaStr.trim()) {
        translationEl.innerHTML = '<span class="empty-hint">Escriba una fórmula para ver su traducción al español con las palabras del diccionario...</span>';
        return;
    }

    if (window.PropositionDictionary) {
        const spanish = window.PropositionDictionary.translateFormulaToSpanish(formulaStr);
        if (spanish) {
            const formatted = escapeHtml(spanish)
                .replace(/&quot;(.*?)&quot;/g, '<span class="dict-meaning-highlight">"$1"</span>')
                .replace(/\b(SI Y SOLO SI|SI|ENTONCES|Y|O|NO)\b/g, '<span class="dict-connective-highlight">$1</span>');
            translationEl.innerHTML = formatted;
        } else {
            translationEl.innerHTML = '<span class="empty-hint">Sin traducción disponible.</span>';
        }
    }
}

function renderErrorPosition(text, error, container) {
    const pos = Math.max(0, Math.min(error.position, text.length));
    const len = error.length || 1;

    const before = escapeHtml(text.slice(0, pos));
    const errPart = escapeHtml(text.slice(pos, pos + len) || '␣');
    const after = escapeHtml(text.slice(pos + len));

    const pointerSpaces = '&nbsp;'.repeat(pos);

    container.innerHTML = `
        <div class="code-error-preview">
            <span class="code-before">${before}</span><mark class="code-mark">${errPart}</mark><span class="code-after">${after}</span>
        </div>
        <div class="code-error-pointer" aria-hidden="true">${pointerSpaces}<span class="pointer-arrow">▲</span></div>
    `;
}

function renderTokensList(tokens, container) {
    if (!tokens || tokens.length <= 1) {
        container.innerHTML = '';
        return;
    }

    const html = tokens.filter(t => t.type !== window.TokenType.EOF).map(t => {
        let chipClass = 'token-atom';
        if (t.type === window.TokenType.NOT) chipClass = 'token-not';
        else if (t.type === window.TokenType.LPAREN || t.type === window.TokenType.RPAREN) chipClass = 'token-paren';
        else chipClass = 'token-binop';

        return `<span class="token-chip ${chipClass}" title="Tipo: ${t.type} (Pos: ${t.start + 1})">${escapeHtml(t.value)}</span>`;
    }).join(' ');

    container.innerHTML = `<span class="tokens-label">Tokens:</span> ${html}`;
}

// ========================================================
// 5. MODO INVERSO (REVERSE MODE)
// ========================================================
function initReverseMode() {
    const input = document.getElementById('reverse-input');
    const analyzeBtn = document.getElementById('btn-analyze-reverse');
    const clearBtn = document.getElementById('btn-clear-reverse');
    const copyParenthesizedBtn = document.getElementById('btn-copy-parenthesized');
    const copyAsciiBtn = document.getElementById('btn-copy-ascii');
    const viewGraphBtn = document.getElementById('btn-view-graph');
    const viewTextBtn = document.getElementById('btn-view-text');

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeReverseFormula);
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                analyzeReverseFormula();
            }
        });
        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (input.value.trim()) {
                    analyzeReverseFormula();
                } else {
                    hideReverseResults();
                }
            }, 300);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            hideReverseResults();
            input.focus();
        });
    }

    if (viewGraphBtn && viewTextBtn) {
        viewGraphBtn.addEventListener('click', () => {
            viewGraphBtn.classList.add('active');
            viewTextBtn.classList.remove('active');
            document.getElementById('ast-svg-container').classList.remove('hidden');
            document.getElementById('ast-text-container').classList.add('hidden');
        });
        viewTextBtn.addEventListener('click', () => {
            viewTextBtn.classList.add('active');
            viewGraphBtn.classList.remove('active');
            document.getElementById('ast-text-container').classList.remove('hidden');
            document.getElementById('ast-svg-container').classList.add('hidden');
        });
    }

    if (copyParenthesizedBtn) {
        copyParenthesizedBtn.addEventListener('click', () => {
            const el = document.getElementById('reverse-parenthesized-text');
            if (el && el.textContent) {
                navigator.clipboard.writeText(el.textContent);
                showToast('¡Fórmula con paréntesis explícitos copiada!');
            }
        });
    }

    if (copyAsciiBtn) {
        copyAsciiBtn.addEventListener('click', () => {
            const el = document.getElementById('ast-ascii-pre');
            if (el && el.textContent) {
                navigator.clipboard.writeText(el.textContent);
                showToast('¡Árbol sintáctico copiado!');
            }
        });
    }

    const copyReverseTranslationBtn = document.getElementById('btn-copy-reverse-translation');
    if (copyReverseTranslationBtn) {
        copyReverseTranslationBtn.addEventListener('click', () => {
            const el = document.getElementById('reverse-translation-text');
            if (el && el.textContent) {
                navigator.clipboard.writeText(el.textContent);
                showToast('¡Interpretación semántica copiada!');
            }
        });
    }
}

function analyzeReverseFormula() {
    const input = document.getElementById('reverse-input');
    const formulaStr = input ? input.value.trim() : '';

    const errorContainer = document.getElementById('reverse-error-container');
    const resultsContainer = document.getElementById('reverse-results-container');

    if (!formulaStr) {
        hideReverseResults();
        return;
    }

    const result = window.validateAndParse(formulaStr);

    if (!result.isValid) {
        resultsContainer.classList.add('hidden');
        errorContainer.classList.remove('hidden');

        const highlightEl = document.getElementById('reverse-error-highlight');
        const explanationEl = document.getElementById('reverse-error-explanation');

        renderErrorPosition(formulaStr, result.error, highlightEl);
        explanationEl.innerHTML = `
            <div class="error-msg-main">
                <span class="error-pos-badge">Posición ${result.error.position + 1}</span>
                <span class="error-desc">${escapeHtml(result.error.message)}</span>
            </div>
            ${result.error.suggestion ? `<div class="error-suggestion">💡 <strong>Consejo:</strong> ${escapeHtml(result.error.suggestion)}</div>` : ''}
        `;
        return;
    }

    errorContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    const ast = result.ast;

    // a) Proposiciones atómicas encontradas
    const atoms = window.collectAtoms(ast);
    const atomsListEl = document.getElementById('reverse-atoms-list');
    const atomsCountEl = document.getElementById('reverse-atoms-count');
    atomsCountEl.textContent = `(${atoms.length})`;
    atomsListEl.innerHTML = atoms.map(a => `<span class="atom-badge">${escapeHtml(a)}</span>`).join('');

    // b) Conectivos usados
    const connData = window.collectConnectives(ast);
    const connListEl = document.getElementById('reverse-connectives-list');
    const connCountEl = document.getElementById('reverse-connectives-count');
    connCountEl.textContent = `(${connData.list.length} distintos, ${Object.values(connData.counts).reduce((a, b) => a + b, 0)} total)`;
    if (connData.details.length === 0) {
        connListEl.innerHTML = '<span class="empty-hint">Sin conectivos (es una proposición atómica).</span>';
    } else {
        connListEl.innerHTML = connData.details.map(c => `
            <div class="connective-card">
                <span class="conn-symbol">${escapeHtml(c.symbol)}</span>
                <div class="conn-info">
                    <span class="conn-name">${escapeHtml(c.name)}</span>
                    <span class="conn-count">${c.count} ${c.count === 1 ? 'ocurrencia' : 'ocurrencias'}</span>
                </div>
            </div>
        `).join('');
    }

    // Registrar en estadísticas
    if (window.Auth) {
        window.Auth.trackFormulaBuilt(connData.list);
    }

    // c) Conectivo principal
    const mainConn = window.getMainConnective(ast);
    const mainConnSymbolEl = document.getElementById('reverse-main-symbol');
    const mainConnNameEl = document.getElementById('reverse-main-name');
    const mainConnDescEl = document.getElementById('reverse-main-desc');

    if (mainConn.symbol) {
        mainConnSymbolEl.textContent = mainConn.symbol;
        mainConnSymbolEl.className = 'main-symbol-box symbol-present';
    } else {
        mainConnSymbolEl.textContent = '∅';
        mainConnSymbolEl.className = 'main-symbol-box symbol-empty';
    }
    mainConnNameEl.textContent = mainConn.name;
    mainConnDescEl.textContent = mainConn.description;

    // d) Subfórmulas
    const subformulas = window.collectSubformulas(ast);
    const subformulasTableBody = document.getElementById('reverse-subformulas-tbody');
    const subformulasCountEl = document.getElementById('reverse-subformulas-count');
    subformulasCountEl.textContent = `(${subformulas.length})`;

    subformulasTableBody.innerHTML = subformulas.map((s, index) => `
        <tr>
            <td class="col-num">${index + 1}</td>
            <td class="col-formula"><code>${escapeHtml(s.formula)}</code></td>
            <td class="col-type"><span class="subf-type-tag tag-${s.type.toLowerCase().replace(/[^a-z]/g, '')}">${escapeHtml(s.type)}</span></td>
            <td class="col-parenthesized"><code>${escapeHtml(s.parenthesized)}</code></td>
        </tr>
    `).join('');

    // e) Árbol sintáctico (AST): Visual SVG y Textual ASCII
    const svgContainer = document.getElementById('ast-svg-container');
    svgContainer.innerHTML = window.renderSvgTree(ast);

    const asciiPre = document.getElementById('ast-ascii-pre');
    asciiPre.textContent = window.renderAsciiTree(ast);

    // f) FBF reconstruida con paréntesis explícitos
    const fullyParenthesized = window.toFullyParenthesized(ast);
    const fullyParenthesizedEl = document.getElementById('reverse-parenthesized-text');
    fullyParenthesizedEl.textContent = fullyParenthesized;

    // g) Interpretación semántica con el diccionario
    const reverseTranslationEl = document.getElementById('reverse-translation-text');
    if (reverseTranslationEl && window.PropositionDictionary) {
        const spanish = window.PropositionDictionary.translateFormulaToSpanish(formulaStr);
        reverseTranslationEl.textContent = spanish || 'Sin interpretación disponible.';
    }
}

function hideReverseResults() {
    const errorContainer = document.getElementById('reverse-error-container');
    const resultsContainer = document.getElementById('reverse-results-container');
    if (errorContainer) errorContainer.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.add('hidden');
}

// ========================================================
// 5.1. DICCIONARIO DE PROPOSICIONES (GLOSARIO SEMÁNTICO)
// ========================================================
function initDictionary() {
    const form = document.getElementById('form-dict-definition');
    const letterInput = document.getElementById('dict-letter-input');
    const meaningInput = document.getElementById('dict-meaning-input');
    const cancelBtn = document.getElementById('btn-dict-cancel');
    const clearAllBtn = document.getElementById('btn-dict-clear-all');
    const editModeInput = document.getElementById('dict-edit-mode');

    // Renderizar tabla inicial
    renderDictionaryTable();

    // Guardar o actualizar definición
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const letter = (letterInput ? letterInput.value : '').trim().toLowerCase();
            const meaning = (meaningInput ? meaningInput.value : '').trim();

            if (!letter || !/^[a-z]$/.test(letter)) {
                showToast('La letra debe ser una sola letra del alfabeto (ej: p, q, r, s).');
                return;
            }

            if (!meaning) {
                showToast('Debe ingresar un significado en lenguaje natural.');
                return;
            }

            const dict = window.PropositionDictionary ? window.PropositionDictionary.getDictionary() : {};
            const isEditing = editModeInput && editModeInput.value === letter;

            // Validación de duplicado: si ya existe y no estamos en modo edición de la misma letra
            if (!isEditing && dict[letter] !== undefined) {
                const overwrite = confirm(`La letra "${letter}" ya está definida como "${dict[letter]}". ¿Desea sobrescribir su significado?`);
                if (!overwrite) return;
            }

            const res = window.PropositionDictionary.setDefinition(letter, meaning);
            if (res.success) {
                showToast(res.message);
                form.reset();
                if (editModeInput) editModeInput.value = '';
                if (letterInput) letterInput.disabled = false;
                if (cancelBtn) cancelBtn.classList.add('hidden');
                const saveBtn = document.getElementById('btn-dict-save');
                if (saveBtn) saveBtn.textContent = '💾 Guardar en Diccionario';

                renderDictionaryTable();

                // Actualizar traducciones en vivo si hay fórmulas en Constructor o Inversor
                const currentBuild = document.getElementById('build-input')?.value;
                if (currentBuild) updateBuildTranslation(currentBuild);

                const currentReverse = document.getElementById('reverse-input')?.value;
                if (currentReverse && !document.getElementById('reverse-results-container')?.classList.contains('hidden')) {
                    const revTr = document.getElementById('reverse-translation-text');
                    if (revTr) revTr.textContent = window.PropositionDictionary.translateFormulaToSpanish(currentReverse);
                }
            } else {
                showToast(res.message);
            }
        });
    }

    // Cancelar edición
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (form) form.reset();
            if (editModeInput) editModeInput.value = '';
            if (letterInput) {
                letterInput.disabled = false;
                letterInput.focus();
            }
            cancelBtn.classList.add('hidden');
            const saveBtn = document.getElementById('btn-dict-save');
            if (saveBtn) saveBtn.textContent = '💾 Guardar en Diccionario';
        });
    }

    // Vaciar diccionario completo
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            const ok = confirm('¿Está seguro de que desea vaciar todas las definiciones del diccionario?');
            if (ok) {
                window.PropositionDictionary.clearDictionary();
                renderDictionaryTable();
                showToast('El diccionario ha sido vaciado.');

                const currentBuild = document.getElementById('build-input')?.value;
                if (currentBuild) updateBuildTranslation(currentBuild);

                const currentReverse = document.getElementById('reverse-input')?.value;
                if (currentReverse) {
                    const revTr = document.getElementById('reverse-translation-text');
                    if (revTr) revTr.textContent = window.PropositionDictionary.translateFormulaToSpanish(currentReverse);
                }
            }
        });
    }
}

/**
 * Renderiza la tabla de proposiciones del diccionario
 */
function renderDictionaryTable() {
    const tbody = document.getElementById('dict-table-tbody');
    const countBadge = document.getElementById('dict-count-badge');
    if (!tbody || !window.PropositionDictionary) return;

    const dict = window.PropositionDictionary.getDictionary();
    const entries = Object.entries(dict).sort((a, b) => a[0].localeCompare(b[0]));

    if (countBadge) {
        countBadge.textContent = `(${entries.length} ${entries.length === 1 ? 'definición' : 'definiciones'})`;
    }

    if (entries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-hint" style="text-align: center; padding: 1.5rem;">
                    El diccionario está vacío. Añada una letra y su significado para comenzar.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = entries.map(([letter, meaning]) => `
        <tr>
            <td>
                <span class="dict-letter-badge">${escapeHtml(letter)}</span>
            </td>
            <td>
                <span class="dict-meaning-cell">"${escapeHtml(meaning)}"</span>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                    <button type="button" class="btn-secondary btn-sm" onclick="editDictionaryDefinition('${escapeHtml(letter)}')">
                        ✏️ Editar
                    </button>
                    <button type="button" class="btn-danger btn-sm" onclick="deleteDictionaryDefinition('${escapeHtml(letter)}')">
                        🗑️ Eliminar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Funciones globales expuestas para las filas de la tabla del diccionario
window.editDictionaryDefinition = function(letter) {
    if (!window.PropositionDictionary) return;
    const dict = window.PropositionDictionary.getDictionary();
    const meaning = dict[letter];
    if (meaning === undefined) return;

    const letterInput = document.getElementById('dict-letter-input');
    const meaningInput = document.getElementById('dict-meaning-input');
    const editModeInput = document.getElementById('dict-edit-mode');
    const cancelBtn = document.getElementById('btn-dict-cancel');
    const saveBtn = document.getElementById('btn-dict-save');

    if (letterInput && meaningInput) {
        letterInput.value = letter;
        letterInput.disabled = true; // Mantener bloqueada la letra durante edición
        meaningInput.value = meaning;
        if (editModeInput) editModeInput.value = letter;
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (saveBtn) saveBtn.textContent = '💾 Actualizar Definición';
        meaningInput.focus();
        showToast(`Editando definición de "${letter}".`);
    }
};

window.deleteDictionaryDefinition = function(letter) {
    if (confirm(`¿Eliminar la definición de la letra "${letter}"?`)) {
        window.PropositionDictionary.removeDefinition(letter);
        renderDictionaryTable();
        showToast(`Definición para "${letter}" eliminada.`);

        const currentBuild = document.getElementById('build-input')?.value;
        if (currentBuild) updateBuildTranslation(currentBuild);

        const currentReverse = document.getElementById('reverse-input')?.value;
        if (currentReverse && !document.getElementById('reverse-results-container')?.classList.contains('hidden')) {
            const revTr = document.getElementById('reverse-translation-text');
            if (revTr) revTr.textContent = window.PropositionDictionary.translateFormulaToSpanish(currentReverse);
        }
    }
};

// ========================================================
// 6. MÓDULO DE INTELIGENCIA ARTIFICIAL (AI ASSISTANT)
// ========================================================
function initAIAssistant() {
    const nlInput = document.getElementById('ai-nl-input');
    const translateBtn = document.getElementById('btn-ai-translate');
    const clearNlBtn = document.getElementById('btn-ai-clear-nl');
    const resultsBox = document.getElementById('ai-nl-results');

    const generatedFormulaEl = document.getElementById('ai-generated-formula');
    const sourceBadgeEl = document.getElementById('ai-source-badge');
    const atomsChipsEl = document.getElementById('ai-atoms-chips');
    const explanationTextEl = document.getElementById('ai-explanation-text');

    const copyAiFormulaBtn = document.getElementById('btn-copy-ai-formula');
    const toBuildBtn = document.getElementById('btn-ai-to-build');
    const toReverseBtn = document.getElementById('btn-ai-to-reverse');

    // Botones de frases rápidas
    document.querySelectorAll('.ai-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sentence = btn.getAttribute('data-sentence');
            if (nlInput) {
                nlInput.value = sentence;
                nlInput.focus();
            }
        });
    });

    // Acción Traducir con IA
    if (translateBtn) {
        translateBtn.addEventListener('click', async () => {
            const text = nlInput ? nlInput.value.trim() : '';
            if (!text) {
                showToast('Escriba una frase en lenguaje natural.');
                return;
            }

            translateBtn.disabled = true;
            translateBtn.textContent = '⏳ Analizando y deduciendo FBF...';

            try {
                const res = await window.AI.translateNaturalLanguage(text);

                if (res && res.success) {
                    resultsBox.classList.remove('hidden');
                    generatedFormulaEl.textContent = res.formula;
                    sourceBadgeEl.textContent = res.source === 'offline' ? 'Motor de Reglas Offline (Nativo)' : `API: ${res.source.toUpperCase()}`;

                    // Glosario de átomos
                    atomsChipsEl.innerHTML = (res.atoms || []).map(a => `
                        <div class="ai-atom-pill">
                            <span class="ai-atom-letter">${escapeHtml(a.letter)}:</span>
                            <span class="ai-atom-desc">"${escapeHtml(a.text)}"</span>
                        </div>
                    `).join('');

                    // Explicación
                    explanationTextEl.textContent = res.explanation;
                } else {
                    showToast('No se pudo traducir la frase. Intenta reformularla.');
                }
            } catch (err) {
                console.error(err);
                showToast('Error al procesar la traducción.');
            } finally {
                translateBtn.disabled = false;
                translateBtn.textContent = '✨ Traducir a FBF con IA';
            }
        });
    }

    if (clearNlBtn) {
        clearNlBtn.addEventListener('click', () => {
            if (nlInput) nlInput.value = '';
            if (resultsBox) resultsBox.classList.add('hidden');
        });
    }

    if (copyAiFormulaBtn) {
        copyAiFormulaBtn.addEventListener('click', () => {
            const formula = generatedFormulaEl.textContent;
            if (formula) {
                navigator.clipboard.writeText(formula);
                showToast('¡Fórmula copiada al portapapeles!');
            }
        });
    }

    if (toBuildBtn) {
        toBuildBtn.addEventListener('click', () => {
            const formula = generatedFormulaEl.textContent;
            if (!formula) return;
            const buildInput = document.getElementById('build-input');
            if (buildInput) {
                buildInput.value = formula;
                pushBuildState(formula);
                switchTab('build-tab');
                updateBuildView();
                showToast('Fórmula cargada en el Constructor.');
            }
        });
    }

    if (toReverseBtn) {
        toReverseBtn.addEventListener('click', () => {
            const formula = generatedFormulaEl.textContent;
            if (!formula) return;
            const reverseInput = document.getElementById('reverse-input');
            if (reverseInput) {
                reverseInput.value = formula;
                switchTab('reverse-tab');
                analyzeReverseFormula();
                showToast('Fórmula cargada en el Modo Inversor.');
            }
        });
    }

    // ==========================================
    // EXPLICADOR PASO A PASO DE FBF
    // ==========================================
    const explainInput = document.getElementById('ai-explain-input');
    const explainBtn = document.getElementById('btn-ai-explain');
    const useCurrentBtn = document.getElementById('btn-ai-use-current');
    const explainResults = document.getElementById('ai-explain-results');

    const verbalReadingEl = document.getElementById('explain-verbal-reading');
    const mainConnectiveEl = document.getElementById('explain-main-connective');
    const stepsListEl = document.getElementById('explain-steps-list');
    const semanticSummaryEl = document.getElementById('explain-semantic-summary');

    if (useCurrentBtn) {
        useCurrentBtn.addEventListener('click', () => {
            const currentFormula = document.getElementById('build-input')?.value.trim();
            if (currentFormula && explainInput) {
                explainInput.value = currentFormula;
                showToast('Fórmula del Constructor importada.');
            } else {
                showToast('No hay fórmula en el Constructor.');
            }
        });
    }

    if (explainBtn) {
        explainBtn.addEventListener('click', () => {
            const formula = explainInput ? explainInput.value.trim() : '';
            if (!formula) {
                showToast('Ingrese una fórmula para explicar.');
                return;
            }

            const res = window.AI.explainFormulaStepByStep(formula);

            if (!res.success) {
                showToast(`Error: ${res.message}`);
                explainResults.classList.add('hidden');
                return;
            }

            explainResults.classList.remove('hidden');

            // 1. Lectura verbal
            if (res.dictionaryTranslation) {
                verbalReadingEl.innerHTML = `${escapeHtml(res.verbalReading || 'Proposición simple')}<div class="explain-dict-interpretation" style="margin-top: 0.6rem; padding-top: 0.6rem; border-top: 1px dashed var(--border-color, #334155); font-size: 0.95rem; color: var(--accent-light, #38bdf8);"><strong>📖 Con Diccionario Semántico:</strong> ${escapeHtml(res.dictionaryTranslation)}</div>`;
            } else {
                verbalReadingEl.textContent = res.verbalReading || 'Proposición simple';
            }

            // 2. Conectivo principal
            const mc = res.mainConnectiveInfo;
            mainConnectiveEl.innerHTML = mc.symbol
                ? `El conectivo principal es <strong>${escapeHtml(mc.symbol)} (${escapeHtml(mc.name)})</strong>. ${escapeHtml(mc.description)}`
                : `Es una proposición atómica simple ('${escapeHtml(res.formula)}'), sin conectivos principales.`;

            // 3. Pasos de precedencia
            if (res.precedenceSteps.length === 0) {
                stepsListEl.innerHTML = '<p class="empty-hint">Proposición atómica: se evalúa directamente según su valor de verdad asignado.</p>';
            } else {
                stepsListEl.innerHTML = res.precedenceSteps.map(s => `
                    <div class="explain-step-item">
                        <span class="step-number">${s.step}.</span>
                        <div class="step-details">
                            <h5>${escapeHtml(s.title)}</h5>
                            <p>${escapeHtml(s.description)}</p>
                            <span class="step-subformula">Subexpresión: ${escapeHtml(s.subformula)}</span>
                        </div>
                    </div>
                `).join('');
            }

            // 4. Resumen semántico
            semanticSummaryEl.innerHTML = escapeHtml(res.semanticSummary).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        });
    }

    // Configuración opcional de IA (Groq / HuggingFace)
    const providerSelect = document.getElementById('ai-provider-select');
    const apiKeyInput = document.getElementById('ai-api-key-input');
    const saveAiConfigBtn = document.getElementById('btn-save-ai-config');

    if (providerSelect && apiKeyInput) {
        const currentAiCfg = window.AI.getAIConfig();
        providerSelect.value = currentAiCfg.provider || 'offline';
        apiKeyInput.value = currentAiCfg.apiKey || '';

        if (saveAiConfigBtn) {
            saveAiConfigBtn.addEventListener('click', () => {
                window.AI.saveAIConfig({
                    provider: providerSelect.value,
                    apiKey: apiKeyInput.value
                });
                showToast('Configuración del Asistente IA guardada.');
            });
        }
    }
}

// ========================================================
// 7. PANEL DE ADMINISTRADOR (ADMIN PANEL)
// ========================================================
function initAdminPanel() {
    const configForm = document.getElementById('form-admin-config');
    const appTitleInput = document.getElementById('admin-app-title');
    const darkModeToggle = document.getElementById('admin-dark-mode-toggle');
    const masterPassInput = document.getElementById('admin-change-master-pass');

    const addExampleBtn = document.getElementById('btn-admin-add-example');
    const newExampleInput = document.getElementById('admin-new-example-input');
    const resetStatsBtn = document.getElementById('btn-reset-stats');

    // Cargar valores iniciales en formulario de configuración
    const config = window.Auth ? window.Auth.getAppConfig() : {};
    if (appTitleInput) appTitleInput.value = config.title || 'Constructor de Proposiciones Moleculares';
    if (darkModeToggle) darkModeToggle.checked = config.darkMode !== false;

    // Guardar Configuración General
    if (configForm) {
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTitle = appTitleInput.value.trim() || 'Constructor de Proposiciones Moleculares';
            const newDark = darkModeToggle.checked;

            const cfg = window.Auth.getAppConfig();
            cfg.title = newTitle;
            cfg.darkMode = newDark;
            window.Auth.saveAppConfig(cfg);

            applyAppTitle(newTitle);
            applyTheme(newDark);

            // Cambiar contraseña maestra si se especificó
            if (masterPassInput && masterPassInput.value.trim()) {
                window.Auth.changeAdminPassword(masterPassInput.value.trim());
                masterPassInput.value = '';
                showToast('Configuración y contraseña maestra de Admin actualizadas.');
            } else {
                showToast('Configuración guardada exitosamente.');
            }
        });
    }

    // Añadir ejemplo predefinido desde Admin con validación
    if (addExampleBtn && newExampleInput) {
        addExampleBtn.addEventListener('click', () => {
            const raw = newExampleInput.value.trim();
            if (!raw) return;

            const validation = window.validateAndParse(raw);
            if (!validation.isValid) {
                showToast(`No se puede añadir: ${validation.error.message}`);
                return;
            }

            const cfg = window.Auth.getAppConfig();
            if (!cfg.examples) cfg.examples = [];

            if (cfg.examples.includes(raw)) {
                showToast('Este ejemplo ya existe en la lista.');
                return;
            }

            cfg.examples.push(raw);
            window.Auth.saveAppConfig(cfg);
            newExampleInput.value = '';
            renderAdminDashboard();
            renderGlobalExamples();
            showToast('¡Nuevo ejemplo añadido a la barra de la app!');
        });
    }

    // Reiniciar Estadísticas
    if (resetStatsBtn) {
        resetStatsBtn.addEventListener('click', () => {
            if (confirm('¿Seguro que deseas reiniciar todos los contadores de estadísticas a 0?')) {
                window.Auth.resetAppStats();
                renderAdminDashboard();
                showToast('Estadísticas reiniciadas.');
            }
        });
    }

    // Modal para cambiar contraseña de usuario
    const modalChangePass = document.getElementById('modal-change-pass');
    const formModalChangePass = document.getElementById('form-modal-change-pass');
    const btnCancelModalPass = document.getElementById('btn-modal-cancel-pass');

    if (btnCancelModalPass) {
        btnCancelModalPass.addEventListener('click', () => {
            if (modalChangePass) modalChangePass.classList.add('hidden');
        });
    }

    if (formModalChangePass) {
        formModalChangePass.addEventListener('submit', (e) => {
            e.preventDefault();
            const userId = document.getElementById('modal-user-id').value;
            const newPass = document.getElementById('modal-new-password').value;

            const ok = window.Auth.changeUserPassword(userId, newPass);
            if (ok) {
                modalChangePass.classList.add('hidden');
                formModalChangePass.reset();
                renderAdminDashboard();
                showToast('Contraseña de usuario actualizada.');
            } else {
                showToast('Error al actualizar contraseña (mínimo 4 caracteres).');
            }
        });
    }
}

/**
 * Renderiza todos los datos del Panel de Administrador
 */
function renderAdminDashboard() {
    if (!window.Auth) return;

    // 1. Estadísticas Globales
    const stats = window.Auth.getAppStats();
    const users = window.Auth.getUsers();

    const totalFormulasEl = document.getElementById('stat-total-formulas');
    const totalUsersEl = document.getElementById('stat-total-users');
    const usersCountEl = document.getElementById('admin-users-count');

    if (totalFormulasEl) totalFormulasEl.textContent = stats.formulasBuilt || 0;
    if (totalUsersEl) totalUsersEl.textContent = users.length;
    if (usersCountEl) usersCountEl.textContent = `(${users.length} usuarios)`;

    // Barras de conectivos usados
    const usageBarsContainer = document.getElementById('admin-connectives-usage');
    if (usageBarsContainer) {
        const counts = stats.connectivesCount || { '¬': 0, '∧': 0, '∨': 0, '→': 0, '↔': 0 };
        const maxVal = Math.max(1, ...Object.values(counts));
        const connectivesList = ['¬', '∧', '∨', '→', '↔'];

        usageBarsContainer.innerHTML = connectivesList.map(sym => {
            const count = counts[sym] || 0;
            const pct = Math.round((count / maxVal) * 100);
            return `
                <div class="usage-bar-row">
                    <span class="usage-bar-symbol">${escapeHtml(sym)}</span>
                    <div class="usage-bar-track">
                        <div class="usage-bar-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="usage-bar-count">${count}</span>
                </div>
            `;
        }).join('');
    }

    // 2. Tabla de Usuarios Registrados
    const tbody = document.getElementById('admin-users-tbody');
    if (tbody) {
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-hint" style="text-align: center; padding: 1rem;">No hay usuarios registrados aún.</td></tr>';
        } else {
            tbody.innerHTML = users.map(u => {
                const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
                return `
                    <tr>
                        <td><strong>${escapeHtml(u.username)}</strong></td>
                        <td>${dateStr}</td>
                        <td>${u.formulasBuilt || 0}</td>
                        <td>
                            <div style="display: flex; gap: 0.4rem;">
                                <button type="button" class="btn-secondary btn-sm" onclick="openChangePasswordModal('${u.id}', '${escapeHtml(u.username)}')">
                                    🔑 Contraseña
                                </button>
                                <button type="button" class="btn-danger btn-sm" onclick="confirmDeleteUser('${u.id}', '${escapeHtml(u.username)}')">
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // 3. Gestor de Ejemplos
    const examplesListEl = document.getElementById('admin-examples-list');
    if (examplesListEl) {
        const config = window.Auth.getAppConfig();
        const examples = config.examples || [];

        examplesListEl.innerHTML = examples.map((ex, index) => `
            <div class="admin-example-item">
                <span class="admin-example-text"><code>${escapeHtml(ex)}</code></span>
                <button type="button" class="btn-danger btn-sm" onclick="adminDeleteExample(${index})">
                    🗑️ Eliminar
                </button>
            </div>
        `).join('');
    }
}

// Funciones globales expuestas para los botones en la tabla del panel admin
window.openChangePasswordModal = function(userId, username) {
    const modal = document.getElementById('modal-change-pass');
    const targetEl = document.getElementById('modal-user-target');
    const idInput = document.getElementById('modal-user-id');
    const passInput = document.getElementById('modal-new-password');

    if (modal && targetEl && idInput) {
        targetEl.textContent = `Usuario: ${username}`;
        idInput.value = userId;
        if (passInput) passInput.value = '';
        modal.classList.remove('hidden');
        if (passInput) passInput.focus();
    }
};

window.confirmDeleteUser = function(userId, username) {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${username}"?`)) {
        window.Auth.deleteUser(userId);
        renderAdminDashboard();
        showToast(`Usuario "${username}" eliminado.`);
    }
};

window.adminDeleteExample = function(index) {
    const config = window.Auth.getAppConfig();
    if (config.examples && config.examples[index] !== undefined) {
        const removed = config.examples.splice(index, 1);
        window.Auth.saveAppConfig(config);
        renderAdminDashboard();
        renderGlobalExamples();
        showToast(`Ejemplo "${removed[0]}" eliminado.`);
    }
};

// ========================================================
// 8. TEST RUNNER INTEGRADO EN LA UI
// ========================================================
function initTestRunner() {
    const runBtn = document.getElementById('btn-run-tests');
    if (!runBtn) return;

    runBtn.addEventListener('click', () => {
        runUiTests();
    });
}

function runUiTests() {
    const suite = window.createTestSuite();
    const summary = suite.run();

    const summaryTotal = document.getElementById('test-summary-total');
    const summaryPassed = document.getElementById('test-summary-passed');
    const summaryFailed = document.getElementById('test-summary-failed');
    const testsContainer = document.getElementById('test-results-list');

    if (summaryTotal) summaryTotal.textContent = summary.total;
    if (summaryPassed) summaryPassed.textContent = summary.passed;
    if (summaryFailed) summaryFailed.textContent = summary.failed;

    let currentCat = '';
    let html = '';

    summary.results.forEach(res => {
        if (res.category !== currentCat) {
            currentCat = res.category;
            html += `<div class="test-category-header"><h3>${escapeHtml(currentCat)}</h3></div>`;
        }

        const statusClass = res.passed ? 'test-pass' : 'test-fail';
        const icon = res.passed ? '✓' : '✗';

        html += `
            <div class="test-item ${statusClass}">
                <div class="test-item-main">
                    <span class="test-icon">${icon}</span>
                    <span class="test-name">${escapeHtml(res.name)}</span>
                    <span class="test-duration">${res.duration}ms</span>
                </div>
                ${res.error ? `<div class="test-error-detail"><strong>Fallo:</strong> ${escapeHtml(res.error)}</div>` : ''}
            </div>
        `;
    });

    if (testsContainer) {
        testsContainer.innerHTML = html;
    }

    showToast(`Pruebas completadas: ${summary.passed} pasadas de ${summary.total}`);
}

// ========================================================
// 9. UTILIDADES GENERALES
// ========================================================
function showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'app-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 2800);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
