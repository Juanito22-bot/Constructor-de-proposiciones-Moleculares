/**
 * PARSER - Analizador Sintáctico y Validador de FBF
 * Implementa descenso recursivo con precedencia y asociatividad estrictas:
 * 1. ¬ (Negación): mayor precedencia, prefijo, asociatividad a la derecha.
 * 2. ∧ (Conjunción): asociatividad a la izquierda.
 * 3. ∨ (Disyunción): asociatividad a la izquierda.
 * 4. → (Condicional): asociatividad a la derecha (p → q → r  ==  p → (q → r)).
 * 5. ↔ (Bicondicional): asociatividad a la izquierda (p ↔ q ↔ r  ==  (p ↔ q) ↔ r).
 * Paréntesis: modifican la precedencia y agrupan expresiones.
 */

// Si estamos en Node.js, requerimos las dependencias
let _TokenType, _Lexer, _LexerError;
let _AtomNode, _UnaryNode, _BinaryNode;

if (typeof require !== 'undefined') {
    const lexerModule = require('./lexer.js');
    _TokenType = lexerModule.TokenType;
    _Lexer = lexerModule.Lexer;
    _LexerError = lexerModule.LexerError;

    const astModule = require('./ast.js');
    _AtomNode = astModule.AtomNode;
    _UnaryNode = astModule.UnaryNode;
    _BinaryNode = astModule.BinaryNode;
} else {
    _TokenType = window.TokenType;
    _Lexer = window.Lexer;
    _LexerError = window.LexerError;
    _AtomNode = window.AtomNode;
    _UnaryNode = window.UnaryNode;
    _BinaryNode = window.BinaryNode;
}

/**
 * Error Sintáctico enriquecido con posición y sugerencia didáctica
 */
class ParseError extends Error {
    /**
     * @param {string} message Mensaje de error descriptivo
     * @param {number} position Posición 0-basada en la cadena original
     * @param {number} length Longitud del fragmento causante
     * @param {string} suggestion Sugerencia para corregirlo
     */
    constructor(message, position, length = 1, suggestion = '') {
        super(message);
        this.name = 'ParseError';
        this.position = position;
        this.length = length;
        this.suggestion = suggestion;
    }
}

/**
 * Analizador Sintáctico para Fórmulas Bien Formadas (FBF)
 */
class Parser {
    /**
     * @param {Token[]} tokens Lista de tokens emitida por Lexer
     * @param {string} rawInput Cadena original para contexto de errores
     */
    constructor(tokens, rawInput = '') {
        this.tokens = tokens || [];
        this.rawInput = rawInput;
        this.current = 0;
    }

    /**
     * Retorna el token actual sin avanzar
     */
    peek() {
        return this.tokens[this.current];
    }

    /**
     * Retorna el token anterior
     */
    previous() {
        return this.tokens[this.current - 1];
    }

    /**
     * Verifica si el token actual es del tipo dado
     * @param {string} type
     */
    check(type) {
        if (this.isAtEnd()) return type === _TokenType.EOF;
        return this.peek().type === type;
    }

    /**
     * Avanza si el token actual coincide con alguno de los tipos dados
     * @param  {...string} types
     * @returns {boolean}
     */
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    /**
     * Avanza al siguiente token
     * @returns {Token}
     */
    advance() {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    /**
     * Verifica si se llegó al token EOF
     */
    isAtEnd() {
        return this.peek().type === _TokenType.EOF;
    }

    /**
     * Método principal para parsear la fórmula completa
     * @returns {AtomNode|UnaryNode|BinaryNode} AST raíz
     */
    parse() {
        // Verificar si la entrada está completamente vacía
        if (this.tokens.length === 0 || (this.tokens.length === 1 && this.tokens[0].type === _TokenType.EOF)) {
            throw new ParseError(
                'La fórmula está vacía. Ingrese una proposición atómica (ej: p, q, r) o una expresión lógica.',
                0,
                1,
                'Comience escribiendo una proposición como "p" o "(p ∧ q)".'
            );
        }

        const ast = this.parseBiconditional();

        // Si después de parsear la expresión completa aún quedan tokens antes de EOF
        if (!this.isAtEnd()) {
            const extraToken = this.peek();

            if (extraToken.type === _TokenType.ATOM) {
                throw new ParseError(
                    `Se encontró la proposición '${extraToken.raw}' en la posición ${extraToken.start + 1} sin un conectivo previo.`,
                    extraToken.start,
                    extraToken.raw.length,
                    '¿Olvidaste un conectivo lógico (∧, ∨, →, ↔) entre proposiciones?'
                );
            }

            if (extraToken.type === _TokenType.LPAREN) {
                throw new ParseError(
                    `Paréntesis de apertura '(' inesperado en la posición ${extraToken.start + 1}.`,
                    extraToken.start,
                    1,
                    'Inserte un conectivo lógico antes del paréntesis.'
                );
            }

            if (extraToken.type === _TokenType.RPAREN) {
                throw new ParseError(
                    `Paréntesis de cierre ')' sobrante en la posición ${extraToken.start + 1} sin apertura correspondiente.`,
                    extraToken.start,
                    1,
                    'Elimine el paréntesis de cierre o agregue un "(" al principio.'
                );
            }

            throw new ParseError(
                `Elemento inesperado '${extraToken.raw}' en la posición ${extraToken.start + 1}.`,
                extraToken.start,
                extraToken.raw.length,
                'Revise la sintaxis de la fórmula.'
            );
        }

        return ast;
    }

    /**
     * Nivel 1: Bicondicional (↔)
     * Menor precedencia. Asociatividad a la IZQUIERDA: p ↔ q ↔ r == (p ↔ q) ↔ r
     */
    parseBiconditional() {
        let left = this.parseConditional();

        while (this.match(_TokenType.IFF)) {
            const opToken = this.previous();
            const right = this.parseConditional();
            left = new _BinaryNode('↔', left, right, left.start, right.end);
        }

        return left;
    }

    /**
     * Nivel 2: Condicional (→)
     * Precedencia intermedia. Asociatividad a la DERECHA: p → q → r == p → (q → r)
     */
    parseConditional() {
        const left = this.parseOr();

        if (this.match(_TokenType.IMPLIES)) {
            const opToken = this.previous();
            // LLamada recursiva a parseConditional para asociatividad a la derecha
            const right = this.parseConditional();
            return new _BinaryNode('→', left, right, left.start, right.end);
        }

        return left;
    }

    /**
     * Nivel 3: Disyunción (∨)
     * Precedencia intermedia-alta. Asociatividad a la IZQUIERDA: p ∨ q ∨ r == (p ∨ q) ∨ r
     */
    parseOr() {
        let left = this.parseAnd();

        while (this.match(_TokenType.OR)) {
            const opToken = this.previous();
            const right = this.parseAnd();
            left = new _BinaryNode('∨', left, right, left.start, right.end);
        }

        return left;
    }

    /**
     * Nivel 4: Conjunción (∧)
     * Precedencia alta. Asociatividad a la IZQUIERDA: p ∧ q ∧ r == (p ∧ q) ∧ r
     */
    parseAnd() {
        let left = this.parseNot();

        while (this.match(_TokenType.AND)) {
            const opToken = this.previous();
            const right = this.parseNot();
            left = new _BinaryNode('∧', left, right, left.start, right.end);
        }

        return left;
    }

    /**
     * Nivel 5: Negación (¬)
     * Mayor precedencia. Operador unario prefijo, asociatividad a la derecha: ¬¬p == ¬(¬p)
     */
    parseNot() {
        if (this.match(_TokenType.NOT)) {
            const opToken = this.previous();
            const operand = this.parseNot(); // Permite negaciones consecutivas: ¬¬p, ¬~p, etc.
            return new _UnaryNode('¬', operand, opToken.start, operand.end);
        }

        return this.parsePrimary();
    }

    /**
     * Nivel Primario: Proposiciones Atómicas o Expresiones entre Paréntesis
     */
    parsePrimary() {
        // Caso 1: Proposición Atómica
        if (this.match(_TokenType.ATOM)) {
            const tok = this.previous();
            return new _AtomNode(tok.value, tok.start, tok.end);
        }

        // Caso 2: Paréntesis de Apertura
        if (this.match(_TokenType.LPAREN)) {
            const lparen = this.previous();

            // Verificar si hay paréntesis vacíos ()
            if (this.check(_TokenType.RPAREN)) {
                const rparen = this.peek();
                throw new ParseError(
                    `Paréntesis vacíos '()' en la posición ${lparen.start + 1}.`,
                    lparen.start,
                    2,
                    'Debe colocar una fórmula bien formada dentro de los paréntesis.'
                );
            }

            // Parsear subexpresión comenzando desde el nivel de menor precedencia (Bicondicional)
            const expr = this.parseBiconditional();

            // Esperar paréntesis de cierre
            if (!this.match(_TokenType.RPAREN)) {
                throw new ParseError(
                    `Paréntesis de apertura '(' en la posición ${lparen.start + 1} no fue cerrado.`,
                    lparen.start,
                    1,
                    'Falta un paréntesis de cierre ")" correspondiente.'
                );
            }

            const rparen = this.previous();
            // Actualizar límites del nodo si es necesario
            expr.start = lparen.start;
            expr.end = rparen.end;
            return expr;
        }

        // Manejo específico y didáctico de errores de sintaxis
        const curr = this.peek();

        // Si se encuentra un conectivo binario inesperado al inicio o consecutivo
        if (curr.type === _TokenType.AND || curr.type === _TokenType.OR ||
            curr.type === _TokenType.IMPLIES || curr.type === _TokenType.IFF) {
            throw new ParseError(
                `Operador binario '${curr.raw}' inesperado en la posición ${curr.start + 1}.`,
                curr.start,
                curr.raw.length,
                'Un conectivo binario requiere una proposición o expresión a su izquierda y a su derecha.'
            );
        }

        // Si se encuentra un paréntesis de cierre sin apertura
        if (curr.type === _TokenType.RPAREN) {
            throw new ParseError(
                `Paréntesis de cierre ')' inesperado en la posición ${curr.start + 1} sin apertura correspondiente.`,
                curr.start,
                1,
                'Elimine este paréntesis o añada un "(" previamente.'
            );
        }

        // Si la fórmula finaliza abruptamente
        if (curr.type === _TokenType.EOF) {
            const prevToken = this.current > 0 ? this.tokens[this.current - 1] : null;
            const pos = prevToken ? prevToken.end : 0;
            throw new ParseError(
                `Fórmula incompleta al final (posición ${pos + 1}). Se esperaba una proposición atómica, '¬' o '('.`,
                pos,
                1,
                'Complete la fórmula con una proposición o cierre la expresión.'
            );
        }

        throw new ParseError(
            `Símbolo inesperado '${curr.raw}' en la posición ${curr.start + 1}.`,
            curr.start,
            curr.raw.length,
            'Se esperaba una proposición atómica (ej: p, q, r), "¬" o "(". '
        );
    }
}

/**
 * Función de alto nivel para validar y parsear cualquier cadena lógica.
 * Conecta el Lexer y el Parser y captura cualquier error léxico o sintáctico.
 * 
 * @param {string} formulaStr Cadena con la fórmula
 * @returns {{
 *   isValid: boolean,
 *   ast: AtomNode|UnaryNode|BinaryNode|null,
 *   tokens: Token[],
 *   error: { message: string, position: number, length: number, suggestion: string } | null
 * }}
 */
function validateAndParse(formulaStr) {
    if (typeof formulaStr !== 'string') {
        return {
            isValid: false,
            ast: null,
            tokens: [],
            error: {
                message: 'La entrada debe ser una cadena de texto.',
                position: 0,
                length: 1,
                suggestion: ''
            }
        };
    }

    try {
        const lexer = new _Lexer(formulaStr);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, formulaStr);
        const ast = parser.parse();

        return {
            isValid: true,
            ast: ast,
            tokens: tokens,
            error: null
        };
    } catch (err) {
        if (err instanceof _LexerError || err instanceof ParseError) {
            return {
                isValid: false,
                ast: null,
                tokens: [],
                error: {
                    message: err.message,
                    position: err.position,
                    length: err.length || 1,
                    suggestion: err.suggestion || ''
                }
            };
        }

        // Otros errores inesperados
        return {
            isValid: false,
            ast: null,
            tokens: [],
            error: {
                message: `Error al procesar la fórmula: ${err.message}`,
                position: 0,
                length: 1,
                suggestion: ''
            }
        };
    }
}

// Exportación universal (Navegador y Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ParseError,
        Parser,
        validateAndParse
    };
}
if (typeof window !== 'undefined') {
    window.ParseError = ParseError;
    window.Parser = Parser;
    window.validateAndParse = validateAndParse;
}
