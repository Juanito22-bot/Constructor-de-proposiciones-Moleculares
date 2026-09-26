# Constructor de Proposiciones Moleculares 🧠📐

Aplicación web desarrollada con **HTML5, CSS3 y JavaScript Vanilla** (sin frameworks ni librerías externas) para construir, validar, descomponer y analizar **Fórmulas Bien Formadas (FBF)** en Lógica Proposicional mediante árboles de sintaxis abstracta (**AST**).

---

## 🎯 Objetivos y Características Principales

1. **Modo Construir**:
   - Inserción interactiva de proposiciones atómicas ($p, q, r, s, t, \dots$) y variables personalizadas.
   - Teclado virtual ordenado por precedencia lógica con botones para conectivos, paréntesis, borrado, deshacer (`Ctrl+Z`), rehacer (`Ctrl+Y`) y limpieza.
   - Edición bidireccional y escritura directa desde el teclado físico.
   - Validación sintáctica y léxica en tiempo real con estados visuales (FBF Válida / Inválida).
   - **Diagnóstico pedagógico de errores**: muestra la posición exacta (con indicador visual `▲`), el motivo del error y sugerencias didácticas de corrección.

2. **Precedencia y Asociatividad Estrictas**:
   - $\neg$ (**Negación**): Mayor precedencia, unario prefijo, asocia a la derecha ($\neg\neg p \equiv \neg(\neg p)$).
   - $\land$ (**Conjunción**): Mayor precedencia que $\lor$, asocia a la izquierda ($p \land q \land r \equiv (p \land q) \land r$).
   - $\lor$ (**Disyunción**): Mayor precedencia que $\to$, asocia a la izquierda ($p \lor q \lor r \equiv (p \lor q) \lor r$).
   - $\to$ (**Condicional / Implicación**): Mayor precedencia que $\leftrightarrow$, asocia a la derecha ($p \to q \to r \equiv p \to (q \to r)$).
   - $\leftrightarrow$ (**Bicondicional / Doble Implicación**): Menor precedencia, asocia a la izquierda ($p \leftrightarrow q \leftrightarrow r \equiv (p \leftrightarrow q) \leftrightarrow r$).
   - **Paréntesis**: Modifican y anulan la precedencia estándar.

3. **Conectivos Soportados y Alias**:
   | Conectivo | Símbolo Oficial | Alias Soportados en Entrada |
   | :--- | :---: | :---: |
   | **Negación** | `¬` | `~`, `!` |
   | **Conjunción** | `∧` | `&`, `&&` |
   | **Disyunción** | `∨` | `\|`, `\|\|` |
   | **Condicional** | `→` | `->`, `=>` |
   | **Bicondicional** | `↔` | `<->`, `<=>` |

4. **Modo Inverso (Análisis Sintáctico y Descomposición)**:
   - Permite ingresar o transferir cualquier fórmula para su desglose exhaustivo:
     - **a) Proposiciones atómicas encontradas**: Conjunto ordenado y conteo.
     - **b) Conectivos usados**: Lista, nombres formales y frecuencia de uso.
     - **c) Conectivo principal**: Detección del operador raíz o indicación de fórmula atómica.
     - **d) Subfórmulas**: Tabla jerárquica ordenada de menor a mayor complejidad (desde átomos hasta la fórmula total).
     - **e) Árbol sintáctico (AST)**:
       - **Vista Gráfica (SVG interactivo)**: Diagrama jerárquico renderizado en SVG nativo con colores por tipo de nodo, líneas curvas y tooltips.
       - **Vista Textual (ASCII/Unicode)**: Estructura en árbol legible (`├── `, `└── `) copiable al portapapeles con un clic.
     - **f) FBF reconstruida con paréntesis explícitos**: Expresión completamente parentizada sin ambigüedades.

5. **Suite de Pruebas Unitarias Integrada**:
   - 34 pruebas automatizadas que cubren el Lexer, Parser, Precedencia, Asociatividad, Modo Inverso y Detección de errores con posición exacta.
   - Ejecutable interactivamente desde la pestaña **"Suite de Pruebas"** de la app o por consola (`node tests.js`).

---

## 📁 Estructura Modular del Proyecto

```text
c:\Tarea\
├── index.html       # Estructura semántica, accesibilidad y pestañas
├── styles.css       # Diseño moderno, responsivo, variables CSS y animaciones
├── lexer.js         # Analizador léxico (Tokenización, posiciones, alias y errores léxicos)
├── parser.js        # Analizador sintáctico (Descenso recursivo, precedencia, asociatividad)
├── ast.js           # Modelado del AST, análisis de subfórmulas, árbol ASCII y SVG nativo
├── ui.js            # Controlador de eventos del DOM, teclado virtual, historial y vistas
├── tests.js         # Suite completa de pruebas unitarias (ejecutable en navegador o Node.js)
├── package.json     # Metadatos del proyecto y script npm test
└── README.md        # Documentación técnica y guía de ejecución
```

---

## 🚀 Instrucciones para Ejecutarlo en VS Code

### Opción 1: Abrir directamente en el navegador (Sin servidor requerido)
1. En el Explorador de Archivos de VS Code, localiza el archivo `index.html`.
2. Haz clic derecho sobre `index.html` y selecciona **"Open with Default Browser"** (o arrastra `index.html` a cualquier navegador: Chrome, Edge, Firefox, Safari).
3. La aplicación funcionará al 100% de manera inmediata, gracias a que los módulos están diseñados con compatibilidad universal.

### Opción 2: Usar la extensión Live Server de VS Code (Recomendado)
1. Instala la extensión **Live Server** de *Ritwick Dey* en VS Code.
2. Abre la carpeta del proyecto en VS Code.
3. Haz clic derecho sobre `index.html` y selecciona **"Open with Live Server"** (o presiona el botón *Go Live* en la barra de estado inferior).
4. Se abrirá automáticamente en `http://127.0.0.1:5500/index.html`.

### Opción 3: Servidor HTTP local con Python o Node
Si cuentas con Python o Node instalado:
```bash
# Con Python
python -m http.server 8080

# Con npx (Node)
npx serve .
```
Luego abre `http://localhost:8080` en tu navegador.

---

## 🧪 Ejecución de Pruebas Unitarias

### Método 1: Desde la Interfaz Web (1 Clic)
1. Abre la aplicación en tu navegador.
2. Haz clic en la pestaña **"🧪 Suite de Pruebas"** en la barra superior.
3. Presiona el botón **"▶ Ejecutar Todas las Pruebas"**.
4. Podrás observar los contadores métricos y el resultado detallado de cada una de las 34 pruebas en tiempo real.

### Método 2: Por Consola con Node.js
Si tienes Node.js instalado en tu sistema, ejecuta en el terminal:
```bash
node tests.js
```
o mediante:
```bash
npm test
```

---

## 📋 Ejemplos de Prueba Incluidos

Puedes hacer clic directamente en los botones de ejemplo en la cabecera de la aplicación para probarlos de inmediato:

1. **`((p ∧ q) → ¬r)`**
   - Conectivo principal: `→` (Condicional)
   - Proposiciones atómicas: $p, q, r$
   - Conectivos usados: `∧`, `→`, `¬`
   - Paréntesis explícitos: `((p ∧ q) → (¬r))`

2. **`(p ∨ q) ↔ (r → s)`**
   - Conectivo principal: `↔` (Bicondicional)
   - Proposiciones atómicas: $p, q, r, s$
   - Conectivos usados: `∨`, `↔`, `→`

3. **`¬(p ∧ q) ∨ r`**
   - Conectivo principal: `∨` (Disyunción)
   - Demuestra la precedencia de $\neg$ sobre la subfórmula agrupada $(p \land q)$.

4. **`(p → (q → r)) ↔ ((p ∧ q) → r)`**
   - Ley de Exportación en Lógica Proposicional.
   - Demuestra la asociatividad a la derecha del condicional `→`.

5. **`¬(p ∨ ¬q) ∧ (r → s)`**
   - Expresión con múltiples niveles de anidamiento y negaciones compuestas.

---

## 🛡️ Justificación de Cero Librerías Externas

De acuerdo con el requisito de no utilizar frameworks externos:
- **Sin React/Vue/Angular**: Se utilizó manipulación nativa del DOM con JavaScript ES6+, permitiendo un rendimiento instantáneo sin compiladores ni transpiladores.
- **Sin D3 ni librerías de gráficos pesadas**: El visualizador del **Árbol Sintáctico (AST)** genera dinámicamente un documento **SVG nativo** calculando las coordenadas y curvas de Bézier directamente en `ast.js`.
- **Sin librerías de testing (Jest/Mocha)**: Se construyó un ejecutor de pruebas unitarias (`TestRunner`) ligero y nativo en `tests.js`, capaz de ejecutarse tanto en entornos de navegador como en CLI sin instalar paquetes en `node_modules`.
