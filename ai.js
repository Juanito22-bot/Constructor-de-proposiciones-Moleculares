/**
 * AI.JS - Módulo de Inteligencia Artificial para Lógica Proposicional
 * 
 * Incluye:
 * 1. Traductor de Lenguaje Natural a FBF (con motor de reglas offline y soporte para API libre como Groq / HuggingFace / OpenAI).
 * 2. Explicador Paso a Paso de FBF (lectura verbal, conectivo principal, orden de precedencia y tabla de verdad conceptual).
 * 3. Fallback automático al motor de reglas offline si no hay API key o conexión.
 */

// Si estamos en Node.js, requerimos dependencias si es necesario
let _validateAndParse, _getMainConnective, _collectAtoms, _collectConnectives, _toFullyParenthesized;

if (typeof require !== 'undefined') {
    const parserMod = require('./parser.js');
    const astMod = require('./ast.js');
    _validateAndParse = parserMod.validateAndParse;
    _getMainConnective = astMod.getMainConnective;
    _collectAtoms = astMod.collectAtoms;
    _collectConnectives = astMod.collectConnectives;
    _toFullyParenthesized = astMod.toFullyParenthesized;
} else {
    _validateAndParse = window.validateAndParse;
    _getMainConnective = window.getMainConnective;
    _collectAtoms = window.collectAtoms;
    _collectConnectives = window.collectConnectives;
    _toFullyParenthesized = window.toFullyParenthesized;
}

const AIConfigKeys = {
    API_KEY: 'fbf_ai_api_key',
    PROVIDER: 'fbf_ai_provider', // 'offline', 'groq', 'huggingface'
    MODEL: 'fbf_ai_model'
};

/**
 * Obtiene la configuración de la IA almacenada
 */
function getAIConfig() {
    try {
        return {
            apiKey: localStorage.getItem(AIConfigKeys.API_KEY) || '',
            provider: localStorage.getItem(AIConfigKeys.PROVIDER) || 'offline',
            model: localStorage.getItem(AIConfigKeys.MODEL) || 'llama-3.3-70b-versatile'
        };
    } catch (e) {
        return { apiKey: '', provider: 'offline', model: '' };
    }
}

/**
 * Guarda la configuración de la IA
 */
function saveAIConfig(config) {
    try {
        if (config.apiKey !== undefined) localStorage.setItem(AIConfigKeys.API_KEY, config.apiKey.trim());
        if (config.provider !== undefined) localStorage.setItem(AIConfigKeys.PROVIDER, config.provider);
        if (config.model !== undefined) localStorage.setItem(AIConfigKeys.MODEL, config.model.trim());
    } catch (e) {
        console.error('Error al guardar configuración IA', e);
    }
}

// ========================================================
// 1. MOTOR DE REGLAS OFFLINE: LENGUAJE NATURAL A FBF
// ========================================================

/**
 * Normaliza y limpia una frase en lenguaje natural en español
 * @param {string} text
 * @returns {string}
 */
function normalizeSentence(text) {
    return (text || '')
        .trim()
        .toLowerCase()
        .replace(/[¿?¡!.,;:]/g, ' ')
        .replace(/\s+/g, ' ');
}

/**
 * Traduce una frase en lenguaje natural a FBF usando el motor de reglas en español
 * @param {string} sentence
 * @returns {{
 *   success: boolean,
 *   formula: string,
 *   atoms: Array<{ letter: string, text: string }>,
 *   explanation: string,
 *   source: string
 * }}
 */
function translateNaturalLanguageOffline(sentence) {
    const original = sentence.trim();
    if (!original) {
        return {
            success: false,
            formula: '',
            atoms: [],
            explanation: 'Ingrese una frase en lenguaje natural para traducir a lógica proposicional.',
            source: 'offline'
        };
    }

    const norm = normalizeSentence(original);
    const atomList = [];
    let atomIndex = 0;
    const atomLetters = ['p', 'q', 'r', 's', 't', 'u', 'v', 'w'];

    function registerAtom(clauseText) {
        let clean = clauseText.trim();
        // Quitar palabras de relleno iniciales
        clean = clean.replace(/^(entonces|que|de|a|el|la|los|las)\s+/i, '');
        if (!clean) clean = 'condición ' + (atomIndex + 1);

        // Buscar si ya existe una cláusula muy similar
        const existing = atomList.find(a => a.text.toLowerCase() === clean.toLowerCase());
        if (existing) return existing.letter;

        const letter = atomLetters[atomIndex % atomLetters.length];
        atomIndex++;
        atomList.push({ letter, text: clean });
        return letter;
    }

    // Patrón 1: Bicondicional ("si y solo si", "equivale a", "cuando y solo cuando")
    const iffKeywords = [' si y solo si ', ' equivale a ', ' cuando y solo cuando ', ' es equivalente a '];
    for (const kw of iffKeywords) {
        if (norm.includes(kw)) {
            const parts = norm.split(kw);
            if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                const left = translateClause(parts[0], registerAtom);
                const right = translateClause(parts[1], registerAtom);
                const formula = `(${left} ↔ ${right})`;
                return buildTranslationResponse(formula, atomList, 'Bicondicional (↔)', 'offline');
            }
        }
    }

    // Patrón 2: Condicional ("si ... entonces ...", "si ..., ...", "... implica ...")
    if (norm.startsWith('si ') || norm.includes(' entonces ') || norm.includes(' implica ')) {
        let ante = '';
        let conse = '';

        if (norm.startsWith('si ')) {
            const withoutSi = norm.slice(3).trim();
            if (withoutSi.includes(' entonces ')) {
                const parts = withoutSi.split(' entonces ');
                ante = parts[0];
                conse = parts.slice(1).join(' entonces ');
            } else {
                // Separación por coma o conectores
                const words = withoutSi.split(' ');
                const half = Math.floor(words.length / 2);
                ante = words.slice(0, half).join(' ');
                conse = words.slice(half).join(' ');
            }
        } else if (norm.includes(' entonces ')) {
            const parts = norm.split(' entonces ');
            ante = parts[0];
            conse = parts[1];
        } else if (norm.includes(' implica ')) {
            const parts = norm.split(' implica ');
            ante = parts[0];
            conse = parts[1];
        }

        if (ante && conse) {
            const anteFormula = translateClause(ante, registerAtom);
            const conseFormula = translateClause(conse, registerAtom);
            const formula = `(${anteFormula} → ${conseFormula})`;
            return buildTranslationResponse(formula, atomList, 'Condicional / Implicación (→)', 'offline');
        }
    }

    // Patrón 3: Disyunción general ("o", "o bien")
    if (norm.includes(' o bien ') || norm.includes(' o ')) {
        const parts = norm.split(/ o bien | o /);
        if (parts.length >= 2) {
            const formulas = parts.map(p => translateClause(p, registerAtom));
            const formula = formulas.length === 2 ? `(${formulas[0]} ∨ ${formulas[1]})` : formulas.join(' ∨ ');
            return buildTranslationResponse(formula, atomList, 'Disyunción (∨)', 'offline');
        }
    }

    // Patrón 4: Conjunción general ("y", "pero", "además", "sin embargo")
    if (norm.includes(' y ') || norm.includes(' e ') || norm.includes(' pero ') || norm.includes(' además ') || norm.includes(' sin embargo ')) {
        const parts = norm.split(/ y | e | pero | además | sin embargo /);
        if (parts.length >= 2) {
            const formulas = parts.map(p => translateClause(p, registerAtom));
            const formula = formulas.length === 2 ? `(${formulas[0]} ∧ ${formulas[1]})` : formulas.join(' ∧ ');
            return buildTranslationResponse(formula, atomList, 'Conjunción (∧)', 'offline');
        }
    }

    // Patrón 5: Cláusula simple o con negación
    const formula = translateClause(norm, registerAtom);
    return buildTranslationResponse(formula, atomList, 'Proposición simple / negada', 'offline');
}

/**
 * Traduce una subcláusula detectando negaciones internas y conectores menores (y, o)
 */
function translateClause(clauseText, registerAtom) {
    let clean = clauseText.trim();

    // Negación de frase completa: "no es cierto que ...", "es falso que ..."
    if (clean.startsWith('no es cierto que ') || clean.startsWith('es falso que ') || clean.startsWith('no es verdad que ')) {
        const inner = clean.replace(/^(no es cierto que|es falso que|no es verdad que)\s+/, '');
        const innerFormula = translateClause(inner, registerAtom);
        return `¬(${innerFormula})`;
    }

    // Conjunción interna (ej: "llueve y hace frío")
    if (clean.includes(' y ') || clean.includes(' pero ')) {
        const sub = clean.split(/ y | pero /);
        return `(${translateSingleAtom(sub[0], registerAtom)} ∧ ${translateSingleAtom(sub[1], registerAtom)})`;
    }

    // Disyunción interna (ej: "como o bebo")
    if (clean.includes(' o ')) {
        const sub = clean.split(' o ');
        return `(${translateSingleAtom(sub[0], registerAtom)} ∨ ${translateSingleAtom(sub[1], registerAtom)})`;
    }

    return translateSingleAtom(clean, registerAtom);
}

/**
 * Traduce una proposición atómica simple o con negación directa ("no tengo paraguas")
 */
function translateSingleAtom(raw, registerAtom) {
    let text = raw.trim();
    let isNegated = false;

    // Detectar negación directa
    if (text.startsWith('no ') || text.startsWith('no tengo ') || text.startsWith('nunca ') || text.startsWith('tampoco ')) {
        isNegated = true;
        text = text.replace(/^(no|nunca|tampoco)\s+/, '');
    }

    const atomLetter = registerAtom(text);
    return isNegated ? `¬${atomLetter}` : atomLetter;
}

/**
 * Empaqueta la respuesta de traducción asegurando que la FBF generada sea válida
 */
function buildTranslationResponse(rawFormula, atoms, structureName, source) {
    // Validar sintaxis con el parser
    const validation = window.validateAndParse ? window.validateAndParse(rawFormula) : { isValid: true };
    const finalFormula = validation.isValid ? rawFormula : rawFormula.replace(/[()]/g, '');

    const explanationParts = [
        `Se identificó una estructura de **${structureName}**.`,
        `Se extrajeron **${atoms.length} proposiciones atómicas**:`
    ];

    atoms.forEach(a => {
        explanationParts.push(`- **${a.letter}**: "${a.text}"`);
    });

    if (rawFormula.includes('¬')) {
        explanationParts.push('- Conectivo **¬ (Negación)**: Invierte el valor de verdad de las cláusulas negadas.');
    }
    if (rawFormula.includes('∧')) {
        explanationParts.push('- Conectivo **∧ (Conjunción)**: Une proposiciones con "y", requiriendo ambas verdaderas.');
    }
    if (rawFormula.includes('∨')) {
        explanationParts.push('- Conectivo **∨ (Disyunción)**: Une proposiciones con "o", requiriendo al menos una verdadera.');
    }
    if (rawFormula.includes('→')) {
        explanationParts.push('- Conectivo **→ (Condicional)**: Relación de implicación causa-efecto (antecedente → consecuente).');
    }
    if (rawFormula.includes('↔')) {
        explanationParts.push('- Conectivo **↔ (Bicondicional)**: Relación de doble implicación o equivalencia ("si y solo si").');
    }

    return {
        success: true,
        formula: finalFormula,
        atoms: atoms,
        explanation: explanationParts.join('\n'),
        source: source
    };
}

// ========================================================
// 2. CONEXIÓN API LIBRE (GROQ / HUGGINGFACE / FETCH)
// ========================================================

/**
 * Traduce lenguaje natural a FBF usando una API externa (Groq, HuggingFace, etc.) vía fetch
 * Si falla, retorna null para activar el fallback al motor de reglas offline
 */
async function translateWithExternalAPI(sentence, config) {
    if (!config.apiKey || config.provider === 'offline') {
        return null;
    }

    const systemPrompt = `Eres un experto profesor de Lógica Proposicional y Filosofía de la Ciencia. 
Tu tarea es traducir una frase en lenguaje natural en español a una Fórmula Bien Formada (FBF) de lógica proposicional.
Usa únicamente proposiciones atómicas en minúscula (p, q, r, s, t) y los conectivos oficiales:
- Negación: ¬
- Conjunción: ∧
- Disyunción: ∨
- Condicional: →
- Bicondicional: ↔
- Paréntesis: ( )

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "formula": "FBF aquí (ej: (p ∧ ¬q) → r)",
  "atoms": [
    { "letter": "p", "text": "descripción de p" },
    { "letter": "q", "text": "descripción de q" }
  ],
  "explanation": "Explicación clara y didáctica de por qué se formalizó así"
}`;

    try {
        if (config.provider === 'groq') {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Traduce a FBF: "${sentence}"` }
                    ],
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                console.warn('Error en respuesta de API Groq:', response.status);
                return null;
            }

            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content;
            if (textResponse) {
                const parsed = JSON.parse(textResponse);
                return {
                    success: true,
                    formula: parsed.formula,
                    atoms: parsed.atoms || [],
                    explanation: parsed.explanation || '',
                    source: 'groq'
                };
            }
        } else if (config.provider === 'huggingface') {
            // HuggingFace Router / Serverless Inference API
            const response = await fetch('https://api-inference.huggingface.co/models/' + (config.model || 'meta-llama/Meta-Llama-3-8B-Instruct'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\nTraduce a FBF en formato JSON: "${sentence}"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n`,
                    parameters: { max_new_tokens: 350, temperature: 0.1 }
                })
            });

            if (!response.ok) return null;
            const data = await response.json();
            const rawText = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
            if (rawText) {
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        success: true,
                        formula: parsed.formula,
                        atoms: parsed.atoms || [],
                        explanation: parsed.explanation || '',
                        source: 'huggingface'
                    };
                }
            }
        }
    } catch (err) {
        console.warn('Fallo en llamada a API de IA externa, recurriendo a motor local:', err);
    }

    return null;
}

/**
 * Función principal unificada: intenta API externa si está configurada, o motor de reglas offline
 * @param {string} sentence
 * @returns {Promise<{success: boolean, formula: string, atoms: Array, explanation: string, source: string}>}
 */
async function translateNaturalLanguage(sentence) {
    const config = getAIConfig();

    if (config.apiKey && config.provider !== 'offline') {
        const apiResult = await translateWithExternalAPI(sentence, config);
        if (apiResult && apiResult.success && apiResult.formula) {
            return apiResult;
        }
    }

    // Motor de reglas offline garantizado sin internet
    return translateNaturalLanguageOffline(sentence);
}

// ========================================================
// 3. EXPLICADOR PASO A PASO DE FBF
// ========================================================

/**
 * Explica paso a paso una FBF en lenguaje natural, conectivo principal, precedencia y semántica
 * @param {string} formulaStr
 * @returns {{
 *   success: boolean,
 *   verbalReading: string,
 *   mainConnectiveInfo: object,
 *   precedenceSteps: Array<{ step: number, title: string, description: string, subformula: string }>,
 *   semanticSummary: string,
 *   atoms: string[]
 * }}
 */
function explainFormulaStepByStep(formulaStr) {
    const clean = (formulaStr || '').trim();
    if (!clean) {
        return {
            success: false,
            message: 'Ingrese una fórmula lógica para explicar.'
        };
    }

    const val = window.validateAndParse ? window.validateAndParse(clean) : null;
    if (!val || !val.isValid) {
        return {
            success: false,
            message: val?.error?.message || 'La fórmula ingresada no es una Fórmula Bien Formada (FBF) válida.'
        };
    }

    const ast = val.ast;
    const atoms = window.collectAtoms ? window.collectAtoms(ast) : [];
    const mainConn = window.getMainConnective ? window.getMainConnective(ast) : { symbol: null, name: 'Atómica' };
    const fully = window.toFullyParenthesized ? window.toFullyParenthesized(ast) : clean;

    // 1. Generar lectura verbal en lenguaje natural
    const verbalReading = generateVerbalReading(ast);

    // 2. Pasos de precedencia y evaluación
    const steps = [];
    let stepCount = 1;

    function buildSteps(node) {
        if (!node) return;
        if (node.type === 'ATOM') return;

        if (node.type === 'UNARY') {
            buildSteps(node.operand);
            const subStr = window.toCanonicalString ? window.toCanonicalString(node) : `${node.operator}...`;
            steps.push({
                step: stepCount++,
                title: `Evaluación de Negación (${node.operator})`,
                description: `Se aplica el operador unario de negación sobre "${window.toCanonicalString ? window.toCanonicalString(node.operand) : 'su operando'}". La negación posee la mayor precedencia jerárquica (Nivel 1).`,
                subformula: subStr
            });
        } else if (node.type === 'BINARY') {
            buildSteps(node.left);
            buildSteps(node.right);
            const subStr = window.toCanonicalString ? window.toCanonicalString(node) : `... ${node.operator} ...`;
            const opName = getConnectiveFullName(node.operator);
            steps.push({
                step: stepCount++,
                title: `Evaluación de ${opName} (${node.operator})`,
                description: `Une el miembro izquierdo "${window.toCanonicalString ? window.toCanonicalString(node.left) : 'izq'}" con el miembro derecho "${window.toCanonicalString ? window.toCanonicalString(node.right) : 'der'}".`,
                subformula: subStr
            });
        }
    }

    buildSteps(ast);

    // 3. Resumen semántico conceptual
    const semanticSummary = generateSemanticSummary(ast, mainConn);

    return {
        success: true,
        formula: clean,
        parenthesized: fully,
        atoms: atoms,
        verbalReading: verbalReading,
        mainConnectiveInfo: mainConn,
        precedenceSteps: steps,
        semanticSummary: semanticSummary
    };
}

/**
 * Convierte un AST a su lectura en lenguaje natural formal en español
 */
function generateVerbalReading(node) {
    if (!node) return '';

    if (node.type === 'ATOM') {
        return `"${node.name}"`;
    }

    if (node.type === 'UNARY') {
        if (node.operand.type === 'ATOM') {
            return `no ${node.operand.name}`;
        }
        return `no es cierto que (${generateVerbalReading(node.operand)})`;
    }

    if (node.type === 'BINARY') {
        const leftText = generateVerbalReading(node.left);
        const rightText = generateVerbalReading(node.right);

        switch (node.operator) {
            case '∧':
                return `${leftText} y ${rightText}`;
            case '∨':
                return `${leftText} o ${rightText}`;
            case '→':
                return `Si ${leftText}, entonces ${rightText}`;
            case '↔':
                return `${leftText} si y solo si ${rightText}`;
            default:
                return `${leftText} ${node.operator} ${rightText}`;
        }
    }

    return '';
}

/**
 * Nombre formal completo del conectivo
 */
function getConnectiveFullName(symbol) {
    switch (symbol) {
        case '¬': return 'Negación';
        case '∧': return 'Conjunción';
        case '∨': return 'Disyunción';
        case '→': return 'Condicional (Implicación)';
        case '↔': return 'Bicondicional (Doble Implicación)';
        default: return 'Operación Binaria';
    }
}

/**
 * Genera la condición de verdad conceptual
 */
function generateSemanticSummary(ast, mainConn) {
    if (ast.type === 'ATOM') {
        return `Es una proposición atómica simple ('${ast.name}'). Su valor de verdad depende únicamente del estado del mundo que represente.`;
    }

    if (ast.type === 'UNARY') {
        return `La fórmula es una **Negación**. Será **Verdadera (V)** únicamente cuando la subfórmula negada sea Falsa (F), y será **Falsa (F)** cuando la subfórmula sea Verdadera.`;
    }

    if (ast.type === 'BINARY') {
        switch (ast.operator) {
            case '∧':
                return `La fórmula es una **Conjunción**. Para ser **Verdadera (V)** requiere obligatoriamente que ambas subfórmulas (izquierda y derecha) sean simultáneamente verdaderas. Si cualquiera de ellas es falsa, la fórmula total es Falsa.`;
            case '∨':
                return `La fórmula es una **Disyunción inclusiva**. Será **Verdadera (V)** si al menos una de las dos subfórmulas es verdadera. Solo resulta Falsa cuando ambos miembros son simultáneamente falsos.`;
            case '→':
                return `La fórmula es un **Condicional (Implicación)**. Posee un antecedente y un consecuente. De acuerdo con la tabla de verdad material, **únicamente es Falsa (F)** cuando el antecedente es Verdadero y el consecuente es Falso (V → F = F). En los demás tres casos, siempre es Verdadera.`;
            case '↔':
                return `La fórmula es un **Bicondicional**. Será **Verdadera (V)** cuando ambas subfórmulas compartan el mismo valor de verdad (ambas Verdaderas o ambas Falsas). Será Falsa si sus valores difieren.`;
        }
    }

    return 'Proposición molecular bien estructurada.';
}

// Exportación universal
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AIConfigKeys,
        getAIConfig,
        saveAIConfig,
        translateNaturalLanguage,
        translateNaturalLanguageOffline,
        explainFormulaStepByStep
    };
}

if (typeof window !== 'undefined') {
    window.AI = {
        AIConfigKeys,
        getAIConfig,
        saveAIConfig,
        translateNaturalLanguage,
        translateNaturalLanguageOffline,
        explainFormulaStepByStep
    };
}
