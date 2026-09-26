/**
 * AST - Árbol de Sintaxis Abstracta (Abstract Syntax Tree)
 * Modela los nodos de Fórmulas Bien Formadas (FBF),
 * extracción de propiedades lógicas, generación de subfórmulas,
 * reconstrucción con paréntesis explícitos y renderizado (ASCII y SVG).
 */

const NodeType = {
    ATOM: 'ATOM',
    UNARY: 'UNARY',
    BINARY: 'BINARY'
};

const ConnectiveDetails = {
    '¬': { name: 'Negación', type: 'UNARY', precedence: 5, assoc: 'right', latex: '\\neg' },
    '∧': { name: 'Conjunción', type: 'BINARY', precedence: 4, assoc: 'left', latex: '\\land' },
    '∨': { name: 'Disyunción', type: 'BINARY', precedence: 3, assoc: 'left', latex: '\\lor' },
    '→': { name: 'Condicional (Implicación)', type: 'BINARY', precedence: 2, assoc: 'right', latex: '\\to' },
    '↔': { name: 'Bicondicional (Doble Implicación)', type: 'BINARY', precedence: 1, assoc: 'left', latex: '\\leftrightarrow' }
};

/**
 * Nodo de Proposición Atómica (ej: p, q, r)
 */
class AtomNode {
    constructor(name, start = 0, end = 0) {
        this.type = NodeType.ATOM;
        this.name = name;
        this.start = start;
        this.end = end;
    }
}

/**
 * Nodo de Operación Unaria (¬A)
 */
class UnaryNode {
    constructor(operator, operand, start = 0, end = 0) {
        this.type = NodeType.UNARY;
        this.operator = operator; // '¬'
        this.operand = operand;
        this.start = start;
        this.end = end;
    }
}

/**
 * Nodo de Operación Binaria (A ∧ B, A ∨ B, A → B, A ↔ B)
 */
class BinaryNode {
    constructor(operator, left, right, start = 0, end = 0) {
        this.type = NodeType.BINARY;
        this.operator = operator; // '∧', '∨', '→', '↔'
        this.left = left;
        this.right = right;
        this.start = start;
        this.end = end;
    }
}

/**
 * Recolecta todas las proposiciones atómicas únicas de la fórmula (orden alfabético)
 * @param {AtomNode|UnaryNode|BinaryNode} node
 * @returns {string[]} Lista de nombres de proposiciones atómicas (ej: ['p', 'q', 'r'])
 */
function collectAtoms(node) {
    const atoms = new Set();
    function traverse(curr) {
        if (!curr) return;
        if (curr.type === NodeType.ATOM) {
            atoms.add(curr.name);
        } else if (curr.type === NodeType.UNARY) {
            traverse(curr.operand);
        } else if (curr.type === NodeType.BINARY) {
            traverse(curr.left);
            traverse(curr.right);
        }
    }
    traverse(node);
    return Array.from(atoms).sort();
}

/**
 * Recolecta los conectivos lógicos usados y sus frecuencias
 * @param {AtomNode|UnaryNode|BinaryNode} node
 * @returns {{ list: string[], counts: Record<string, number>, details: Array<{symbol: string, name: string, count: number}> }}
 */
function collectConnectives(node) {
    const counts = {};
    function traverse(curr) {
        if (!curr) return;
        if (curr.type === NodeType.UNARY) {
            counts[curr.operator] = (counts[curr.operator] || 0) + 1;
            traverse(curr.operand);
        } else if (curr.type === NodeType.BINARY) {
            counts[curr.operator] = (counts[curr.operator] || 0) + 1;
            traverse(curr.left);
            traverse(curr.right);
        }
    }
    traverse(node);

    const list = Object.keys(counts);
    const details = list.map(symbol => ({
        symbol,
        name: ConnectiveDetails[symbol] ? ConnectiveDetails[symbol].name : symbol,
        count: counts[symbol]
    }));

    return { list, counts, details };
}

/**
 * Identifica el conectivo principal de la fórmula
 * @param {AtomNode|UnaryNode|BinaryNode} node
 * @returns {{ symbol: string|null, name: string, type: string, description: string }}
 */
function getMainConnective(node) {
    if (!node) {
        return { symbol: null, name: 'Ninguno', type: 'NONE', description: 'Fórmula vacía' };
    }
    if (node.type === NodeType.ATOM) {
        return {
            symbol: null,
            name: 'Ninguno (Proposición Atómica)',
            type: 'ATOM',
            description: `Es una proposición atómica simple ('${node.name}'), sin conectivos.`
        };
    }
    if (node.type === NodeType.UNARY) {
        return {
            symbol: node.operator,
            name: ConnectiveDetails[node.operator]?.name || 'Negación',
            type: 'UNARY',
            description: 'La fórmula completa está negada. El conectivo principal es la negación (¬).'
        };
    }
    if (node.type === NodeType.BINARY) {
        const details = ConnectiveDetails[node.operator];
        return {
            symbol: node.operator,
            name: details ? details.name : node.operator,
            type: 'BINARY',
            description: `Une dos subfórmulas mediante el conectivo '${node.operator}' (${details?.name || 'Binario'}).`
        };
    }
    return { symbol: null, name: 'Desconocido', type: 'UNKNOWN', description: '' };
}

/**
 * Reconstruye la FBF con paréntesis explícitos en cada operación
 * Ejemplo: ((p ∧ q) → (¬r))
 * @param {AtomNode|UnaryNode|BinaryNode} node
 * @returns {string}
 */
function toFullyParenthesized(node) {
    if (!node) return '';
    if (node.type === NodeType.ATOM) {
        return node.name;
    }
    if (node.type === NodeType.UNARY) {
        return `(${node.operator}${toFullyParenthesized(node.operand)})`;
    }
    if (node.type === NodeType.BINARY) {
        return `(${toFullyParenthesized(node.left)} ${node.operator} ${toFullyParenthesized(node.right)})`;
    }
    return '';
}

/**
 * Convierte el AST a fórmula canónica estándar con el mínimo de paréntesis necesarios
 * respetando precedencia y asociatividad
 * @param {AtomNode|UnaryNode|BinaryNode} node
 * @returns {string}
 */
function toCanonicalString(node) {
    if (!node) return '';

    function format(curr, parentPrec = 0, isRightChild = false, isUnaryOperand = false) {
        if (curr.type === NodeType.ATOM) {
            return curr.name;
        }

        if (curr.type === NodeType.UNARY) {
            const myPrec = ConnectiveDetails[curr.operator].precedence;
            const operandStr = format(curr.operand, myPrec, false, true);
            return `${curr.operator}${operandStr}`;
        }

        if (curr.type === NodeType.BINARY) {
            const details = ConnectiveDetails[curr.operator];
            const myPrec = details.precedence;
            const assoc = details.assoc;

            const leftStr = format(curr.left, myPrec, false, false);
            const rightStr = format(curr.right, myPrec, true, false);

            let needsParens = false;
            if (parentPrec > myPrec) {
                needsParens = true;
            } else if (parentPrec === myPrec) {
                // Si la precedencia es igual, depende de la asociatividad
                if (assoc === 'left' && isRightChild) {
                    needsParens = true;
                } else if (assoc === 'right' && !isRightChild) {
                    needsParens = true;
                }
            } else if (isUnaryOperand) {
                needsParens = true;
            }

            const expr = `${leftStr} ${curr.operator} ${rightStr}`;
            return needsParens ? `(${expr})` : expr;
        }

        return '';
    }

    return format(node);
}

/**
 * Obtiene todas las subfórmulas bien formadas únicas, ordenadas por complejidad (longitud/profundidad)
 * @param {AtomNode|UnaryNode|BinaryNode} node
 * @returns {Array<{ formula: string, parenthesized: string, type: string, depth: number }>}
 */
function collectSubformulas(node) {
    const map = new Map();

    function traverse(curr, depth = 0) {
        if (!curr) return;

        if (curr.type === NodeType.ATOM) {
            const str = curr.name;
            if (!map.has(str)) {
                map.set(str, {
                    formula: str,
                    parenthesized: str,
                    type: 'Atómica',
                    depth: 0,
                    complexity: 1
                });
            }
        } else if (curr.type === NodeType.UNARY) {
            traverse(curr.operand, depth + 1);
            const str = toCanonicalString(curr);
            const fully = toFullyParenthesized(curr);
            if (!map.has(str)) {
                map.set(str, {
                    formula: str,
                    parenthesized: fully,
                    type: 'Negación (Unaria)',
                    depth: depth,
                    complexity: countNodes(curr)
                });
            }
        } else if (curr.type === NodeType.BINARY) {
            traverse(curr.left, depth + 1);
            traverse(curr.right, depth + 1);
            const str = toCanonicalString(curr);
            const fully = toFullyParenthesized(curr);
            const opName = ConnectiveDetails[curr.operator]?.name || 'Binaria';
            if (!map.has(str)) {
                map.set(str, {
                    formula: str,
                    parenthesized: fully,
                    type: opName,
                    depth: depth,
                    complexity: countNodes(curr)
                });
            }
        }
    }

    traverse(node, 0);

    // Convertir a array y ordenar de menor a mayor complejidad (atómicas primero, luego subfórmulas, hasta la fórmula total)
    return Array.from(map.values()).sort((a, b) => {
        if (a.complexity !== b.complexity) return a.complexity - b.complexity;
        return a.formula.length - b.formula.length;
    });
}

/**
 * Cuenta el número total de nodos de un subárbol
 * @param {AtomNode|UnaryNode|BinaryNode} node
 * @returns {number}
 */
function countNodes(node) {
    if (!node) return 0;
    if (node.type === NodeType.ATOM) return 1;
    if (node.type === NodeType.UNARY) return 1 + countNodes(node.operand);
    if (node.type === NodeType.BINARY) return 1 + countNodes(node.left) + countNodes(node.right);
    return 0;
}

/**
 * Genera una representación en árbol de texto Unicode / ASCII (estilo comando tree)
 * @param {AtomNode|UnaryNode|BinaryNode} node
 * @param {string} prefix
 * @param {boolean} isTail
 * @returns {string}
 */
function renderAsciiTree(node, prefix = '', isTail = true) {
    if (!node) return '';

    let label = '';
    if (node.type === NodeType.ATOM) {
        label = `${node.name} [Atómica]`;
    } else if (node.type === NodeType.UNARY) {
        label = `${node.operator} [${ConnectiveDetails[node.operator]?.name || 'Negación'}]`;
    } else if (node.type === NodeType.BINARY) {
        label = `${node.operator} [${ConnectiveDetails[node.operator]?.name || 'Binario'}]`;
    }

    const currentLine = prefix + (isTail ? '└── ' : '├── ') + label;
    const nextPrefix = prefix + (isTail ? '    ' : '│   ');

    const childrenLines = [];
    if (node.type === NodeType.UNARY) {
        childrenLines.push(renderAsciiTree(node.operand, nextPrefix, true));
    } else if (node.type === NodeType.BINARY) {
        childrenLines.push(renderAsciiTree(node.left, nextPrefix, false));
        childrenLines.push(renderAsciiTree(node.right, nextPrefix, true));
    }

    return [currentLine, ...childrenLines].join('\n');
}

/**
 * Calcula posiciones de los nodos para renderizar un diagrama SVG jerárquico limpio
 * Algoritmo de árbol binario con cálculo de anchos
 */
function layoutTree(node, depth = 0) {
    if (!node) return null;

    const layoutNode = {
        node,
        depth,
        x: 0,
        y: depth * 80 + 40,
        width: 0,
        children: []
    };

    if (node.type === NodeType.UNARY) {
        const childLayout = layoutTree(node.operand, depth + 1);
        layoutNode.children = [childLayout];
    } else if (node.type === NodeType.BINARY) {
        const leftLayout = layoutTree(node.left, depth + 1);
        const rightLayout = layoutTree(node.right, depth + 1);
        layoutNode.children = [leftLayout, rightLayout];
    }

    return layoutNode;
}

/**
 * Asigna coordenadas X a cada nodo usando in-order traversal para evitar solapamientos
 */
function assignXCoordinates(layoutNode, state = { nextX: 50 }) {
    if (!layoutNode) return;

    if (layoutNode.children.length === 0) {
        // Hoja
        layoutNode.x = state.nextX;
        state.nextX += 70;
    } else if (layoutNode.children.length === 1) {
        // Unario: centrado sobre su único hijo
        assignXCoordinates(layoutNode.children[0], state);
        layoutNode.x = layoutNode.children[0].x;
    } else if (layoutNode.children.length === 2) {
        // Binario: a la izquierda, a la derecha, y el padre centrado en medio
        assignXCoordinates(layoutNode.children[0], state);
        assignXCoordinates(layoutNode.children[1], state);
        layoutNode.x = (layoutNode.children[0].x + layoutNode.children[1].x) / 2;
    }
}

/**
 * Genera el marcado SVG completo para visualizar el AST
 * @param {AtomNode|UnaryNode|BinaryNode} ast
 * @returns {string} Código SVG
 */
function renderSvgTree(ast) {
    if (!ast) {
        return '<svg viewBox="0 0 300 100" class="ast-svg-empty"><text x="150" y="50" text-anchor="middle" fill="#888">Sin árbol para mostrar</text></svg>';
    }

    const layout = layoutTree(ast);
    const state = { nextX: 50 };
    assignXCoordinates(layout, state);

    // Calcular límites para el viewBox
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    function findBounds(curr) {
        if (!curr) return;
        if (curr.x < minX) minX = curr.x;
        if (curr.x > maxX) maxX = curr.x;
        if (curr.y > maxY) maxY = curr.y;
        curr.children.forEach(findBounds);
    }
    findBounds(layout);

    const padding = 50;
    const width = Math.max(300, (maxX - minX) + padding * 2);
    const height = maxY + 60;
    const offsetX = padding - minX;

    // Ajustar X con offset para centrado
    function applyOffset(curr) {
        if (!curr) return;
        curr.x += offsetX;
        curr.children.forEach(applyOffset);
    }
    applyOffset(layout);

    // Generar líneas de conexión
    const lines = [];
    function drawLines(curr) {
        if (!curr) return;
        curr.children.forEach(child => {
            // Línea curva bezier suave
            const d = `M ${curr.x} ${curr.y} C ${curr.x} ${(curr.y + child.y) / 2}, ${child.x} ${(curr.y + child.y) / 2}, ${child.x} ${child.y}`;
            lines.push(`<path d="${d}" class="ast-edge" fill="none" stroke="var(--tree-line, #64748b)" stroke-width="2.5" stroke-linecap="round" />`);
            drawLines(child);
        });
    }
    drawLines(layout);

    // Generar nodos
    const nodes = [];
    function drawNodes(curr) {
        if (!curr) return;
        const n = curr.node;
        const x = curr.x;
        const y = curr.y;
        const subformula = toCanonicalString(n);

        let nodeColor = '#3b82f6'; // Azul por defecto
        let strokeColor = '#1d4ed8';
        let label = '';
        let badge = '';

        if (n.type === NodeType.ATOM) {
            nodeColor = '#10b981'; // Verde esmeralda para atómicas
            strokeColor = '#047857';
            label = n.name;
            badge = 'ATOM';
        } else if (n.type === NodeType.UNARY) {
            nodeColor = '#f59e0b'; // Ámbar / Naranja para negación
            strokeColor = '#b45309';
            label = n.operator;
            badge = '¬';
        } else if (n.type === NodeType.BINARY) {
            nodeColor = '#6366f1'; // Indigo para binarios
            strokeColor = '#4338ca';
            label = n.operator;
            badge = 'BIN';
        }

        nodes.push(`
            <g class="ast-node-group" data-formula="${escapeHtml(subformula)}" tabindex="0">
                <title>${escapeHtml(subformula)} (${n.type})</title>
                <circle cx="${x}" cy="${y}" r="22" fill="${nodeColor}" stroke="${strokeColor}" stroke-width="2.5" class="ast-node-circle" />
                <text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17" font-weight="bold" fill="#ffffff" class="ast-node-label">${escapeHtml(label)}</text>
                <rect x="${x - 16}" y="${y - 32}" width="32" height="13" rx="4" fill="rgba(15, 23, 42, 0.85)" />
                <text x="${x}" y="${y - 23}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#cbd5e1">${badge}</text>
            </g>
        `);

        curr.children.forEach(drawNodes);
    }
    drawNodes(layout);

    return `
        <svg viewBox="0 0 ${width} ${height}" class="ast-svg-canvas" xmlns="http://www.w3.org/2000/svg">
            <g class="ast-edges-layer">${lines.join('')}</g>
            <g class="ast-nodes-layer">${nodes.join('')}</g>
        </svg>
    `;
}

/**
 * Escapa caracteres HTML para inyección segura en SVG
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Exportación universal (Navegador y Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NodeType,
        ConnectiveDetails,
        AtomNode,
        UnaryNode,
        BinaryNode,
        collectAtoms,
        collectConnectives,
        getMainConnective,
        toFullyParenthesized,
        toCanonicalString,
        collectSubformulas,
        countNodes,
        renderAsciiTree,
        renderSvgTree
    };
}
if (typeof window !== 'undefined') {
    window.NodeType = NodeType;
    window.ConnectiveDetails = ConnectiveDetails;
    window.AtomNode = AtomNode;
    window.UnaryNode = UnaryNode;
    window.BinaryNode = BinaryNode;
    window.collectAtoms = collectAtoms;
    window.collectConnectives = collectConnectives;
    window.getMainConnective = getMainConnective;
    window.toFullyParenthesized = toFullyParenthesized;
    window.toCanonicalString = toCanonicalString;
    window.collectSubformulas = collectSubformulas;
    window.countNodes = countNodes;
    window.renderAsciiTree = renderAsciiTree;
    window.renderSvgTree = renderSvgTree;
}
