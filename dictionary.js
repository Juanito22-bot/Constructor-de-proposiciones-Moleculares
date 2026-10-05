/**
 * DICTIONARY.JS - Diccionario de Proposiciones / Definiciones de Variables
 * Gestiona la asignación entre letras proposicionales (p, q, r, etc.) y sus
 * significados en lenguaje natural, persistido en localStorage bajo 'propositionDictionary'.
 * 
 * Formato en localStorage:
 * { "p": "Cuando quiere comer", "q": "manzanas" }
 */

const DICT_STORAGE_KEY = 'propositionDictionary';

const DEFAULT_DICTIONARY = {
    "p": "Cuando quiere comer",
    "q": "manzanas"
};

/**
 * Inicializa el diccionario en localStorage si no existe
 */
function initDictionaryStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
        if (!localStorage.getItem(DICT_STORAGE_KEY)) {
            localStorage.setItem(DICT_STORAGE_KEY, JSON.stringify(DEFAULT_DICTIONARY));
        }
    } catch (e) {
        console.error('Error al inicializar propositionDictionary', e);
    }
}

initDictionaryStorage();

/**
 * Obtiene el diccionario completo de proposiciones
 * @returns {Record<string, string>}
 */
function getDictionary() {
    try {
        const raw = localStorage.getItem(DICT_STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_DICTIONARY };
        }
        return JSON.parse(raw);
    } catch (e) {
        console.error('Error al leer propositionDictionary', e);
        return { ...DEFAULT_DICTIONARY };
    }
}

/**
 * Guarda el diccionario en localStorage
 * @param {Record<string, string>} dict
 */
function saveDictionary(dict) {
    try {
        localStorage.setItem(DICT_STORAGE_KEY, JSON.stringify(dict));
    } catch (e) {
        console.error('Error al guardar propositionDictionary', e);
    }
}

/**
 * Valida si una letra proposicional es válida (una sola letra a-z)
 * @param {string} letter
 * @returns {boolean}
 */
function isValidLetter(letter) {
    if (!letter || typeof letter !== 'string') return false;
    const clean = letter.trim().toLowerCase();
    return /^[a-z]$/.test(clean);
}

/**
 * Añade o actualiza una definición en el diccionario
 * @param {string} letter Letra proposicional (ej: "p")
 * @param {string} meaning Significado en lenguaje natural
 * @returns {{ success: boolean, message: string }}
 */
function setDefinition(letter, meaning) {
    if (!isValidLetter(letter)) {
        return {
            success: false,
            message: 'La letra proposicional debe ser una sola letra del alfabeto (ej: p, q, r, s).'
        };
    }

    const cleanLetter = letter.trim().toLowerCase();
    const cleanMeaning = (meaning || '').trim();

    if (!cleanMeaning) {
        return {
            success: false,
            message: 'Debe ingresar un significado en lenguaje natural para la proposición.'
        };
    }

    const dict = getDictionary();
    dict[cleanLetter] = cleanMeaning;
    saveDictionary(dict);

    return {
        success: true,
        message: `Definición para "${cleanLetter}" guardada con éxito.`
    };
}

/**
 * Elimina una definición del diccionario
 * @param {string} letter
 * @returns {boolean}
 */
function removeDefinition(letter) {
    const cleanLetter = (letter || '').trim().toLowerCase();
    const dict = getDictionary();
    if (dict[cleanLetter] !== undefined) {
        delete dict[cleanLetter];
        saveDictionary(dict);
        return true;
    }
    return false;
}

/**
 * Vacía todas las definiciones del diccionario
 */
function clearDictionary() {
    saveDictionary({});
}

/**
 * Traduce un nodo del AST a su interpretación en español usando el diccionario
 * Conectivos:
 *   ∧ -> Y
 *   ∨ -> O
 *   ¬ -> NO
 *   → -> SI ... ENTONCES ...
 *   ↔ -> SI Y SOLO SI
 * @param {object} node Nodo AST
 * @param {Record<string, string>} dict
 * @returns {string}
 */
function translateAstNode(node, dict) {
    if (!node) return '';

    if (node.type === 'ATOM') {
        const letter = node.name.toLowerCase();
        if (dict && dict[letter]) {
            return `"${dict[letter]}"`;
        }
        return letter;
    }

    if (node.type === 'UNARY') {
        const operandTranslation = translateAstNode(node.operand, dict);
        if (node.operand.type === 'ATOM') {
            return `NO ${operandTranslation}`;
        }
        return `NO (${operandTranslation})`;
    }

    if (node.type === 'BINARY') {
        const left = translateAstNode(node.left, dict);
        const right = translateAstNode(node.right, dict);

        switch (node.operator) {
            case '∧':
                return `${left} Y ${right}`;
            case '∨':
                return `${left} O ${right}`;
            case '→':
                return `SI ${left} ENTONCES ${right}`;
            case '↔':
                return `${left} SI Y SOLO SI ${right}`;
            default:
                return `${left} ${node.operator} ${right}`;
        }
    }

    return '';
}

/**
 * Traduce una fórmula lógica completa a su interpretación en español
 * Si la fórmula es una FBF válida, utiliza el AST para estructurar la gramática.
 * Si no es válida o está en edición, utiliza un reemplazo léxico de apoyo.
 * 
 * @param {string} formulaStr Cadena con la fórmula
 * @returns {string} Traducción al español
 */
function translateFormulaToSpanish(formulaStr) {
    const clean = (formulaStr || '').trim();
    if (!clean) return '';

    const dict = getDictionary();

    // Intentar traducción sintáctica precisa mediante AST
    if (typeof window !== 'undefined' && window.validateAndParse) {
        const parsed = window.validateAndParse(clean);
        if (parsed.isValid && parsed.ast) {
            return translateAstNode(parsed.ast, dict);
        }
    } else if (typeof require !== 'undefined') {
        try {
            const parserMod = require('./parser.js');
            const parsed = parserMod.validateAndParse(clean);
            if (parsed.isValid && parsed.ast) {
                return translateAstNode(parsed.ast, dict);
            }
        } catch (e) {}
    }

    // Fallback: Reemplazo léxico directo si la fórmula está en edición
    let result = clean;

    // Normalizar conectivos a palabras en español
    result = result.replace(/<->|<=>|↔/g, ' SI Y SOLO SI ');
    result = result.replace(/->|=>|→/g, ' ENTONCES ');
    result = result.replace(/&&|&|∧/g, ' Y ');
    result = result.replace(/\|\||\||∨/g, ' O ');
    result = result.replace(/¬|~|!/g, 'NO ');

    // Reemplazar letras de proposiciones atómicas por sus significados entre comillas
    result = result.replace(/\b([a-z])\b/gi, (match, letter) => {
        const l = letter.toLowerCase();
        return dict[l] ? `"${dict[l]}"` : letter;
    });

    // Limpieza de espacios dobles
    return result.replace(/\s+/g, ' ').trim();
}

// Exportación Universal
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DICT_STORAGE_KEY,
        DEFAULT_DICTIONARY,
        getDictionary,
        saveDictionary,
        isValidLetter,
        setDefinition,
        removeDefinition,
        clearDictionary,
        translateFormulaToSpanish,
        translateAstNode
    };
}

if (typeof window !== 'undefined') {
    window.PropositionDictionary = {
        DICT_STORAGE_KEY,
        DEFAULT_DICTIONARY,
        getDictionary,
        saveDictionary,
        isValidLetter,
        setDefinition,
        removeDefinition,
        clearDictionary,
        translateFormulaToSpanish,
        translateAstNode
    };
}

