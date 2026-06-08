# Tests automáticos de Pace

Esta guía explica **qué es un test**, **qué probamos en Pace**, **cómo ejecutarlos**
y **cómo añadir los tuyos**. Está escrita para que la entiendas aunque tengas poca
experiencia: es tu red de seguridad para no romper cosas sin darte cuenta.

---

## 1. ¿Por qué tests? (la idea en 30 segundos)

Un **test** es código que comprueba que otro código hace lo que debe.

Sin tests, cada vez que tocas algo tienes que abrir la app, conectar el banco,
meter un número en "¿Puedo permitírmelo?"… y rezar. Con tests, escribes esa
comprobación **una vez** y la máquina la repite en 2 segundos cada vez que cambias
algo. Si rompes el motor de decisión sin querer, el test se pone **rojo** y te avisa
antes de que llegue a un usuario real.

Regla mental: **un test = "si le doy X, espero Y"**.

```ts
const r = evaluateDecision({ amount: 350, currentBalance: 500, ... });
expect(r.verdict).toBe("no"); // si le pido 350€ y no me llega, espero un "no"
```

---

## 2. Herramienta que usamos: Vitest

Usamos **[Vitest](https://vitest.dev/)**: un *test runner* (el programa que busca
los archivos de test, los ejecuta y te dice cuáles pasan). Lo elegimos porque:

- Entiende **TypeScript** sin configuración extra.
- Es **rápido**.
- Su sintaxis (`describe`, `it`, `expect`) es el estándar que verás en casi todos
  los proyectos JS/TS, así que lo aprendido te sirve en cualquier lado.

Vocabulario:

| Palabra | Qué es |
|---|---|
| `describe("grupo", ...)` | Agrupa tests relacionados (solo organización). |
| `it("hace X", ...)` | **Un** test concreto. También se escribe `test(...)`. |
| `expect(valor).toBe(...)` | La **afirmación**: "esto debería ser igual a...". |
| `beforeAll(...)` | Código que se ejecuta **una vez** antes de los tests (preparar datos). |
| 🟢 verde / 🔴 rojo | El test pasó / falló. |

---

## 3. Qué probamos (y por qué eso)

Probamos lo más importante y lo más frágil. Hay dos tipos de test en Pace:

### a) Tests **unitarios** — piezas pequeñas y aisladas

Prueban **una función pura** (sin base de datos ni internet). Son rapidísimos.

| Archivo | Qué blinda | Ejemplos |
|---|---|---|
| `packages/shared/src/decision.test.ts` | **El motor de decisión** (Nivel 0 y Nivel 1). El corazón de la app. | "350€ sin saldo → `no`"; "Nivel 1 es más estricto que Nivel 0"; "si el ingreso está cerca, puedo gastar más". |
| `apps/backend/test/crypto.test.ts` | **El cifrado de los tokens del banco** (seguridad). | "cifrar y descifrar devuelve el original"; "un texto manipulado es rechazado". |
| `apps/backend/test/categorization.test.ts` | La **categorización** por palabras clave y el aprendizaje del usuario. | "Mercadona → groceries"; "una regla aprendida del usuario gana a la regla por defecto". |
| `apps/backend/test/mockProvider.test.ts` | Que los **datos demo del banco** sean deterministas. | "el mismo token devuelve siempre las mismas transacciones". |

### b) Test de **integración** — todo junto, de verdad

`apps/backend/test/api.integration.test.ts` arranca la **API real** (Express) contra
una **base de datos de prueba** y recorre el camino completo de un usuario:

```
registrarse → rutas protegidas (401 sin token) → conectar banco →
ver dashboard → preguntar al motor de decisión → editar categoría → crear presupuesto
```

Esto demuestra que **todas las capas encajan**: rutas, middleware de auth,
servicios, Prisma y la base de datos. Es el test que más confianza da.

---

## 4. La base de datos de prueba (importante)

Los tests **NO tocan tu base de datos de desarrollo** (`dev.db`). Usan una
desechable y aislada:

- En `apps/backend/vitest.config.ts` definimos variables de entorno solo para los
  tests: `DATABASE_URL = "file:./test.db"`, un `JWT_SECRET` de prueba, etc.
- Antes de toda la suite, `apps/backend/test/globalSetup.ts` **borra y recrea**
  `prisma/test.db` con el esquema actual (`prisma db push`).

Resultado: cada ejecución parte de una base de datos **limpia y reproducible**.
Puedes correr los tests mil veces y siempre dan lo mismo. `test.db` está ignorada
por git (no se sube).

---

## 5. Cómo ejecutarlos

Desde la raíz del proyecto:

```bash
npm test            # ejecuta TODA la suite (shared + backend)
```

Solo una parte:

```bash
npm run test --workspace @pace/shared    # solo el motor de decisión
npm run test --workspace @pace/backend   # solo el backend
```

Modo **watch** (se re-ejecuta solo al guardar un archivo — ideal mientras programas):

```bash
npm run test:watch --workspace @pace/backend
```

Salida esperada (resumida):

```
✓ src/decision.test.ts        (11 tests)
✓ test/crypto.test.ts          (3 tests)
✓ test/categorization.test.ts  (4 tests)
✓ test/mockProvider.test.ts    (4 tests)
✓ test/api.integration.test.ts (8 tests)

Test Files  5 passed
     Tests  30 passed
```

---

## 6. Cómo añadir un test nuevo (receta)

1. Crea un archivo que acabe en `.test.ts` (Vitest los encuentra solos).
2. Importa lo que quieres probar y las utilidades de Vitest.
3. Escribe `it("describe qué esperas", () => { ... })` con un `expect`.

Ejemplo mínimo:

```ts
import { describe, it, expect } from "vitest";
import { evaluateDecision } from "./decision";

describe("mi caso nuevo", () => {
  it("dice no cuando no llega el dinero", () => {
    const r = evaluateDecision({
      amount: 1000,
      currentBalance: 100,
      upcomingCommitments: 0,
      safetyBuffer: 50,
      currency: "EUR",
    });
    expect(r.verdict).toBe("no");
  });
});
```

**Buen hábito:** cuando aparezca un bug, antes de arreglarlo escribe un test que lo
reproduzca (se pone 🔴). Luego arréglalo hasta que se ponga 🟢. Así ese bug **nunca
vuelve** sin que te enteres.

`expect` más usados: `.toBe(x)` (igualdad exacta), `.toEqual(obj)` (compara
contenido de objetos/arrays), `.toBeGreaterThan(n)`, `.toContain(x)`,
`.toThrow()` (esperar que lance error).

---

## 7. CI: los tests se ejecutan solos en cada push (GitHub Actions)

**CI** (*Continuous Integration*, integración continua) significa: cada vez que
subes código a GitHub, un servidor **ejecuta los tests por ti automáticamente**. Si
algo se rompe, GitHub te lo marca en rojo (✗) antes de que ese código se mezcle en
la rama principal. Tú no tienes que acordarte de nada.

La configuración vive en `.github/workflows/ci.yml`. Un *workflow* es una receta de
pasos que GitHub ejecuta en una máquina limpia (aquí, Ubuntu) que se crea desde cero
cada vez.

### Cuándo se dispara

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

→ en cada **push a `main`** y en cada **pull request hacia `main`**.

### Qué hace, paso a paso

| Paso | Comando | Para qué |
|---|---|---|
| 1. Checkout | `actions/checkout` | Descarga tu código en la máquina del CI. |
| 2. Node.js | `actions/setup-node` (v20) | Instala Node y cachea npm (más rápido). |
| 3. Install | `npm ci` | Instala dependencias **exactas** del `package-lock.json`. |
| 4. Build shared | `npm run build:shared` | El backend importa `@pace/shared` desde su build, hay que compilarlo antes. |
| 5. Prisma | `npm run db:generate` | Genera el cliente de Prisma (código para hablar con la BBDD). |
| 6. Typecheck | `npm run typecheck` | Falla si hay errores de tipos de TypeScript. |
| 7. Tests | `npm test` | Ejecuta toda la suite (incluida la de integración con su BBDD desechable). |

> ¿Por qué `npm ci` y no `npm install`? `npm ci` instala **exactamente** las
> versiones del lockfile y parte de cero: es la opción reproducible y recomendada
> para CI. `npm install` puede actualizar versiones y modificar el lockfile.

### Cómo ver el resultado

En GitHub, pestaña **Actions** (o el ✓/✗ verde/rojo junto a cada commit y en cada
pull request). Si está rojo, abres el job y ves **exactamente qué test falló** y por
qué, con el log completo.

### 7.1 Branch protection (proteger `main`)

El CI te avisa si algo se rompe, pero por sí solo **no impide** mezclar código roto
en `main`. La *branch protection* añade esa regla: *"no se puede mergear a `main` si
el CI no está verde"*. Es lo que usan los equipos profesionales.

> **Requisito previo:** el workflow tiene que haberse ejecutado **al menos una vez**
> en GitHub (con un push o PR), para que el check `Typecheck & tests` aparezca en la
> lista de checks seleccionables.

Pasos (web de GitHub, opción clásica):

1. Abre el repo → **Settings** (Ajustes).
2. Menú lateral → **Branches**.
3. En *Branch protection rules* → **Add branch protection rule**.
4. **Branch name pattern:** `main`
5. Marca **Require a pull request before merging** (obliga a usar PRs; recomendado).
6. Marca **Require status checks to pass before merging**.
7. En el buscador de checks, escribe y selecciona **`Typecheck & tests`** (es el
   nombre del *job* definido en `ci.yml`).
8. (Opcional) Marca **Require branches to be up to date before merging** para que el
   PR se testee contra la última versión de `main`.
9. **Create** / **Save changes**.

A partir de ahí, cualquier PR hacia `main` mostrará el check y el botón de merge
estará bloqueado hasta que esté en verde.

> Alternativa moderna: GitHub **Rulesets** (Settings → Rules → Rulesets) hace lo
> mismo con más opciones. Para empezar, la regla clásica de arriba es suficiente.

---

## 8. Siguiente nivel (cuando crezcas)

- **Cobertura**: `vitest run --coverage` te dice qué % del código está probado.
- **Branch protection** en GitHub: exigir que el CI esté verde para poder hacer
  merge a `main` (Settings → Branches → Add rule).
- **Más integración**: probar errores (saldo insuficiente, token caducado del banco,
  reintentos de sincronización).
- **Tests en el móvil**: con `@testing-library/react-native` para las pantallas.
