/**
 * TESTS - Suite de Pruebas Unitarias para Lógica Proposicional
 * Valida el Lexer, Parser, Precedencia, Asociatividad,
 * Funciones del Modo Inverso, Casos Inválidos con posición de error,
 * Sistema de Autenticación y Módulo de Inteligencia Artificial.
 * 
 * Se puede ejecutar directamente con:
 *   node tests.js
 * O ejecutarse interactivamente desde la interfaz web.
 */

// Polyfill de localStorage para Node.js si no existe
if (typeof localStorage === 'undefined') {
    const memoryStore = {};
    global.localStorage = {
        getItem: (k) => memoryStore[k] || null,
        setItem: (k, v) => { memoryStore[k] = String(v); },
        removeItem: (k) => { delete memoryStore[k]; },
        clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); }
    };
}

// Importaciones según entorno (Node.js o Navegador)
let _lexerMod, _parserMod, _astMod, _authMod, _aiMod, _dictMod;

if (typeof require !== 'undefined') {
    _lexerMod = require('./lexer.js');
    _astMod = require('./ast.js');
    _parserMod = require('./parser.js');
    _authMod = require('./auth.js');
    _aiMod = require('./ai.js');
    _dictMod = require('./dictionary.js');
} else {
    _lexerMod = {
        Lexer: window.Lexer,
        TokenType: window.TokenType,
        LexerError: window.LexerError
    };
    _astMod = {
        collectAtoms: window.collectAtoms,
        collectConnectives: window.collectConnectives,
        getMainConnective: window.getMainConnective,
        toFullyParenthesized: window.toFullyParenthesized,
        toCanonicalString: window.toCanonicalString,
        collectSubformulas: window.collectSubformulas,
        renderAsciiTree: window.renderAsciiTree
    };
    _parserMod = {
        Parser: window.Parser,
        ParseError: window.ParseError,
        validateAndParse: window.validateAndParse
    };
    _authMod = window.Auth;
    _aiMod = window.AI;
    _dictMod = window.PropositionDictionary;
}

/**
 * Runner de pruebas con aserciones enriquecidas
 */
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
        this.currentCategory = 'General';
    }

    category(name) {
        this.currentCategory = name;
    }

    test(name, fn) {
        this.tests.push({
            category: this.currentCategory,
            name,
            fn
        });
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Aserción fallida');
        }
    }

    assertEqual(actual, expected, message) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            throw new Error(`${message || 'Aserción de igualdad fallida'}\n  Esperado: ${expectedStr}\n  Obtenido: ${actualStr}`);
        }
    }

    run() {
        this.results = [];
        let passed = 0;
        let failed = 0;

        for (const t of this.tests) {
            const start = performance ? performance.now() : Date.now();
            try {
                t.fn();
                const duration = (performance ? performance.now() : Date.now()) - start;
                this.results.push({
                    category: t.category,
                    name: t.name,
                    passed: true,
                    duration: duration.toFixed(2),
                    error: null
                });
                passed++;
            } catch (err) {
                const duration = (performance ? performance.now() : Date.now()) - start;
                this.results.push({
                    category: t.category,
                    name: t.name,
                    passed: false,
                    duration: duration.toFixed(2),
                    error: err.message
                });
                failed++;
            }
        }

        return {
            total: this.tests.length,
            passed,
            failed,
            results: this.results
        };
    }
}

/**
 * Define y registra todas las pruebas unitarias
 */
function createTestSuite() {
    const runner = new TestRunner();

    // ========================================================
    // 1. PRUEBAS DEL ANALIZADOR LÉXICO (LEXER)
    // ========================================================
    runner.category('1. Analizador Léxico (Lexer)');

    runner.test('Reconoce proposiciones atómicas individuales y con subíndices', () => {
        const lexer = new _lexerMod.Lexer('p q r s t p1 q2');
        const tokens = lexer.tokenize();
        runner.assertEqual(tokens.map(t => t.type), [
            _lexerMod.TokenType.ATOM,
            _lexerMod.TokenType.ATOM,
            _lexerMod.TokenType.ATOM,
            _lexerMod.TokenType.ATOM,
            _lexerMod.TokenType.ATOM,
            _lexerMod.TokenType.ATOM,
            _lexerMod.TokenType.ATOM,
            _lexerMod.TokenType.EOF
        ]);
        runner.assertEqual(tokens.slice(0, -1).map(t => t.value), ['p', 'q', 'r', 's', 't', 'p1', 'q2']);
    });

    runner.test('Reconoce todos los símbolos de negación (¬, ~, !)', () => {
        const lexer = new _lexerMod.Lexer('¬ ~ !');
        const tokens = lexer.tokenize();
        runner.assertEqual(tokens.map(t => t.type), [
            _lexerMod.TokenType.NOT,
            _lexerMod.TokenType.NOT,
            _lexerMod.TokenType.NOT,
            _lexerMod.TokenType.EOF
        ]);
        runner.assertEqual(tokens.slice(0, -1).map(t => t.value), ['¬', '¬', '¬']);
    });

    runner.test('Reconoce todos los símbolos de conjunción (∧, &, &&)', () => {
        const lexer = new _lexerMod.Lexer('∧ & &&');
        const tokens = lexer.tokenize();
        runner.assertEqual(tokens.map(t => t.type), [
            _lexerMod.TokenType.AND,
            _lexerMod.TokenType.AND,
            _lexerMod.TokenType.AND,
            _lexerMod.TokenType.EOF
        ]);
        runner.assertEqual(tokens.slice(0, -1).map(t => t.value), ['∧', '∧', '∧']);
    });

    runner.test('Reconoce todos los símbolos de disyunción (∨, |, ||)', () => {
        const lexer = new _lexerMod.Lexer('∨ | ||');
        const tokens = lexer.tokenize();
        runner.assertEqual(tokens.map(t => t.type), [
            _lexerMod.TokenType.OR,
            _lexerMod.TokenType.OR,
            _lexerMod.TokenType.OR,
            _lexerMod.TokenType.EOF
        ]);
        runner.assertEqual(tokens.slice(0, -1).map(t => t.value), ['∨', '∨', '∨']);
    });

    runner.test('Reconoce condicional (→, ->, =>) y bicondicional (↔, <->, <=>)', () => {
        const lexer = new _lexerMod.Lexer('→ -> => ↔ <-> <=> ( )');
        const tokens = lexer.tokenize();
        runner.assertEqual(tokens.map(t => t.type), [
            _lexerMod.TokenType.IMPLIES,
            _lexerMod.TokenType.IMPLIES,
            _lexerMod.TokenType.IMPLIES,
            _lexerMod.TokenType.IFF,
            _lexerMod.TokenType.IFF,
            _lexerMod.TokenType.IFF,
            _lexerMod.TokenType.LPAREN,
            _lexerMod.TokenType.RPAREN,
            _lexerMod.TokenType.EOF
        ]);
    });

    runner.test('Registra correctamente las posiciones de inicio y fin de tokens', () => {
        const input = 'p -> q';
        const tokens = new _lexerMod.Lexer(input).tokenize();
        runner.assertEqual(tokens[0], { type: 'ATOM', value: 'p', raw: 'p', start: 0, end: 1 });
        runner.assertEqual(tokens[1], { type: 'IMPLIES', value: '→', raw: '->', start: 2, end: 4 });
        runner.assertEqual(tokens[2], { type: 'ATOM', value: 'q', raw: 'q', start: 5, end: 6 });
    });

    runner.test('Lanza LexerError con posición exacta para caracteres no permitidos', () => {
        let threw = false;
        try {
            new _lexerMod.Lexer('p # q').tokenize();
        } catch (e) {
            threw = true;
            runner.assert(e instanceof _lexerMod.LexerError, 'Debe ser LexerError');
            runner.assertEqual(e.position, 2, 'Posición del carácter #');
        }
        runner.assert(threw, 'Debió lanzar excepción para "#"');
    });

    // ========================================================
    // 2. PRUEBAS DEL ANALIZADOR SINTÁCTICO (PARSER) Y VALIDADOR
    // ========================================================
    runner.category('2. Analizador Sintáctico (Parser) y Validador FBF');

    runner.test('Valida proposición atómica simple: "p"', () => {
        const res = _parserMod.validateAndParse('p');
        runner.assert(res.isValid, 'Debe ser válida');
        runner.assertEqual(res.ast.type, 'ATOM');
        runner.assertEqual(res.ast.name, 'p');
    });

    runner.test('Valida negación simple y múltiple: "¬p", "¬¬q", "~~r"', () => {
        const res1 = _parserMod.validateAndParse('¬p');
        runner.assert(res1.isValid);
        runner.assertEqual(res1.ast.type, 'UNARY');

        const res2 = _parserMod.validateAndParse('¬¬q');
        runner.assert(res2.isValid);
        runner.assertEqual(res2.ast.type, 'UNARY');
        runner.assertEqual(res2.ast.operand.type, 'UNARY');

        const res3 = _parserMod.validateAndParse('~~r');
        runner.assert(res3.isValid);
    });

    runner.test('Valida fórmulas de ejemplo solicitadas en los requerimientos', () => {
        const ex1 = _parserMod.validateAndParse('((p ∧ q) → ¬r)');
        runner.assert(ex1.isValid, 'Ejemplo 1 debe ser válido');
        runner.assertEqual(ex1.ast.type, 'BINARY');
        runner.assertEqual(ex1.ast.operator, '→');

        const ex2 = _parserMod.validateAndParse('(p ∨ q) ↔ (r → s)');
        runner.assert(ex2.isValid, 'Ejemplo 2 debe ser válido');
        runner.assertEqual(ex2.ast.type, 'BINARY');
        runner.assertEqual(ex2.ast.operator, '↔');

        const ex3 = _parserMod.validateAndParse('¬(p ∧ q) ∨ r');
        runner.assert(ex3.isValid, 'Ejemplo 3 debe ser válido');
        runner.assertEqual(ex3.ast.type, 'BINARY');
        runner.assertEqual(ex3.ast.operator, '∨');
    });

    runner.test('Soporta operadores con alias: "p && q -> ~r" == "(p ∧ q) → ¬r"', () => {
        const res = _parserMod.validateAndParse('p && q -> ~r');
        runner.assert(res.isValid);
        runner.assertEqual(res.ast.operator, '→');
        runner.assertEqual(res.ast.left.operator, '∧');
        runner.assertEqual(res.ast.right.operator, '¬');
    });

    // ========================================================
    // 3. PRUEBAS DE PRECEDENCIA Y ASOCIATIVIDAD
    // ========================================================
    runner.category('3. Precedencia y Asociatividad');

    runner.test('Precedencia: ¬ tiene mayor precedencia que ∧ ("¬p ∧ q" == "(¬p) ∧ q")', () => {
        const res = _parserMod.validateAndParse('¬p ∧ q');
        runner.assert(res.isValid);
        runner.assertEqual(res.ast.type, 'BINARY');
        runner.assertEqual(res.ast.operator, '∧');
        runner.assertEqual(res.ast.left.type, 'UNARY');
        runner.assertEqual(res.ast.right.type, 'ATOM');
    });

    runner.test('Precedencia: ∧ tiene mayor precedencia que ∨ ("p ∨ q ∧ r" == "p ∨ (q ∧ r)")', () => {
        const res = _parserMod.validateAndParse('p ∨ q ∧ r');
        runner.assert(res.isValid);
        runner.assertEqual(res.ast.operator, '∨');
        runner.assertEqual(res.ast.left.name, 'p');
        runner.assertEqual(res.ast.right.operator, '∧');
    });

    runner.test('Precedencia: ∨ tiene mayor precedencia que → ("p → q ∨ r" == "p → (q ∨ r)")', () => {
        const res = _parserMod.validateAndParse('p → q ∨ r');
        runner.assert(res.isValid);
        runner.assertEqual(res.ast.operator, '→');
        runner.assertEqual(res.ast.left.name, 'p');
        runner.assertEqual(res.ast.right.operator, '∨');
    });

    runner.test('Precedencia: → tiene mayor precedencia que ↔ ("p ↔ q → r" == "p ↔ (q → r)")', () => {
        const res = _parserMod.validateAndParse('p ↔ q → r');
        runner.assert(res.isValid);
        runner.assertEqual(res.ast.operator, '↔');
        runner.assertEqual(res.ast.left.name, 'p');
        runner.assertEqual(res.ast.right.operator, '→');
    });

    runner.test('Asociatividad: ∧ y ∨ asocian a la IZQUIERDA ("p ∧ q ∧ r" == "(p ∧ q) ∧ r")', () => {
        const resAnd = _parserMod.validateAndParse('p ∧ q ∧ r');
        runner.assertEqual(resAnd.ast.operator, '∧');
        runner.assertEqual(resAnd.ast.left.operator, '∧', 'Hijo izquierdo es la subfórmula p ∧ q');
        runner.assertEqual(resAnd.ast.right.name, 'r');

        const resOr = _parserMod.validateAndParse('p ∨ q ∨ r');
        runner.assertEqual(resOr.ast.operator, '∨');
        runner.assertEqual(resOr.ast.left.operator, '∨', 'Hijo izquierdo es la subfórmula p ∨ q');
        runner.assertEqual(resOr.ast.right.name, 'r');
    });

    runner.test('Asociatividad: → asocia a la DERECHA ("p → q → r" == "p → (q → r)")', () => {
        const res = _parserMod.validateAndParse('p → q → r');
        runner.assertEqual(res.ast.operator, '→');
        runner.assertEqual(res.ast.left.name, 'p');
        runner.assertEqual(res.ast.right.operator, '→', 'Hijo derecho es la subfórmula q → r');
        runner.assertEqual(res.ast.right.left.name, 'q');
        runner.assertEqual(res.ast.right.right.name, 'r');
    });

    runner.test('Asociatividad: ↔ asocia a la IZQUIERDA ("p ↔ q ↔ r" == "(p ↔ q) ↔ r")', () => {
        const res = _parserMod.validateAndParse('p ↔ q ↔ r');
        runner.assertEqual(res.ast.operator, '↔');
        runner.assertEqual(res.ast.left.operator, '↔', 'Hijo izquierdo es la subfórmula p ↔ q');
        runner.assertEqual(res.ast.right.name, 'r');
    });

    runner.test('Los paréntesis modifican la precedencia: "(p ∨ q) ∧ r" vs "p ∨ (q ∧ r)"', () => {
        const res1 = _parserMod.validateAndParse('(p ∨ q) ∧ r');
        runner.assertEqual(res1.ast.operator, '∧');
        runner.assertEqual(res1.ast.left.operator, '∨');

        const res2 = _parserMod.validateAndParse('p ∨ (q ∧ r)');
        runner.assertEqual(res2.ast.operator, '∨');
        runner.assertEqual(res2.ast.right.operator, '∧');
    });

    // ========================================================
    // 4. MODO INVERSO: EXTRACCIÓN Y RECONSTRUCCIÓN
    // ========================================================
    runner.category('4. Modo Inverso (Análisis y Descomposición)');

    runner.test('Identifica proposiciones atómicas encontradas (únicas y ordenadas)', () => {
        const res = _parserMod.validateAndParse('((p ∧ q) → (¬r ∨ p))');
        const atoms = _astMod.collectAtoms(res.ast);
        runner.assertEqual(atoms, ['p', 'q', 'r']);
    });

    runner.test('Identifica conectivos lógicos usados y frecuencias', () => {
        const res = _parserMod.validateAndParse('((p ∧ q) → ¬r)');
        const conns = _astMod.collectConnectives(res.ast);
        runner.assert(conns.list.includes('∧'));
        runner.assert(conns.list.includes('→'));
        runner.assert(conns.list.includes('¬'));
        runner.assertEqual(conns.counts['→'], 1);
        runner.assertEqual(conns.counts['∧'], 1);
        runner.assertEqual(conns.counts['¬'], 1);
    });

    runner.test('Identifica el conectivo principal correctamente', () => {
        const r1 = _parserMod.validateAndParse('((p ∧ q) → ¬r)');
        runner.assertEqual(_astMod.getMainConnective(r1.ast).symbol, '→');
        runner.assertEqual(_astMod.getMainConnective(r1.ast).type, 'BINARY');

        const r2 = _parserMod.validateAndParse('¬(p ∧ q)');
        runner.assertEqual(_astMod.getMainConnective(r2.ast).symbol, '¬');
        runner.assertEqual(_astMod.getMainConnective(r2.ast).type, 'UNARY');

        const r3 = _parserMod.validateAndParse('p');
        runner.assertEqual(_astMod.getMainConnective(r3.ast).symbol, null);
        runner.assertEqual(_astMod.getMainConnective(r3.ast).type, 'ATOM');
    });

    runner.test('Genera lista completa de subfórmulas', () => {
        const res = _parserMod.validateAndParse('¬(p ∧ q) ∨ r');
        const subformulas = _astMod.collectSubformulas(res.ast);
        const formulaStrings = subformulas.map(s => s.formula);

        runner.assert(formulaStrings.includes('p'), 'Contiene subfórmula p');
        runner.assert(formulaStrings.includes('q'), 'Contiene subfórmula q');
        runner.assert(formulaStrings.includes('r'), 'Contiene subfórmula r');
        runner.assert(formulaStrings.includes('p ∧ q'), 'Contiene subfórmula p ∧ q');
        runner.assert(formulaStrings.includes('¬(p ∧ q)'), 'Contiene subfórmula ¬(p ∧ q)');
        runner.assert(formulaStrings.includes('¬(p ∧ q) ∨ r'), 'Contiene la fórmula completa');
    });

    runner.test('Reconstruye la FBF con paréntesis explícitos en cada operación', () => {
        const res1 = _parserMod.validateAndParse('p ∧ q → ¬r');
        const fully1 = _astMod.toFullyParenthesized(res1.ast);
        runner.assertEqual(fully1, '((p ∧ q) → (¬r))');

        const res2 = _parserMod.validateAndParse('p ∨ q ↔ r → s');
        const fully2 = _astMod.toFullyParenthesized(res2.ast);
        runner.assertEqual(fully2, '((p ∨ q) ↔ (r → s))');

        const res3 = _parserMod.validateAndParse('¬¬p');
        const fully3 = _astMod.toFullyParenthesized(res3.ast);
        runner.assertEqual(fully3, '(¬(¬p))');
    });

    runner.test('Genera árbol sintáctico textual (ASCII)', () => {
        const res = _parserMod.validateAndParse('p ∧ q');
        const tree = _astMod.renderAsciiTree(res.ast);
        runner.assert(tree.includes('∧'), 'Árbol contiene operador ∧');
        runner.assert(tree.includes('p [Atómica]'), 'Árbol contiene p');
        runner.assert(tree.includes('q [Atómica]'), 'Árbol contiene q');
    });

    // ========================================================
    // 5. CASOS INVÁLIDOS Y PRECISIÓN DE ERRORES
    // ========================================================
    runner.category('5. Detección de Errores y Localización');

    runner.test('Detecta fórmula vacía o solo espacios', () => {
        const res1 = _parserMod.validateAndParse('');
        runner.assert(!res1.isValid);
        runner.assert(res1.error.message.includes('vacía'));

        const res2 = _parserMod.validateAndParse('   ');
        runner.assert(!res2.isValid);
    });

    runner.test('Detecta conectivo binario sin operando derecho ("p ∧")', () => {
        const res = _parserMod.validateAndParse('p ∧');
        runner.assert(!res.isValid);
        runner.assert(res.error.position >= 2, 'Indica posición al final');
    });

    runner.test('Detecta conectivo binario al inicio sin operando izquierdo ("→ p")', () => {
        const res = _parserMod.validateAndParse('→ p');
        runner.assert(!res.isValid);
        runner.assertEqual(res.error.position, 0, 'Indica posición 0');
    });

    runner.test('Detecta operadores binarios consecutivos ("p ∧ ∨ q")', () => {
        const res = _parserMod.validateAndParse('p ∧ ∨ q');
        runner.assert(!res.isValid);
        runner.assert(res.error.message.includes('inesperado'));
    });

    runner.test('Detecta proposiciones consecutivas sin conectivo ("p q")', () => {
        const res = _parserMod.validateAndParse('p q');
        runner.assert(!res.isValid);
        runner.assertEqual(res.error.position, 2);
        runner.assert(res.error.message.includes('sin un conectivo'));
    });

    runner.test('Detecta paréntesis no cerrado ("(p ∧ q")', () => {
        const res = _parserMod.validateAndParse('(p ∧ q');
        runner.assert(!res.isValid);
        runner.assertEqual(res.error.position, 0);
        runner.assert(res.error.message.includes('no fue cerrado'));
    });

    runner.test('Detecta paréntesis de cierre inesperado ("p ∧ q)")', () => {
        const res = _parserMod.validateAndParse('p ∧ q)');
        runner.assert(!res.isValid);
        runner.assertEqual(res.error.position, 5);
        runner.assert(res.error.message.includes('sobrante') || res.error.message.includes('inesperado'));
    });

    runner.test('Detecta paréntesis vacíos ("()")', () => {
        const res = _parserMod.validateAndParse('()');
        runner.assert(!res.isValid);
        runner.assert(res.error.message.includes('vacíos'));
    });

    runner.test('Detecta flecha o conectivo incompleto ("p - q")', () => {
        const res = _parserMod.validateAndParse('p - q');
        runner.assert(!res.isValid);
        runner.assertEqual(res.error.position, 2);
        runner.assert(res.error.message.includes("->"));
    });

    // ========================================================
    // 6. SISTEMA DE AUTENTICACIÓN Y LOCALSTORAGE (AUTH)
    // ========================================================
    runner.category('6. Sistema de Autenticación y Perfiles');

    runner.test('Registra e inicia sesión de nuevo usuario correctamente', () => {
        const testUser = 'user_test_' + Date.now();
        const regRes = _authMod.registerUser(testUser, 'secreto123');
        runner.assert(regRes.success, 'El registro debe ser exitoso');

        const loginRes = _authMod.loginUser(testUser, 'secreto123');
        runner.assert(loginRes.success, 'El login debe ser exitoso');
        runner.assertEqual(loginRes.session.username, testUser);
        runner.assertEqual(loginRes.session.role, 'user');

        const failRes = _authMod.loginUser(testUser, 'pass_incorrecta');
        runner.assert(!failRes.success, 'Debe fallar con contraseña errónea');
    });

    runner.test('Valida login de administrador con contraseña maestra por defecto', () => {
        const adminRes = _authMod.loginAdmin(_authMod.DEFAULT_ADMIN_PASS);
        runner.assert(adminRes.success, 'Debe iniciar sesión como admin');
        runner.assertEqual(adminRes.session.role, 'admin');

        const badAdmin = _authMod.loginAdmin('clave_falsa');
        runner.assert(!badAdmin.success, 'Debe rechazar clave incorrecta');
    });

    runner.test('Permite al administrador modificar contraseñas y eliminar usuarios', () => {
        const uTemp = 'user_temp_' + Date.now();
        const reg = _authMod.registerUser(uTemp, 'pass_antigua');
        runner.assert(reg.success);

        const changeOk = _authMod.changeUserPassword(reg.user.id, 'nueva_pass_456');
        runner.assert(changeOk, 'Debe cambiar la contraseña');

        const loginNew = _authMod.loginUser(uTemp, 'nueva_pass_456');
        runner.assert(loginNew.success, 'Debe poder ingresar con la nueva contraseña');

        const delOk = _authMod.deleteUser(reg.user.id);
        runner.assert(delOk, 'Debe eliminar el usuario');
        const loginDeleted = _authMod.loginUser(uTemp, 'nueva_pass_456');
        runner.assert(!loginDeleted.success, 'El usuario eliminado ya no debe poder ingresar');
    });

    runner.test('Registra y acumula estadísticas de fórmulas y conectivos usados', () => {
        const initialStats = _authMod.getAppStats();
        const initialCount = initialStats.formulasBuilt || 0;

        _authMod.trackFormulaBuilt(['∧', '→']);
        const updated = _authMod.getAppStats();
        runner.assertEqual(updated.formulasBuilt, initialCount + 1);
        runner.assert(updated.connectivesCount['∧'] > 0);
        runner.assert(updated.connectivesCount['→'] > 0);
    });

    // ========================================================
    // 7. MÓDULO DE INTELIGENCIA ARTIFICIAL (AI ASSISTANT)
    // ========================================================
    runner.category('7. Módulo de Inteligencia Artificial (IA)');

    runner.test('Traduce frase condicional con negación: "Si llueve y no tengo paraguas, entonces me mojo"', () => {
        const res = _aiMod.translateNaturalLanguageOffline('Si llueve y no tengo paraguas, entonces me mojo');
        runner.assert(res.success, 'La traducción debe ser exitosa');
        // Debe generar una FBF válida
        const val = _parserMod.validateAndParse(res.formula);
        runner.assert(val.isValid, 'La fórmula generada debe ser una FBF válida: ' + res.formula);
        runner.assert(res.formula.includes('→'), 'Debe contener condicional');
        runner.assert(res.formula.includes('¬'), 'Debe contener negación');
        runner.assertEqual(res.atoms.length, 3, 'Debe identificar 3 proposiciones atómicas');
    });

    runner.test('Traduce conjunción y disyunción: "Estudio o trabajo, pero no me rindo"', () => {
        const res = _aiMod.translateNaturalLanguageOffline('Estudio o trabajo, pero no me rindo');
        runner.assert(res.success);
        const val = _parserMod.validateAndParse(res.formula);
        runner.assert(val.isValid, 'FBF válida: ' + res.formula);
        runner.assert(res.formula.includes('∨'), 'Debe contener disyunción');
        runner.assert(res.formula.includes('∧'), 'Debe contener conjunción');
        runner.assert(res.formula.includes('¬'), 'Debe contener negación');
    });

    runner.test('Traduce bicondicional: "Iré al cine si y solo si termino la tarea"', () => {
        const res = _aiMod.translateNaturalLanguageOffline('Iré al cine si y solo si termino la tarea');
        runner.assert(res.success);
        const val = _parserMod.validateAndParse(res.formula);
        runner.assert(val.isValid, 'FBF válida: ' + res.formula);
        runner.assert(res.formula.includes('↔'), 'Debe contener bicondicional');
    });

    runner.test('Explicador paso a paso descompone FBF con lectura verbal y precedencia', () => {
        const res = _aiMod.explainFormulaStepByStep('(p ∧ q) → ¬r');
        runner.assert(res.success, 'Debe explicar con éxito');
        runner.assert(res.verbalReading.length > 5, 'Debe incluir lectura verbal');
        runner.assertEqual(res.mainConnectiveInfo.symbol, '→', 'Conectivo principal debe ser →');
        runner.assert(res.precedenceSteps.length >= 2, 'Debe tener pasos de precedencia');
        runner.assert(res.semanticSummary.includes('Condicional'), 'Debe resumir el significado del condicional');
    });

    // ========================================================
    // 8. DICCIONARIO DE PROPOSICIONES (GLOSARIO SEMÁNTICO)
    // ========================================================
    runner.category('8. Diccionario de Proposiciones (Glosario Semántico)');

    runner.test('Valida que la letra proposicional sea una sola letra a-z', () => {
        runner.assert(_dictMod.isValidLetter('p'), 'p debe ser válida');
        runner.assert(_dictMod.isValidLetter('q'), 'q debe ser válida');
        runner.assert(_dictMod.isValidLetter('P'), 'P debe ser válida');
        runner.assert(!_dictMod.isValidLetter('pq'), 'pq no debe ser válida');
        runner.assert(!_dictMod.isValidLetter('1'), '1 no debe ser válida');
        runner.assert(!_dictMod.isValidLetter(''), 'vacío no debe ser válido');
        runner.assert(!_dictMod.isValidLetter(null), 'null no debe ser válido');
    });

    runner.test('Guarda y recupera definiciones en localStorage (clave propositionDictionary)', () => {
        _dictMod.setDefinition('p', 'Cuando quiere comer');
        _dictMod.setDefinition('q', 'manzanas');

        const dict = _dictMod.getDictionary();
        runner.assertEqual(dict['p'], 'Cuando quiere comer', 'Definición de p debe coincidir');
        runner.assertEqual(dict['q'], 'manzanas', 'Definición de q debe coincidir');

        const raw = localStorage.getItem('propositionDictionary');
        runner.assert(raw !== null, 'Debe persistir en localStorage bajo propositionDictionary');
        const parsed = JSON.parse(raw);
        runner.assertEqual(parsed['p'], 'Cuando quiere comer');
    });

    runner.test('Sobrescribe definición existente tras actualización', () => {
        _dictMod.setDefinition('p', 'Primera versión');
        runner.assertEqual(_dictMod.getDictionary()['p'], 'Primera versión');
        _dictMod.setDefinition('p', 'Cuando quiere comer');
        runner.assertEqual(_dictMod.getDictionary()['p'], 'Cuando quiere comer');
    });

    runner.test('Rechaza guardar con letra inválida o significado vacío', () => {
        const res1 = _dictMod.setDefinition('123', 'Significado');
        runner.assert(!res1.success, 'Debe fallar con letra inválida');

        const res2 = _dictMod.setDefinition('p', '');
        runner.assert(!res2.success, 'Debe fallar con significado vacío');
    });

    runner.test('Elimina una definición del diccionario por letra', () => {
        _dictMod.setDefinition('z', 'dormir profundamente');
        runner.assert(_dictMod.getDictionary()['z'] !== undefined);
        const removed = _dictMod.removeDefinition('z');
        runner.assert(removed, 'removeDefinition debe retornar true');
        runner.assert(_dictMod.getDictionary()['z'] === undefined, 'z no debe existir tras ser eliminada');
    });

    runner.test('Traduce fórmula FBF reemplazando proposiciones y conectivos al español', () => {
        _dictMod.setDefinition('p', 'Cuando quiere comer');
        _dictMod.setDefinition('q', 'manzanas');

        // Conjunción ∧ -> Y
        const tr1 = _dictMod.translateFormulaToSpanish('p ∧ q');
        runner.assertEqual(tr1, '"Cuando quiere comer" Y "manzanas"');

        // Disyunción ∨ -> O
        const tr2 = _dictMod.translateFormulaToSpanish('p ∨ q');
        runner.assertEqual(tr2, '"Cuando quiere comer" O "manzanas"');

        // Negación ¬ -> NO
        const tr3 = _dictMod.translateFormulaToSpanish('¬p');
        runner.assertEqual(tr3, 'NO "Cuando quiere comer"');

        // Condicional → -> SI ... ENTONCES ...
        const tr4 = _dictMod.translateFormulaToSpanish('p → q');
        runner.assertEqual(tr4, 'SI "Cuando quiere comer" ENTONCES "manzanas"');

        // Bicondicional ↔ -> SI Y SOLO SI
        const tr5 = _dictMod.translateFormulaToSpanish('p ↔ q');
        runner.assertEqual(tr5, '"Cuando quiere comer" SI Y SOLO SI "manzanas"');
    });

    runner.test('Mantiene letras originales si no están definidas en el diccionario', () => {
        _dictMod.setDefinition('p', 'Cuando quiere comer');
        _dictMod.removeDefinition('r');

        const tr = _dictMod.translateFormulaToSpanish('p ∧ r');
        runner.assertEqual(tr, '"Cuando quiere comer" Y r');
    });

    runner.test('Vacía completamente el diccionario con clearDictionary', () => {
        _dictMod.setDefinition('p', 'Comer');
        _dictMod.clearDictionary();
        const dict = _dictMod.getDictionary();
        runner.assertEqual(Object.keys(dict).length, 0, 'Diccionario debe quedar vacío');

        // Restaurar valores por defecto para uso posterior
        _dictMod.setDefinition('p', 'Cuando quiere comer');
        _dictMod.setDefinition('q', 'manzanas');
        _dictMod.setDefinition('r', 'tiene hambre');
    });

    runner.test('Integración con el Explicador IA incluye traducción semántica del diccionario', () => {
        _dictMod.setDefinition('p', 'Cuando quiere comer');
        _dictMod.setDefinition('q', 'manzanas');

        const res = _aiMod.explainFormulaStepByStep('p ∧ q');
        runner.assert(res.success);
        runner.assert(res.dictionaryTranslation !== undefined && res.dictionaryTranslation !== '');
        runner.assert(res.dictionaryTranslation.includes('Cuando quiere comer'));
        runner.assert(res.dictionaryTranslation.includes('manzanas'));
    });

    return runner;
}

// Ejecución si se llama directamente con Node.js
if (typeof require !== 'undefined' && require.main === module) {
    console.log('====================================================');
    console.log('  EJECUTANDO SUITE DE PRUEBAS UNITARIAS (FBF)      ');
    console.log('====================================================\n');

    const runner = createTestSuite();
    const summary = runner.run();

    let currentCat = '';
    summary.results.forEach(r => {
        if (r.category !== currentCat) {
            currentCat = r.category;
            console.log(`\n📌 [${currentCat}]`);
        }
        if (r.passed) {
            console.log(`  ✅ PASÓ: ${r.name} (${r.duration}ms)`);
        } else {
            console.log(`  ❌ FALLÓ: ${r.name} (${r.duration}ms)`);
            console.log(`     Error: ${r.error}`);
        }
    });

    console.log('\n----------------------------------------------------');
    console.log(`RESUMEN: Total: ${summary.total} | Pasadas: ${summary.passed} | Falladas: ${summary.failed}`);
    console.log('----------------------------------------------------');

    if (summary.failed > 0) {
        process.exit(1);
    } else {
        console.log('🎉 ¡Todas las pruebas unitarias pasaron exitosamente!\n');
    }
}

// Exportación universal
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TestRunner,
        createTestSuite
    };
}
if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
    window.createTestSuite = createTestSuite;
}
