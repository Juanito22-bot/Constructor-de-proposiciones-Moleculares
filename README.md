# Constructor de Proposiciones Moleculares 🧠📐

Aplicación web desarrollada con **HTML5, CSS3 y JavaScript Vanilla** (sin frameworks externos) para construir, validar, descomponer y analizar **Fórmulas Bien Formadas (FBF)** en Lógica Proposicional mediante árboles de sintaxis abstracta (**AST**), con **Sistema de Autenticación en localStorage**, **Panel de Administrador** y **Módulo de Inteligencia Artificial (Nativo Offline y API)**.

---

## 🎯 Objetivos y Módulos de la Aplicación

### 1. Sistema de Login y Perfiles (`auth.js` + `localStorage`)
- **Pantalla de bienvenida inicial** con 3 opciones:
  - 👤 **Iniciar Sesión (Usuario)**: Valida credenciales contra `localStorage`.
  - ✨ **Registrarse**: Crea una nueva cuenta de usuario guardada localmente en el navegador.
  - 🛡️ **Administrador**: Ingreso mediante contraseña maestra (por defecto: `admin123`).
- **Cabecera activa**: Muestra el nombre de usuario activo, insignia de rol (`USER` o `ADMIN`), alternador de tema claro/oscuro y botón para **Cerrar Sesión**.

### 2. Panel de Administrador (`⚙️ Administrador`)
- **Control de Acceso**: Solo visible y accesible si la sesión activa tiene rol `admin`.
- **Gestión de Usuarios**:
  - Tabla de usuarios registrados con fecha de registro y cantidad de fórmulas construidas.
  - Botón para **Cambiar Contraseña** de cualquier usuario mediante modal.
  - Botón para **Eliminar Usuario** permanentemente de `localStorage`.
- **Configuración Global de la Aplicación**:
  - Modificar el título de la aplicación en tiempo real (persistido en `localStorage`).
  - Activar/desactivar modo oscuro global por defecto.
  - Cambiar la contraseña maestra de administrador.
  - **Gestor de Ejemplos Predefinidos**: Añadir nuevos ejemplos (con validación FBF automática previa) y eliminar ejemplos existentes de la barra global.
- **Estadísticas de Uso**:
  - Total de fórmulas construidas y analizadas.
  - Total de usuarios registrados.
  - Barras proporcionales de conectivos lógicos más utilizados (`¬`, `∧`, `∨`, `→`, `↔`).
  - Botón para reiniciar estadísticas a 0.

### 3. Módulo de Inteligencia Artificial (`🤖 Asistente IA` / `ai.js`)
- **Traductor de Lenguaje Natural a FBF**:
  - Permite ingresar frases cotidianas en español como:
    - *"Si llueve y no tengo paraguas, entonces me mojo"* $\to$ `(p ∧ ¬q) → r`
    - *"Estudio o trabajo, pero no me rindo"* $\to$ `(p ∨ q) ∧ ¬r`
    - *"Iré al cine si y solo si termino la tarea"* $\to$ `p ↔ q`
    - *"No es cierto que hace frío y llueve"* $\to$ `¬(p ∧ q)`
  - Desglosa las proposiciones atómicas identificadas ($p, q, r\dots$) con su significado en texto.
  - Prioriza y utiliza las definiciones guardadas en el **Diccionario de Proposiciones** para formalizaciones más consistentes.
  - Botones para transferir la fórmula traducida directamente al **Constructor** o al **Inversor**.
- **Explicador Paso a Paso de FBF**:
  - Descompone cualquier fórmula en:
    1. **Lectura verbal** en lenguaje natural formal e **Interpretación Semántica con Diccionario**.
    2. **Conectivo principal** y alcance de la proposición molecular.
    3. **Pasos jerárquicos de evaluación** según la precedencia formal.
    4. **Semántica y condiciones de verdad** (cuándo es Verdadera o Falsa según tablas de verdad).
- **Motor Híbrido**:
  - **100% Funcional Offline**: Motor de reglas lingüísticas en JavaScript (sin requerir internet ni claves).
  - **Conexión Opcional a APIs**: Compatible con Groq (Llama 3.3 70B) o HuggingFace Serverless Inference API vía `fetch`.

### 4. Diccionario de Proposiciones - Glosario Semántico (`📖 Diccionario` / `dictionary.js`)
- **Asignación de Significados**:
  - Asigna significados en lenguaje natural a letras proposicionales ($p, q, r, s\dots$).
  - Validación de letra única ($a-z$) y detección de duplicados con diálogo de confirmación para sobrescribir.
  - Persistencia local en `localStorage` bajo la clave `propositionDictionary` (formato JSON: `{"p": "Cuando quiere comer", "q": "manzanas"}`).
- **Gestión Integral**:
  - Tabla dinámica y responsiva con visualización de badges para cada letra y comillas para significados.
  - Botón **✏️ Editar**: Carga la definición en el formulario con la letra bloqueada para actualizar el texto.
  - Botón **🗑️ Eliminar**: Elimina la definición individual con confirmación.
  - Botón **🗑️ Vaciar Diccionario**: Limpia todas las definiciones registradas tras confirmación previa.
- **Traducción Semántica Automatizada**:
  - Reemplazo inteligente de conectivos al español:
    - $\land \to$ **Y**
    - $\lor \to$ **O**
    - $\neg \to$ **NO**
    - $\to \to$ **SI ... ENTONCES ...**
    - $\leftrightarrow \to$ **SI Y SOLO SI**
  - Mantiene letras en su formato original si aún no han sido registradas en el diccionario.

### 5. Modo Construir (Constructor de FBF)
- Inserción con teclado virtual ordenado por precedencia o escritura directa con teclado físico.
- Validación sintáctica en tiempo real.
- **Traducción al Español en Tiempo Real**: Recuadro situado bajo la FBF construida que traduce dinámicamente las letras y conectivos con base en el Diccionario semántico.
- Diagnóstico de error con puntero visual exacto `▲`, posición y sugerencia didáctica.
- Historial de Deshacer (`Ctrl+Z`) y Rehacer (`Ctrl+Y`).

### 6. Modo Inverso (Descompositor Sintáctico)
- Desglose completo de cualquier fórmula ingresada:
  - a) Proposiciones atómicas encontradas.
  - b) Conectivos usados y frecuencia.
  - c) Conectivo principal destacado.
  - d) **Interpretación Semántica (con Diccionario)**: Sección dedicada con la traducción completa de la FBF al español y botón para copiar al portapapeles.
  - e) Tabla de subfórmulas ordenada por complejidad.
  - f) Árbol sintáctico (**AST Gráfico en SVG nativo interactivo** y **AST Textual en ASCII/Unicode**).
  - g) FBF reconstruida con paréntesis explícitos.

### 7. Precedencia y Asociatividad Estrictas
1. $\neg$ (**Negación**): Mayor precedencia, unario prefijo, asocia a la **derecha** ($\neg\neg p \equiv \neg(\neg p)$).
2. $\land$ (**Conjunción**): Mayor precedencia que $\lor$, asocia a la **izquierda** ($p \land q \land r \equiv (p \land q) \land r$).
3. $\lor$ (**Disyunción**): Mayor precedencia que $\to$, asocia a la **izquierda** ($p \lor q \lor r \equiv (p \lor q) \lor r$).
4. $\to$ (**Condicional**): Mayor precedencia que $\leftrightarrow$, asocia a la **derecha** ($p \to q \to r \equiv p \to (q \to r)$).
5. $\leftrightarrow$ (**Bicondicional**): Menor precedencia, asocia a la **izquierda** ($p \leftrightarrow q \leftrightarrow r \equiv (p \leftrightarrow q) \leftrightarrow r$).
6. **Paréntesis `(...)`**: Modifican y anulan la precedencia estándar.

---

## 📁 Estructura Modular del Proyecto

```text
c:\Tarea\
├── index.html       # Estructura semántica, accesibilidad, modales y pestañas
├── styles.css       # Diseño moderno, temas claro/oscuro, glosario semántico y paneles
├── lexer.js         # Analizador léxico (Tokenización, posiciones, alias)
├── parser.js        # Analizador sintáctico por descenso recursivo con precedencia
├── ast.js           # Modelado del AST, subfórmulas, árbol ASCII y renderizador SVG
├── auth.js          # Sistema de login, registro, admin maestro y localStorage
├── dictionary.js    # Glosario semántico, persistencia propositionDictionary y traducción
├── ai.js            # Motor de IA de lenguaje natural, explicador y conexión fetch
├── ui.js            # Controlador integral del DOM, eventos, sincronización y vistas
├── tests.js         # Suite de 51 pruebas unitarias automatizadas (8 categorías)
├── package.json     # Metadatos del proyecto y script npm test
└── README.md        # Documentación técnica completa
```

---

## 🚀 Instrucciones para Ejecutarlo en VS Code

### Opción 1: Abrir directamente en el navegador (Sin dependencias ni servidor)
1. En el Explorador de Archivos de VS Code, localiza el archivo `index.html`.
2. Haz doble clic o clic derecho y selecciona **"Open with Default Browser"**.
3. La aplicación se ejecutará de forma inmediata sin bloqueos de CORS.

### Opción 2: Usar Live Server en VS Code (Recomendado)
1. Instala la extensión **Live Server** en VS Code.
2. Haz clic derecho sobre `index.html` y selecciona **"Open with Live Server"**.
3. Se abrirá en tu navegador en `http://127.0.0.1:5500/index.html`.

---

## 🧪 Cómo Probar las Nuevas Funcionalidades

### 1. Probar el Login y los Perfiles:
1. Al abrir la app, se mostrará la pantalla de acceso con 3 opciones.
2. **Registro**:
   - Haz clic en **"✨ Registrarse"**, escribe un usuario (ej: `carlos`) y una contraseña (ej: `12345`).
   - Haz clic en **"Crear Mi Cuenta"**. Ingresarás automáticamente como usuario regular.
3. **Cerrar Sesión**:
   - En la esquina superior derecha, pulsa **"🚪 Cerrar Sesión"**.
4. **Acceso de Administrador**:
   - En la pantalla de bienvenida, haz clic en **"🛡️ Administrador"**.
   - Escribe la contraseña maestra: `admin123`.
   - Haz clic en **"Acceder como Administrador"**. Observarás que se habilita la pestaña **"⚙️ Administrador"** en la barra superior.

### 2. Probar el Panel de Administrador:
1. Ingresa como Administrador y haz clic en la pestaña **"⚙️ Administrador"**.
2. **Gestión de Usuarios**:
   - Verás la lista de usuarios registrados.
   - Pulsa **"🔑 Contraseña"** para cambiar la clave de un usuario.
   - Pulsa **"🗑️ Eliminar"** para borrar un usuario.
3. **Configuración Global**:
   - Cambia el título de la aplicación y pulsa **"Guardar Configuración"**. Verás cómo se actualiza de inmediato en toda la interfaz.
4. **Gestor de Ejemplos**:
   - Escribe una nueva fórmula (ej: `(p → q) ∧ (q → r)`) y pulsa **"➕ Añadir"**.
   - Aparecerá instantáneamente en la barra superior de ejemplos de la aplicación.
5. **Estadísticas**:
   - Visualiza el contador de fórmulas construidas y las barras de frecuencia de conectivos.

### 3. Probar el Diccionario de Proposiciones (Glosario Semántico):
1. Haz clic en la pestaña **"📖 Diccionario"**.
2. **Crear una definición**:
   - En **Letra**, escribe `p`.
   - En **Significado**, escribe `Cuando quiere comer`.
   - Pulsa **"💾 Guardar en Diccionario"**.
   - Si la letra ya existía, el sistema te preguntará mediante un diálogo si deseas sobrescribir su significado.
   - Agrega otra definición: Letra `q`, Significado `manzanas`.
3. **Editar y Eliminar**:
   - En la tabla de proposiciones, pulsa **"✏️ Editar"** en cualquiera de las filas para modificar su texto.
   - Pulsa **"🗑️ Eliminar"** para remover una definición individual.
   - Pulsa **"🗑️ Vaciar Diccionario"** (con confirmación) para reiniciar el glosario.
4. **Reflejo en el Constructor**:
   - Ve a la pestaña **"🔨 Constructor"**.
   - Escribe o construye con los botones la fórmula `p ∧ q`.
   - Observa inmediatamente debajo de la FBF el recuadro **"Traducción al Español"**: mostrará `"Cuando quiere comer" Y "manzanas"`.
   - Si escribes `p ∧ r` (donde `r` no está en el diccionario), se conservará la letra original: `"Cuando quiere comer" Y r`.
   - Prueba con otros conectivos como `p → q`: verás `SI "Cuando quiere comer" ENTONCES "manzanas"`.
5. **Reflejo en el Inversor**:
   - Ve a la pestaña **"🔍 Inversor"**.
   - Ingresa `(p ∧ q) → r` y pulsa **"🔍 Analizar Fórmula"**.
   - En el panel de resultados, verás la tarjeta **"📖 Interpretación Semántica (con Diccionario)"** mostrando:
     `SI "Cuando quiere comer" Y "manzanas" ENTONCES r` con un botón rápido para copiar la traducción al portapapeles.

### 4. Probar el Módulo de Inteligencia Artificial:
1. Ve a la pestaña **"🤖 Asistente IA"**.
2. **Traductor**:
   - Haz clic en cualquiera de las frases de ejemplo (ej: *"Si llueve y no tengo paraguas, entonces me mojo"*).
   - Pulsa **"✨ Traducir a FBF con IA"**.
   - La IA generará la fórmula `(p ∧ ¬q) → r`, el glosario de proposiciones atómicas y la explicación lógica (considerando las definiciones del diccionario).
   - Pulsa **"🔨 Cargar en Constructor"** para llevar la fórmula directamente al editor interactivo.
3. **Explicador Paso a Paso**:
   - En la sección derecha, escribe una fórmula (o pulsa *"📥 Usar Fórmula del Constructor"*).
   - Pulsa **"💡 Explicar Paso a Paso"** para ver la lectura en lenguaje natural formal, la **interpretación con el diccionario semántico**, el conectivo principal, los pasos jerárquicos de precedencia y las condiciones de verdad.

### 5. Ejecución de la Suite de Pruebas Unitarias:
- **Desde la app**: Ve a la pestaña **"🧪 Suite de Pruebas"** y haz clic en **"▶ Ejecutar Todas las Pruebas"**. Se ejecutarán las **51 pruebas unitarias** divididas en 8 categorías (Lexer, Parser, Precedencia, Asociatividad, Modo Inverso, Autenticación, Módulo de IA y Diccionario de Proposiciones), alcanzando el **100% de aprobadas (51/51)**.
- **Desde terminal**: Si tienes Node.js instalado, ejecuta `node tests.js`.
