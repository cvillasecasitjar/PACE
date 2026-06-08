# Cómo funciona Pace cuando lo ejecutas (entorno de desarrollo) ⚙️

> La [Guía del proyecto](./GUIA_DEL_PROYECTO.md) explica **el código** (qué hace cada
> archivo). Este documento explica **lo que pasa cuando lo arrancas**: qué programas se
> ejecutan, en qué máquina, cómo se hablan entre ellos, y por qué a veces sale
> "network error" o errores de versiones. Pensado para que entiendas el panorama
> aunque no hayas programado nunca.

---

## 1. La idea clave: hay DOS ordenadores hablando 💻📱

Cuando pruebas la app en tu iPhone, **no hay un solo aparato, hay dos**, y tienen que
hablarse por la red Wi-Fi:

```
   TU PC (Windows)                         TU MÓVIL (iPhone)
 ┌────────────────────────┐            ┌────────────────────────┐
 │                        │            │                        │
 │  1) Backend (cocina)   │            │   Expo Go (app)        │
 │     Node + Express     │◀───────────│   ejecuta tu app Pace  │
 │     escucha en :4000   │   Wi-Fi    │                        │
 │                        │            │                        │
 │  2) Metro / Expo       │◀───────────│   descarga el código   │
 │     empaqueta la app   │   Wi-Fi    │   de la app desde aquí  │
 │     escucha en :8081   │            │                        │
 └────────────────────────┘            └────────────────────────┘
        misma red Wi-Fi  ⇄  misma red Wi-Fi
```

Para que todo funcione, **las dos máquinas deben estar en la misma red Wi-Fi**, y en tu
PC tienen que estar corriendo **dos programas a la vez**:

1. **El backend** (la "cocina"): el cerebro que guarda usuarios, transacciones y hace los
   cálculos. Escucha en el puerto **4000**.
2. **Metro / Expo** (el "repartidor"): empaqueta el código de la app y se lo envía al
   móvil. Escucha en el puerto **8081**.

Tu móvil, con la app **Expo Go**, se conecta a los dos.

---

## 2. ¿Qué es cada programa? (glosario del entorno)

| Pieza | Qué es | Dónde corre |
|---|---|---|
| **Node.js** | El motor que ejecuta JavaScript fuera del navegador. Sin él no arranca ni el backend ni Expo. | Tu PC |
| **Backend** | Tu servidor (Express). Atiende peticiones como "iniciar sesión" o "dame el dashboard". | Tu PC, puerto 4000 |
| **Expo** | Un conjunto de herramientas que hace fácil crear y probar apps React Native sin instalar Xcode/Android Studio. | Tu PC |
| **Metro** | El "empaquetador" de Expo: junta todos tus archivos `.tsx` en un paquete que el móvil entiende, y lo va actualizando en caliente. | Tu PC, puerto 8081 |
| **Expo Go** | Una app gratuita que instalas en tu iPhone desde la App Store. Es un "contenedor" que ejecuta tu app sin tener que publicarla. | Tu móvil |
| **Wi-Fi** | El cable invisible que conecta las dos máquinas. Si están en redes distintas, no se ven. | Entre ambos |

> 💡 **Por qué Expo Go:** publicar una app en la App Store lleva días y cuenta de pago.
> Expo Go te deja ver tu app en el móvil real **al instante**, escaneando un QR. Ideal
> para desarrollar.

---

## 3. El "network error" al iniciar sesión, explicado 🔴

Este es el error que acabas de tener. La causa es una trampa muy típica: **`localhost`**.

- En tu PC, `localhost` significa "yo mismo, este ordenador". El backend vive ahí.
- Pero cuando el **móvil** dice `localhost`, se refiere a **sí mismo (el móvil)**, no a
  tu PC. Y en el móvil no hay ningún backend → "network error".

**La solución:** decirle a la app la **dirección IP real de tu PC en la red Wi-Fi**
(algo como `192.168.1.162`), en vez de `localhost`.

```
❌ Móvil → http://localhost:4000      → "me busco a mí mismo" → no hay nada → error
✅ Móvil → http://192.168.1.162:4000  → "busco a tu PC en la Wi-Fi" → ✔ conecta
```

### Cómo está resuelto en este proyecto

1. El archivo `apps/mobile/src/api/config.ts` decide la dirección del backend. Si existe
   la variable `EXPO_PUBLIC_API_URL`, la usa; si no, cae en `localhost` (que solo sirve
   para web o simulador).
2. Hemos creado el archivo **`apps/mobile/.env`** con tu IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.162:4000
```

3. Expo lee ese archivo al arrancar y se lo inyecta a la app. Por eso, **cada vez que
   cambies el `.env` tienes que reiniciar Expo** (parar y volver a `npm run mobile`).

> ⚠️ **Tu IP puede cambiar** (al reiniciar el router, cambiar de Wi-Fi, ir a otra casa).
> Si un día vuelve el "network error", lo más probable es que tu IP haya cambiado.
> Para verla en Windows: abre PowerShell y escribe `ipconfig`; busca la línea
> **"Dirección IPv4"** de tu adaptador **Wi-Fi**. Actualiza el `.env` y reinicia Expo.

> 🔌 **Plan B sin IP (modo túnel):** si tu red bloquea la conexión directa (Wi-Fi de
> universidad, etc.), puedes usar `npm run mobile:tunnel`. Expo crea un túnel por
> internet, más lento pero atraviesa casi cualquier red. En ese caso la app igualmente
> necesita el backend; el túnel es solo para cargar la app.

---

## 4. El lío de la versión de Node (lo que acabamos de arreglar) 🟢

Hace un rato la app no arrancaba con un error raro (`toReversed is not a function`). La
causa: tu PC tenía instaladas **dos versiones de Node** a la vez (la 18 y la 22), y se
estaba usando la **18**, que es demasiado antigua para las herramientas nuevas de Expo.

- **nvm** ("Node Version Manager") es un programa para tener varias versiones de Node y
  cambiar entre ellas.
- En Windows, cambiar la versión "oficial" (`nvm use`) **requiere permisos de
  administrador**, que tú no tienes.
- **La vuelta sin admin:** hemos creado tu *perfil de PowerShell*
  (`Documents\WindowsPowerShell\profile.ps1`), un archivo tuyo que se ejecuta solo al
  abrir cada terminal y pone Node 22 por delante. Así, sin tocar nada del sistema, cada
  terminal nueva usa la versión correcta.

> Para comprobar qué versión usas: abre una terminal nueva y escribe `node --version`.
> Debe decir `v22.x`. Si dijera `v18.x`, cierra la terminal y abre una nueva.

---

## 5. Cómo arrancar todo, paso a paso (tu rutina diaria) 🚀

Necesitas **dos terminales abiertas a la vez** (porque son dos programas que corren en
paralelo). En Cursor puedes abrir varias con el `+` del panel de terminal.

**Terminal 1 — la cocina (backend):**

```bash
npm run backend
```

Espera a ver `🟢 Pace backend listening on http://localhost:4000`. Déjala abierta.

**Terminal 2 — el repartidor (Expo):**

```bash
npm run mobile
```

Aparecerá un **código QR**. Con el iPhone:

1. Asegúrate de que el móvil está en la **misma Wi-Fi** que el PC.
2. Abre la app **Cámara** (o Expo Go) y **escanea el QR**.
3. Se abre Expo Go y carga tu app Pace.

**Inicia sesión con la cuenta demo:**

```
email:    demo@pace.app
password: pace1234
```

> 💡 Mientras editas código, Metro recarga la app en el móvil sola (*hot reload*). Si se
> queda rara, agita el móvil para abrir el menú de Expo y pulsa **Reload**.

---

## 6. Qué pasa por dentro cuando inicias sesión 🔍

Para atar todo lo anterior, este es el viaje completo del botón "Iniciar sesión":

1. **Móvil (LoginScreen):** escribes email y contraseña y pulsas el botón.
2. **`api/client.ts` (axios):** prepara una petición `POST` a
   `http://192.168.1.162:4000/api/auth/login` (¡la IP del `.env`, no localhost!).
3. **Wi-Fi:** la petición viaja del móvil a tu PC.
4. **Backend (`routes/auth.ts`):** comprueba que el email existe y que la contraseña
   coincide (comparando con la versión cifrada con `bcrypt`).
5. **Backend:** si todo está bien, genera un **token JWT** (un "carnet" firmado) y
   devuelve tu usuario + el token en formato JSON.
6. **Wi-Fi:** la respuesta vuelve al móvil.
7. **Móvil (`store/auth.ts`):** guarda el token en el almacenamiento seguro del teléfono
   y te lleva al dashboard. A partir de ahí, cada petición lleva ese carnet para
   demostrar quién eres.

Si en el **paso 3** la dirección fuera `localhost`, la petición nunca saldría del móvil
→ **"network error"**. Por eso el `.env` lo arregla.

---

## 7. Tabla de problemas frecuentes 🩺

| Síntoma | Causa probable | Solución |
|---|---|---|
| **"Network error" al iniciar sesión** | La app apunta a `localhost` o a una IP vieja | Revisa `apps/mobile/.env`, pon tu IP actual (`ipconfig`), reinicia Expo |
| **"Network error" pero la IP es correcta** | El backend no está corriendo, o están en redes Wi-Fi distintas | Arranca `npm run backend`; conecta móvil y PC a la misma Wi-Fi |
| **El QR no carga / se queda cargando** | Firewall de Windows o red que aísla dispositivos | Prueba `npm run mobile:tunnel` |
| **"SDK mismatch" en Expo Go** | La versión de Expo Go del móvil no coincide con la del proyecto | Ya está alineado en SDK 54; actualiza Expo Go en la App Store si hace falta |
| **`toReversed is not a function`** | Terminal usando Node 18 | Abre terminal nueva; `node --version` debe ser `v22.x` |
| **`node --version` da v18** | El perfil no se aplicó | Cierra TODAS las terminales y abre una nueva |
| **Cambié el `.env` y no surte efecto** | Expo inyecta el `.env` solo al arrancar | Para Expo (Ctrl+C) y vuelve a `npm run mobile` |

---

## 8. Resumen en una frase

> Tu **PC** ejecuta el cerebro (backend, puerto 4000) y el repartidor de la app (Expo,
> puerto 8081); tu **móvil** ejecuta la app dentro de **Expo Go** y se conecta a tu PC
> por **Wi-Fi usando su IP** (no `localhost`). Si esa conexión falla, sale "network
> error". Todo lo demás (versiones de Node, QR, hot reload) son detalles para que ese
> ida y vuelta sea cómodo.
