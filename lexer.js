/**
 * LEXER - Analizador Léxico para Lógica Proposicional
 * Reconoce proposiciones atómicas, conectivos lógicos en múltiples formatos,
 * paréntesis y espacios en blanco, manteniendo control exacto de posiciones.
 */

// Tipos de Tokens reconocidos
const TokenType = {
    ATOM: 'ATOM',         // Proposiciones atómicas: p, q, r, s, t, etc.
    NOT: 'NOT',           // Negación: ¬, ~, !
    AND: 'AND',           // Conjunción: ∧, &, &&
    OR: 'OR',             // Disyunción: ∨, |, ||
    IMPLIES: 'IMPLIES',   // Condicional: →, ->, =>
    IFF: 'IFF',           // Bicondicional: ↔, <->, <=>
    LPAREN: 'LPAREN',     // Paréntesis de apertura: (
    RPAREN: 'RPAREN',     // Paréntesis de cierre: )
    EOF: 'EOF'            // Fin de la cadena
};

// Símbolos estándar canónicos
const CanonicalSymbols = {
    [TokenType.NOT]: '¬',
    [TokenType.AND]: '∧',
    [TokenType.OR]: '∨',
    [TokenType.IMPLIES]: '→',
    [TokenType.IFF]: '↔'
};

// Nombres descriptivos para mensajes de error y UI
const TokenNames = {
    [TokenType.ATOM]: 'proposición atómica',
    [TokenType.NOT]: 'negación (¬)',
    [TokenType.AND]: 'conjunción (∧)',
    [TokenType.OR]: 'disyunción (∨)',
    [TokenType.IMPLIES]: 'condicional (→)',
    [TokenType.IFF]: 'bicondicional (↔)',
    [TokenType.LPAREN]: 'paréntesis de apertura "("',
    [TokenType.RPAREN]: 'paréntesis de cierre ")"',
    [TokenType.EOF]: 'fin de la fórmula'
};

/**
 * Clase para representar un Token
 */
class Token {
    /**
     * @param {string} type Tipo del token (TokenType)
     * @param {string} value Valor canónico unificado (ej: '∧', 'p')
     * @param {string} raw Texto original en la fórmula
     * @param {number} start Posición inicial (índice 0-basado)
     * @param {number} end Posición final (índice 0-basado)
     */
    constructor(type, value, raw, start, end) {
        this.type = type;
        this.value = value;
        this.raw = raw;
        this.start = start;
        this.end = end;
    }
}

/**
 * Error Léxico con información de posición
 */
class LexerError extends Error {
    /**
     * @param {string} message Mensaje explicativo
     * @param {number} position Índice del carácter erróneo
     * @param {number} length Longitud del fragmento erróneo
     */
    constructor(message, position, length = 1) {
        super(message);
        this.name = 'LexerError';
        this.position = position;
        this.length = length;
    }
}

/**
 * Analizador Léxico (Lexer / Tokenizer)
 */
class Lexer {
    /**
     * @param {string} input Fórmula lógica a analizar
     */
    constructor(input) {
        this.input = input || '';
        this.cursor = 0;
        this.length = this.input.length;
    }

    /**
     * Observa el carácter actual sin avanzar
     * @returns {string}
     */
    peek(offset = 0) {
        const pos = this.cursor + offset;
        return pos < this.length ? this.input[pos] : '';
    }

    /**
     * Obtiene los siguientes N caracteres sin avanzar
     * @param {number} n
     * @returns {string}
     */
    peekString(n) {
        return this.input.slice(this.cursor, this.cursor + n);
    }

    /**
     * Avanza el cursor un paso y retorna el carácter consumido
     * @returns {string}
     */
    advance() {
        return this.input[this.cursor++];
    }

    /**
     * Verifica si se alcanzó el fin del texto
     * @returns {boolean}
     */
    isAtEnd() {
        return this.cursor >= this.length;
    }

    /**
     * Omite los espacios en blanco
     */
    skipWhitespace() {
        while (!this.isAtEnd() && /\s/.test(this.peek())) {
            this.advance();
        }
    }

    /**
     * Tokeniza toda la cadena de entrada
     * @returns {Token[]} Lista de tokens terminada en EOF
     */
    tokenize() {
        const tokens = [];

        while (!this.isAtEnd()) {
            this.skipWhitespace();
            if (this.isAtEnd()) break;

            const start = this.cursor;
            const char = this.peek();

            // 1. Paréntesis
            if (char === '(') {
                this.advance();
                tokens.push(new Token(TokenType.LPAREN, '(', '(', start, this.cursor));
                continue;
            }
            if (char === ')') {
                this.advance();
                tokens.push(new Token(TokenType.RPAREN, ')', ')', start, this.cursor));
                continue;
            }

            // 2. Bicondicional: ↔, <->, <=>
            if (char === '↔') {
                this.advance();
                tokens.push(new Token(TokenType.IFF, CanonicalSymbols[TokenType.IFF], '↔', start, this.cursor));
                continue;
            }
            if (this.peekString(3) === '<->' || this.peekString(3) === '<=>') {
                const raw = this.peekString(3);
                this.cursor += 3;
                tokens.push(new Token(TokenType.IFF, CanonicalSymbols[TokenType.IFF], raw, start, this.cursor));
                continue;
            }

            // Si empieza con '<' pero no es <-> ni <=>
            if (char === '<') {
                throw new LexerError(
                    `Carácter inesperado '<' en la posición ${start + 1}. ¿Quisiste escribir '<->' para bicondicional?`,
                    start,
                    1
                );
            }

            // 3. Condicional: →, ->, =>
            if (char === '→') {
                this.advance();
                tokens.push(new Token(TokenType.IMPLIES, CanonicalSymbols[TokenType.IMPLIES], '→', start, this.cursor));
                continue;
            }
            if (this.peekString(2) === '->' || this.peekString(2) === '=>') {
                const raw = this.peekString(2);
                this.cursor += 2;
                tokens.push(new Token(TokenType.IMPLIES, CanonicalSymbols[TokenType.IMPLIES], raw, start, this.cursor));
                continue;
            }

            // Si hay un guión '-' suelto
            if (char === '-') {
                throw new LexerError(
                    `Carácter inesperado '-' en la posición ${start + 1}. ¿Quisiste escribir '->' para condicional?`,
                    start,
                    1
                );
            }

            // 4. Negación: ¬, ~, !
            if (char === '¬' || char === '~' || char === '!') {
                this.advance();
                tokens.push(new Token(TokenType.NOT, CanonicalSymbols[TokenType.NOT], char, start, this.cursor));
                continue;
            }

            // 5. Conjunción: ∧, &&, &
            if (char === '∧') {
                this.advance();
                tokens.push(new Token(TokenType.AND, CanonicalSymbols[TokenType.AND], '∧', start, this.cursor));
                continue;
            }
            if (this.peekString(2) === '&&') {
                this.cursor += 2;
                tokens.push(new Token(TokenType.AND, CanonicalSymbols[TokenType.AND], '&&', start, this.cursor));
                continue;
            }
            if (char === '&') {
                this.advance();
                tokens.push(new Token(TokenType.AND, CanonicalSymbols[TokenType.AND], '&', start, this.cursor));
                continue;
            }

            // 6. Disyunción: ∨, ||, |
            // Ojo: '∨' es el símbolo Unicode \u2228 (LOGICAL OR), no la letra 'v'
            if (char === '∨') {
                this.advance();
                tokens.push(new Token(TokenType.OR, CanonicalSymbols[TokenType.OR], '∨', start, this.cursor));
                continue;
            }
            if (this.peekString(2) === '||') {
                this.cursor += 2;
                tokens.push(new Token(TokenType.OR, CanonicalSymbols[TokenType.OR], '||', start, this.cursor));
                continue;
            }
            if (char === '|') {
                this.advance();
                tokens.push(new Token(TokenType.OR, CanonicalSymbols[TokenType.OR], '|', start, this.cursor));
                continue;
            }

            // 7. Proposiciones atómicas: letras minúsculas (p, q, r, s, t, etc.), opcionalmente seguidas de dígitos (ej: p1, q2)
            // Nota: Si el usuario escribe la letra 'v' minúscula rodeada de espacios o entre proposiciones,
            // permitimos letras como átomos, pero si se escribe específicamente como proposición, es válido.
            if (/[a-z]/i.test(char)) {
                let atomName = '';
                while (!this.isAtEnd() && /[a-z0-9_]/i.test(this.peek())) {
                    atomName += this.advance();
                }

                // Si alguien escribe la letra 'v' sola y antes y después hay proposiciones o espacios,
                // verificamos si se pretendía disyunción '∨' o proposición atómica 'v'.
                // Por defecto, tratamos caracteres ASCII a-z como átomos, pero convertimos a minúscula.
                const normalizedAtom = atomName.toLowerCase();

                tokens.push(new Token(TokenType.ATOM, normalizedAtom, atomName, start, this.cursor));
                continue;
            }

            // 8. Carácter no reconocido
            const unknownChar = this.advance();
            throw new LexerError(
                `Carácter no reconocido '${unknownChar}' en la posición ${start + 1}.`,
                start,
                1
            );
        }

        tokens.push(new Token(TokenType.EOF, '', '', this.cursor, this.cursor));
        return tokens;
    }
}

// Exportación universal (Navegador y Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TokenType,
        CanonicalSymbols,
        TokenNames,
        Token,
        LexerError,
        Lexer
    };
}
if (typeof window !== 'undefined') {
    window.TokenType = TokenType;
    window.CanonicalSymbols = CanonicalSymbols;
    window.TokenNames = TokenNames;
    window.Token = Token;
    window.LexerError = LexerError;
    window.Lexer = Lexer;
}
