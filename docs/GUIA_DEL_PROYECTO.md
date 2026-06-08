# Guía del proyecto Pace (explicada para entenderla)

> Documento pensado para alguien con poca experiencia. Explica **cómo está montada
> la app, qué hace cada archivo, dónde está cada cosa y por qué existe**.
> Si algo no se entiende, busca el término en el **Glosario** del final.

---

## 0. La idea mental: un restaurante 🍽️

Antes de ver archivos, quédate con esta analogía que se usa en todo el documento:

| Parte de la app | En el restaurante | Carpeta |
|---|---|---|
| **App móvil** (lo que ve el usuario) | El **comedor**: mesas, carta, camareros | `apps/mobile` |
| **Backend** (el cerebro/servidor) | La **cocina**: prepara los platos, nadie de fuera entra | `apps/backend` |
| **Base de datos** | La **despensa**: donde se guarda todo | `apps/backend/prisma/dev.db` |
| **Código compartido** | El **idioma común** entre cocina y comedor | `packages/shared` |
| **Tink (banco)** | El **proveedor externo** que trae los ingredientes | (simulado por ahora) |

**Regla de oro:** el comedor (móvil) nunca entra en la cocina. Pide cosas por una
ventanilla (la "API") y la cocina le devuelve platos (datos en formato JSON). Así, si
mañana cambias la cocina entera, el comedor ni se entera.

---

## 1. La raíz del proyecto y el concepto de "monorepo"

Un **monorepo** = "un solo repositorio (carpeta de git) que contiene varios proyectos
a la vez". En vez de tener 3 repos separados (móvil, backend, compartido), están los 3
juntos y se hablan entre ellos.

Archivos en la raíz (`PACE/`):

- **`package.json`** → archivo central de configuración de cualquier proyecto
  JavaScript. Aquí se definen los **workspaces** (`apps/*` y `packages/*`): le dice a
  npm "trata estas subcarpetas como mini-proyectos conectados". También define atajos
  como `npm run backend` o `npm run mobile`.
- **`tsconfig.base.json`** → reglas de TypeScript comunes que heredan los tres
  sub-proyectos (para no repetirlas). TypeScript = JavaScript con "tipos" (avisa de
  errores antes de ejecutar).
- **`.gitignore`** → lista de archivos que git **NO** debe guardar (ej. `node_modules`,
  contraseñas en `.env`, la base de datos local).
- **`README.md`** → documentación de bienvenida.
- **`node_modules/`** → carpeta gigante con todas las librerías descargadas (se crea
  sola con `npm install`; nunca se toca a mano).

---

## 2. `packages/shared` — el "idioma común" 🗣️

La pieza más elegante. **El móvil y el backend necesitan estar de acuerdo en cómo es
una "transacción", un "usuario", etc.** En vez de definirlo dos veces (y arriesgarte a
que se desincronicen), se define **una sola vez aquí** y los dos lo importan.

- **`src/types.ts`** → define las "formas" de los datos: qué campos tiene un `User`,
  una `Transaction`, un `Budget`, el resultado del motor de decisión
  (`DecisionResult`), etc. Son solo descripciones (no hacen nada al ejecutarse), pero
  TypeScript las usa para avisarte si te equivocas.
- **`src/categories.ts`** → la lista única de categorías de gasto (Restaurantes,
  Transporte…) con su emoji, color y si es "ocio" o "gasto fijo". El backend la usa
  para clasificar; el móvil para pintar iconos. Misma fuente → nunca discrepan.
- **`src/decision.ts`** → ⭐ **el corazón de Pace**: la función `evaluateDecision()`
  que calcula si puedes permitirte algo. Es JavaScript "puro" (solo matemáticas, sin
  depender de internet ni base de datos), por eso vive aquí y la usa el backend.
- **`src/index.ts`** → la "puerta de entrada": reexporta todo lo anterior para poder
  escribir `import { ... } from "@pace/shared"`.
- **`dist/`** → la versión "compilada" (traducida de TypeScript a JavaScript normal).
  Se genera con `npm run build:shared`.

> 💡 Por eso, cuando haces login, el backend devuelve un `User` con exactamente los
> campos que el móvil espera: porque ambos leen la misma definición de
> `packages/shared`.

---

## 3. `apps/backend` — la cocina 👨‍🍳

Aquí está la lógica de servidor, organizada **en capas**, de fuera hacia dentro
(en el orden en que una petición las atraviesa).

### Arranque y configuración
- **`src/index.ts`** → el botón de encendido. Crea el servidor, lo pone a escuchar en
  el puerto `4000` y arranca el "trabajador" que sincroniza el banco cada 6 horas.
- **`src/app.ts`** → monta la aplicación web (Express) y **conecta cada URL con su
  archivo de rutas** (`/api/auth` → `routes/auth.ts`, etc.). También activa cosas
  globales como CORS (permitir que el móvil le hable) y el manejo de errores.
- **`src/config/env.ts`** → lee el archivo `.env` (variables secretas: contraseña de
  JWT, clave de cifrado, qué proveedor de banco usar). Centralizado para no esparcir
  secretos por el código.

### La despensa (base de datos)
- **`prisma/schema.prisma`** → ⭐ el **plano de la base de datos**. Describe las tablas
  (`User`, `BankConnection`, `Transaction`, `Budget`…) y sus columnas. Es lenguaje de
  **Prisma**, una herramienta que convierte ese plano en código y crea la base de datos
  por ti.
- **`prisma/dev.db`** → la base de datos real, un único archivo **SQLite** (perfecto
  para desarrollo: cero instalación). En producción se cambiaría por PostgreSQL/Supabase
  sin tocar el resto.
- **`prisma/migrations/`** → el historial de cambios de la base de datos (como commits
  de git, pero para las tablas).
- **`src/lib/prisma.ts`** → crea **una sola** conexión a la base de datos que reutiliza
  toda la app.

### Utilidades (`src/lib/`) — herramientas pequeñas y reutilizables
- **`auth.ts`** → funciones de seguridad: encriptar contraseñas (`bcrypt`) y
  crear/verificar **tokens JWT** (el "carnet" que demuestra quién eres en cada
  petición).
- **`crypto.ts`** → cifra con **AES-256** los tokens del banco antes de guardarlos
  (requisito de seguridad PSD2).
- **`httpError.ts`** → atajos para errores con su código (404 no encontrado, 401 no
  autorizado…).
- **`serialize.ts`** → convierte un usuario de la base de datos al formato `User` de
  `@pace/shared` (limpia campos sensibles como la contraseña antes de enviarlo).

### Porteros (`src/middleware/`) — código que se ejecuta "entre medias"
- **`auth.ts`** → el **portero**: revisa que la petición traiga un token JWT válido. Si
  no, la rechaza. Así protege las rutas privadas.
- **`error.ts`** → recoge cualquier error que ocurra y devuelve una respuesta limpia en
  vez de que el servidor se caiga.

### Proveedores de banco (`src/providers/`) — la "capa de abstracción" ⭐
Esto es lo que permite enchufar Tink/Plaid de verdad mañana sin reescribir nada.
- **`types.ts`** → define el "**contrato**" que cualquier banco debe cumplir: métodos
  como `fetchTransactions()`, `fetchBalance()`, `revoke()`.
- **`mock.ts`** → un banco **falso pero realista** que inventa la vida financiera de un
  estudiante (beca, alquiler, Netflix, cafés…). Por eso se ven datos reales sin tener un
  banco conectado.
- **`tink.ts`** → el hueco preparado (stub) para el banco real Tink. Cumple el mismo
  contrato; solo falta rellenar las llamadas a su API.
- **`index.ts`** → el "selector": según la config, devuelve el proveedor mock, tink o
  plaid. El resto del backend pide "el proveedor" sin saber cuál es.

### Servicios (`src/services/`) — la lógica de negocio de verdad
- **`finance.ts`** → ⭐ el más importante: calcula el balance, detecta los gastos
  recurrentes (suscripciones, alquiler), arma el **dashboard** y ejecuta el **motor de
  decisión** (usando la función de `@pace/shared`).
- **`sync.ts`** → habla con el proveedor de banco, trae las transacciones, las clasifica
  y las guarda (evitando duplicados).
- **`categorization.ts`** → decide la categoría de cada gasto por palabras clave (ej.
  "Mercadona" → Supermercado) y **aprende** cuando el usuario corrige.
- **`budgets.ts`** → lista presupuestos, calcula cuánto llevas gastado y sugiere
  presupuestos según tu historial.

### Rutas (`src/routes/`) — la "ventanilla" de la cocina (la API)
Cada archivo agrupa las URLs de un tema. Reciben la petición, llaman a los servicios y
devuelven JSON:
- **`auth.ts`** → `/api/auth/register`, `/login`, `/recover`.
- **`user.ts`** → ver/editar tu perfil (`/api/user/me`), borrar cuenta (GDPR).
- **`bank.ts`** → conectar/desconectar banco, sincronizar.
- **`transactions.ts`** → listar y filtrar movimientos, corregir categoría.
- **`budgets.ts`** → crear/editar/borrar presupuestos.
- **`decision.ts`** → el `/api/decision` ("¿puedo gastar X?") y `/api/dashboard`.

### Datos de prueba
- **`src/scripts/seed.ts`** → crea el usuario demo (`demo@pace.app`), le conecta el
  banco falso y rellena presupuestos. Es lo que se ejecuta con `npm run seed`.

---

## 4. `apps/mobile` — el comedor 📱

La app que ve el usuario, hecha con **React Native + Expo**. React Native = escribir la
app con código tipo web (componentes) pero que se ejecuta como app nativa de
iPhone/Android (y también web).

### Archivos de configuración (raíz de `apps/mobile`)
- **`package.json`** → librerías del móvil y atajos (`start`, `web`…).
- **`app.json`** → configuración de Expo: nombre de la app, icono, colores, esquema de
  URL.
- **`babel.config.js`** → le dice a Babel (el traductor) cómo convertir tu código
  moderno.
- **`metro.config.js`** → configura **Metro** (el empaquetador) para que encuentre
  `@pace/shared` dentro del monorepo.
- **`index.ts`** → el punto de arranque: registra `App.tsx` como la app.
- **`App.tsx`** → ⭐ la raíz de todo. Envuelve la app en los "proveedores" globales:
  tema (claro/oscuro), React Query (datos), navegación. Y al arrancar, recupera tu
  sesión guardada.

### `src/theme/` — los colores y estilos
- **`theme.ts`** → define las paletas de color para modo claro y oscuro (fondos,
  textos, verde/amarillo/rojo del semáforo).
- **`index.tsx`** → el "proveedor" del tema y el hook `useTheme()` que cualquier
  pantalla usa para pintar con los colores correctos.

### `src/store/` — la memoria de la app (estado global, con **Zustand**)
- **`auth.ts`** → guarda el token y el usuario logueado; funciones `signIn`/`signOut`.
  Persiste en almacenamiento seguro.
- **`settings.ts`** → guarda preferencias (idioma, tema) y las recuerda entre sesiones.

### `src/lib/` — utilidades del móvil
- **`storage.ts`** → guardar datos en el teléfono (token en el "cofre seguro" del
  sistema; en web usa el navegador).
- **`format.ts`** → formatear dinero (`€1.053`), fechas ("Hoy", "Ayer").

### `src/i18n/` — los idiomas (internationalization)
- **`translations.ts`** → todos los textos en **español e inglés**.
- **`index.ts`** → el hook `useT()` que devuelve el texto en el idioma activo.

### `src/api/` — el camarero que habla con la cocina 🛎️
- **`config.ts`** → decide la dirección del backend según la plataforma (web, emulador,
  móvil real).
- **`client.ts`** → configura **axios** (la librería para hacer peticiones HTTP) y le
  añade automáticamente tu token JWT a cada petición.
- **`endpoints.ts`** → una función por cada ruta del backend (`AuthApi.login()`,
  `DashboardApi.get()`…). Tipadas con `@pace/shared`.
- **`hooks.ts`** → ⭐ usa **React Query** para pedir datos y **guardarlos en caché**
  automáticamente. `useDashboard()`, `useTransactions()`… Cuando algo cambia (ej.
  corriges una categoría), React Query recarga solo lo necesario. Es lo que hace que la
  app se sienta fluida.

### `src/components/` — piezas reutilizables de interfaz (los "ladrillos")
- **`ui.tsx`** → botones, tarjetas, barras de progreso, "chips", textos… los bloques
  básicos.
- **`Input.tsx`** → un campo de texto con estilo.
- **`CategoryIcon.tsx`** → el círculo con el emoji de cada categoría.
- **`TransactionRow.tsx`** → una fila de movimiento (icono + nombre + importe).
- **`WeeklyChart.tsx`** → el mini gráfico de barras de la semana.
- **`CategoryPickerModal.tsx`** → el menú emergente para cambiar la categoría de un
  gasto.

### `src/navigation/` — el "mapa" de pantallas (con **React Navigation**)
- **`types.ts`** → nombres de las pantallas (para que TypeScript te ayude).
- **`index.tsx`** → ⭐ el cerebro de la navegación: ¿no has iniciado sesión? → pantallas
  de bienvenida/login. ¿Logueado pero sin banco? → onboarding. ¿Todo listo? → la app con
  pestañas.
- **`MainTabs.tsx`** → la barra de pestañas inferior (Inicio, Movimientos, ¿Puedo?,
  Presupuestos, Ajustes).
- **`OnboardingContext.tsx`** → un pequeño truco para avisar "onboarding terminado" y
  entrar a la app.

### `src/screens/` — las pantallas (lo que el usuario ve y toca)
- **`WelcomeScreen`** → bienvenida con la propuesta de valor.
- **`RegisterScreen` / `LoginScreen`** → crear cuenta / entrar.
- **`ConnectBankScreen`** → conectar el banco (paso del onboarding).
- **`BufferScreen`** → configurar tu "colchón de seguridad".
- **`DashboardScreen`** → ⭐ la pantalla principal: dinero disponible, semáforo,
  gráfico, últimos movimientos.
- **`TransactionsScreen`** → lista de movimientos con búsqueda y filtros.
- **`BudgetsScreen`** → presupuestos con barras de progreso.
- **`CanIScreen`** → ⭐ el motor "¿Me lo puedo permitir?" con teclado numérico.
- **`SettingsScreen`** → ajustes (tema, idioma, colchón, cuentas, cerrar sesión).

---

## 5. Recorrido completo: "¿Puedo gastar 35€?" 🔍

Para ver cómo **todas las capas colaboran**, sigue el viaje de un toque de botón:

1. **`CanIScreen.tsx`** (móvil): escribes `35` en el teclado y pulsas el botón. Llama a
   `useDecision()`.
2. **`hooks.ts`** → **`endpoints.ts`**: `DecisionApi.evaluate(35)` hace una petición
   HTTP `POST /api/decision`.
3. **`client.ts`**: añade tu token JWT a la petición y la envía al backend
   (`localhost:4000`).
4. **`app.ts`** (backend): recibe la URL y la dirige a `routes/decision.ts`.
5. **`middleware/auth.ts`**: el portero verifica tu token. ✅
6. **`routes/decision.ts`**: valida que mandaste un número y llama a
   `runDecision(userId, 35)`.
7. **`services/finance.ts`**: busca tu balance, resta los gastos fijos pendientes y tu
   colchón, y llama a…
8. **`packages/shared/decision.ts`**: `evaluateDecision()` hace la matemática y devuelve
   `{ verdict: "yes", message: "..." }`.
9. La respuesta vuelve por el mismo camino en formato JSON.
10. **`CanIScreen.tsx`**: muestra ✅ verde con el mensaje, traducido a tu idioma con
    `useT()`.

Toda esa ida y vuelta ocurre en milisegundos. **Cada archivo tiene un único trabajo** y
se pasan el testigo. Eso es la "arquitectura por capas".

---

## 6. Glosario exprés de tecnologías

- **Node.js** → permite ejecutar JavaScript fuera del navegador (en el servidor).
- **Express** → librería para crear el servidor web y sus rutas/URLs.
- **TypeScript** → JavaScript + tipos. Te avisa de errores mientras escribes.
- **Prisma** → traductor entre tu código y la base de datos (no escribes SQL a mano).
- **SQLite** → base de datos en un solo archivo, ideal para desarrollo.
- **PostgreSQL / Supabase** → la base de datos "de verdad" para producción.
- **JWT** → un "carnet" firmado que prueba quién eres en cada petición.
- **bcrypt** → convierte contraseñas en un texto irreversible para guardarlas seguras.
- **AES-256** → cifrado fuerte usado para los tokens del banco.
- **React Native + Expo** → escribir apps móviles con componentes; Expo facilita
  ejecutarlas/probarlas.
- **React Navigation** → gestiona moverse entre pantallas.
- **Zustand** → memoria global sencilla (sesión, ajustes).
- **React Query** → pide datos al backend y los cachea/actualiza solo.
- **axios** → hace las peticiones HTTP.
- **Metro** → empaqueta el código del móvil para que el dispositivo lo ejecute.
- **API** → la "ventanilla" de URLs por la que el móvil pide datos al backend.
- **JSON** → el formato de texto en el que viajan los datos entre móvil y backend.
- **Open Banking / PSD2** → la normativa europea que permite (con tu permiso) leer tus
  movimientos bancarios de forma segura y solo de lectura.

---

## 7. Cómo se ejecuta todo

```bash
npm install          # 1. instala librerías (una sola vez)
npm run build:shared # 2. compila el código compartido
npm run db:setup     # 3. crea la base de datos
npm run seed         # 4. mete datos demo
npm run backend      # 5. enciende la cocina (puerto 4000)
npm run mobile:web   # 6. enciende el comedor (navegador)
```

### Cuenta de prueba (demo)

```
email:    demo@pace.app
password: pace1234
```

---

## 8. Estructura completa de carpetas (mapa rápido)

```
PACE/
├── package.json            # workspaces + atajos
├── tsconfig.base.json      # reglas TS comunes
├── README.md
│
├── packages/
│   └── shared/             # "idioma común" (tipos + motor de decisión)
│       └── src/
│           ├── types.ts
│           ├── categories.ts
│           ├── decision.ts      # ⭐ cálculo "¿puedo permitírmelo?"
│           └── index.ts
│
├── apps/
│   ├── backend/            # la cocina (Node + Express + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # plano de la base de datos
│   │   │   └── dev.db           # base de datos SQLite
│   │   └── src/
│   │       ├── index.ts         # arranque del servidor
│   │       ├── app.ts           # monta Express + rutas
│   │       ├── config/env.ts
│   │       ├── lib/             # crypto, auth(JWT), prisma, errores
│   │       ├── middleware/      # portero de auth + manejo de errores
│   │       ├── providers/       # ⭐ mock / tink / plaid (abstracción)
│   │       ├── services/        # ⭐ finance, sync, categorización, budgets
│   │       ├── routes/          # las URLs de la API
│   │       └── scripts/seed.ts  # datos demo
│   │
│   └── mobile/             # el comedor (React Native + Expo)
│       ├── App.tsx              # raíz de la app
│       └── src/
│           ├── theme/           # colores, modo oscuro
│           ├── store/           # estado global (sesión, ajustes)
│           ├── i18n/            # textos es/en
│           ├── api/             # cómo habla con el backend
│           ├── components/      # ladrillos de interfaz reutilizables
│           ├── navigation/      # mapa de pantallas
│           └── screens/         # las pantallas
│
└── docs/
    └── GUIA_DEL_PROYECTO.md     # este documento
```
