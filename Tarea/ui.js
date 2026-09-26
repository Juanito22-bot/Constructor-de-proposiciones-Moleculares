/**
 * UI - Controlador de Interfaz de Usuario
 * Gestiona el Modo Construir (teclado virtual, deshacer/rehacer, validación en tiempo real),
 * el Modo Inverso (análisis, desglose, subfórmulas, AST gráfico SVG y textual, reconstrucción),
 * el Runner de Pruebas Unitarias integrado y la interactividad general.
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
    initTabs();
    initBuildMode();
    initReverseMode();
    initExamples();
    initTestRunner();
});

// ========================================================
// 1. SISTEMA DE PESTAÑAS (TABS)
// ========================================================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            switchTab(targetId);
        });
    });
}

function switchTab(tabId) {
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
    }
}

// ========================================================
// 2. MODO CONSTRUIR (BUILD MODE)
// ========================================================
function initBuildMode() {
    const input = document.getElementById('build-input');
    const clearBtn = document.getElementById('btn-clear');
    const backspaceBtn = document.getElementById('btn-backspace');
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    const transferBtn = document.getElementById('btn-transfer-reverse');
    const copyBuildBtn = document.getElementById('btn-copy-build');

    // Inicializar estado del historial con cadena vacía
    pushBuildState('');

    // Listener de entrada directa con teclado físico
    input.addEventListener('input', () => {
        pushBuildState(input.value);
        updateBuildView();
    });

    // Soporte para atajos de teclado estándar: Ctrl+Z (Undo), Ctrl+Y (Redo)
    input.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undoBuildState();
        } else if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
            e.preventDefault();
            redoBuildState();
        }
    });

    // Botones de teclado virtual: proposiciones y conectivos
    document.querySelectorAll('[data-insert]').forEach(btn => {
        btn.addEventListener('click', () => {
            const textToInsert = btn.getAttribute('data-insert');
            insertTextAtCursor(input, textToInsert);
            pushBuildState(input.value);
            updateBuildView();
        });
    });

    // Botón para insertar proposición personalizada (ej: u, v, w, p1...)
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

    // Botón Borrar (Backspace)
    if (backspaceBtn) {
        backspaceBtn.addEventListener('click', () => {
            handleBackspace(input);
            pushBuildState(input.value);
            updateBuildView();
        });
    }

    // Botón Limpiar (Clear)
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            pushBuildState('');
            updateBuildView();
            input.focus();
        });
    }

    // Botones Deshacer y Rehacer
    if (undoBtn) undoBtn.addEventListener('click', undoBuildState);
    if (redoBtn) redoBtn.addEventListener('click', redoBuildState);

    // Botón Copiar fórmula construida
    if (copyBuildBtn) {
        copyBuildBtn.addEventListener('click', () => {
            if (input.value) {
                navigator.clipboard.writeText(input.value);
                showToast('¡Fórmula copiada al portapapeles!');
            }
        });
    }

    // Botón Transferir al Modo Inverso
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

    // Actualizar vista inicial
    updateBuildView();
}

/**
 * Inserta texto en la posición actual del cursor en un input
 */
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

/**
 * Maneja el borrado de caracteres teniendo en cuenta tokens compuestos o espacios
 */
function handleBackspace(input) {
    input.focus();
    const startPos = input.selectionStart || 0;
    const endPos = input.selectionEnd || 0;

    if (startPos !== endPos) {
        // Hay texto seleccionado, borrar selección
        input.value = input.value.substring(0, startPos) + input.value.substring(endPos);
        input.setSelectionRange(startPos, startPos);
        return;
    }

    if (startPos === 0) return;

    // Detectar si el carácter anterior es parte de un conectivo multicarácter como <-> o -> o &&
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

/**
 * Gestión de la pila de deshacer/rehacer (Undo/Redo)
 */
function pushBuildState(text) {
    if (AppState.historyIndex >= 0 && AppState.buildHistory[AppState.historyIndex] === text) {
        return; // Sin cambios
    }
    // Truncar historial posterior si se deshizo antes
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

/**
 * Valida y actualiza en tiempo real el estado del Constructor
 */
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
        return;
    }

    const result = window.validateAndParse(formulaStr);

    if (result.isValid) {
        statusBadge.className = 'status-badge status-valid';
        statusText.innerHTML = '<strong>✓ FBF VÁLIDA:</strong> La fórmula cumple con todas las reglas de formación.';
        errorContainer.classList.add('hidden');
        if (transferBtn) transferBtn.disabled = false;

        // Mostrar tokens reconocidos
        renderTokensList(result.tokens, tokensContainer);
    } else {
        statusBadge.className = 'status-badge status-invalid';
        statusText.innerHTML = '<strong>✗ FBF INVÁLIDA O INCOMPLETA:</strong> Hay un error sintáctico o léxico.';
        errorContainer.classList.remove('hidden');
        if (transferBtn) transferBtn.disabled = true;

        // Renderizar resaltado de posición de error
        renderErrorPosition(formulaStr, result.error, errorHighlight);

        // Explicación didáctica
        errorExplanation.innerHTML = `
            <div class="error-msg-main">
                <span class="error-pos-badge">Posición ${result.error.position + 1}</span>
                <span class="error-desc">${escapeHtml(result.error.message)}</span>
            </div>
            ${result.error.suggestion ? `<div class="error-suggestion">💡 <strong>Consejo:</strong> ${escapeHtml(result.error.suggestion)}</div>` : ''}
        `;

        tokensContainer.innerHTML = '<span class="empty-hint">Corrija la fórmula para visualizar los tokens completos.</span>';
    }
}

/**
 * Renderiza el texto de la fórmula resaltando el carácter causante del error
 * y colocando una flecha indicadora exactamente debajo
 */
function renderErrorPosition(text, error, container) {
    const pos = Math.max(0, Math.min(error.position, text.length));
    const len = error.length || 1;

    const before = escapeHtml(text.slice(0, pos));
    const errPart = escapeHtml(text.slice(pos, pos + len) || '␣');
    const after = escapeHtml(text.slice(pos + len));

    // Construir puntero visual con flecha
    const pointerSpaces = '&nbsp;'.repeat(pos);

    container.innerHTML = `
        <div class="code-error-preview">
            <span class="code-before">${before}</span><mark class="code-mark">${errPart}</mark><span class="code-after">${after}</span>
        </div>
        <div class="code-error-pointer" aria-hidden="true">${pointerSpaces}<span class="pointer-arrow">▲</span></div>
    `;
}

/**
 * Renderiza lista de tokens visuales
 */
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
// 3. MODO INVERSO (REVERSE MODE)
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
        // Auto-analizar con debounce al escribir en modo inverso
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

    // Conmutador entre Árbol Gráfico SVG y Árbol Textual ASCII
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

    // Copiar FBF reconstruida
    if (copyParenthesizedBtn) {
        copyParenthesizedBtn.addEventListener('click', () => {
            const el = document.getElementById('reverse-parenthesized-text');
            if (el && el.textContent) {
                navigator.clipboard.writeText(el.textContent);
                showToast('¡Fórmula con paréntesis explícitos copiada!');
            }
        });
    }

    // Copiar árbol ASCII
    if (copyAsciiBtn) {
        copyAsciiBtn.addEventListener('click', () => {
            const el = document.getElementById('ast-ascii-pre');
            if (el && el.textContent) {
                navigator.clipboard.writeText(el.textContent);
                showToast('¡Árbol sintáctico copiado!');
            }
        });
    }
}

/**
 * Ejecuta el análisis completo del Modo Inverso
 */
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
        // Mostrar error en modo inverso
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

    // La fórmula es válida: Descomponer y presentar todas las secciones requeridas
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
}

function hideReverseResults() {
    const errorContainer = document.getElementById('reverse-error-container');
    const resultsContainer = document.getElementById('reverse-results-container');
    if (errorContainer) errorContainer.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.add('hidden');
}

// ========================================================
// 4. BOTONES DE EJEMPLOS PREDEFINIDOS
// ========================================================
function initExamples() {
    document.querySelectorAll('.example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const formula = chip.getAttribute('data-formula');
            if (!formula) return;

            // Cargar en el modo actualmente activo o según contexto
            if (AppState.activeTab === 'build-tab') {
                const buildInput = document.getElementById('build-input');
                buildInput.value = formula;
                pushBuildState(formula);
                updateBuildView();
                buildInput.focus();
            } else {
                const reverseInput = document.getElementById('reverse-input');
                reverseInput.value = formula;
                analyzeReverseFormula();
                reverseInput.focus();
            }
        });
    });
}

// ========================================================
// 5. TEST RUNNER INTEGRADO EN LA UI
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
// 6. UTILIDADES GENERALES
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
