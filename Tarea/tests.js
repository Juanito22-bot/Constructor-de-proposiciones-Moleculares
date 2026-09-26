/**
 * TESTS - Suite de Pruebas Unitarias para Lógica Proposicional
 * Valida el Lexer, Parser, Precedencia, Asociatividad,
 * Funciones del Modo Inverso y Casos Inválidos con posición de error.
 * 
 * Se puede ejecutar directamente con:
 *   node tests.js
 * O ejecutarse interactivamente desde la interfaz web.
 */

// Importaciones según entorno (Node.js o Navegador)
let _lexerMod, _parserMod, _astMod;

if (typeof require !== 'undefined') {
    _lexerMod = require('./lexer.js');
    _astMod = require('./ast.js');
    _parserMod = require('./parser.js');
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
        // Ejemplo 1: ((p ∧ q) → ¬r)
        const ex1 = _parserMod.validateAndParse('((p ∧ q) → ¬r)');
        runner.assert(ex1.isValid, 'Ejemplo 1 debe ser válido');
        runner.assertEqual(ex1.ast.type, 'BINARY');
        runner.assertEqual(ex1.ast.operator, '→');

        // Ejemplo 2: (p ∨ q) ↔ (r → s)
        const ex2 = _parserMod.validateAndParse('(p ∨ q) ↔ (r → s)');
        runner.assert(ex2.isValid, 'Ejemplo 2 debe ser válido');
        runner.assertEqual(ex2.ast.type, 'BINARY');
        runner.assertEqual(ex2.ast.operator, '↔');

        // Ejemplo 3: ¬(p ∧ q) ∨ r
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
        // Binario: condicional
        const r1 = _parserMod.validateAndParse('((p ∧ q) → ¬r)');
        runner.assertEqual(_astMod.getMainConnective(r1.ast).symbol, '→');
        runner.assertEqual(_astMod.getMainConnective(r1.ast).type, 'BINARY');

        // Unario: negación
        const r2 = _parserMod.validateAndParse('¬(p ∧ q)');
        runner.assertEqual(_astMod.getMainConnective(r2.ast).symbol, '¬');
        runner.assertEqual(_astMod.getMainConnective(r2.ast).type, 'UNARY');

        // Atómica: sin conectivo
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
