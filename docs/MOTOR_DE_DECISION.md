# Motor de decisión de Pace — cómo piensa "¿Puedo permitírmelo?"

> Documento técnico-divulgativo. Explica **qué matemáticas y estadística** usa
> Pace para responder "¿puedo gastar X?", por qué están pensadas para estudiantes
> con **ingresos irregulares**, y cómo evolucionará cuando haya más usuarios.

---

## 1. Visión general: 3 niveles

| Nivel | Qué hace | Estado |
|---|---|---|
| **Nivel 0** | Fórmula fija: dinero disponible = balance − gastos fijos − colchón | ✅ implementado |
| **Nivel 1** | **Personalización estadística**: aprende tu ritmo de gasto y tu ciclo de ingresos | ✅ implementado |
| **Nivel 2** | Colchón adaptativo según tu volatilidad de gasto | 🔜 futuro |
| **Nivel 3** | Machine Learning real (predicción de gasto) | 🔜 con muchos usuarios |

Este documento cubre sobre todo el **Nivel 1**, que es el que acabamos de añadir.

---

## 2. Nivel 0 — la base (fórmula determinista)

Vive en `packages/shared/src/decision.ts`, función `evaluateDecision()`.

```
dineroDisponible = balanceActual − gastosFijosPendientes − colchónDeSeguridad
sobranteTrasGasto = dineroDisponible − importeQueQuieresGastar
```

- **balanceActual**: la suma del saldo de tus cuentas.
- **gastosFijosPendientes**: las suscripciones/alquiler/etc. que aún no se han
  cobrado este mes (lo calcula `getUpcomingCommitments`).
- **colchónDeSeguridad**: el dinero intocable que tú defines.

Veredicto (semáforo):
- `sobranteTrasGasto < 0` → **NO** (te pasarías del colchón).
- `sobranteTrasGasto < banda_de_precaución` → **PRECAUCIÓN**.
- en otro caso → **SÍ**.

La "banda de precaución" del Nivel 0 es un 15 % del dinero disponible (mínimo 10 €):
un colchón extra para avisar antes de quedarte demasiado justo.

**Limitación:** es igual para todo el mundo. No sabe si tu próximo ingreso es mañana
o dentro de 25 días. Para un estudiante con beca irregular, eso importa muchísimo.

---

## 3. Nivel 1 — personalización (lo nuevo) ⭐

Vive en `apps/backend/src/services/personalization.ts`. Aprende **dos números** del
historial real de cada usuario y se los pasa a la fórmula como "contexto".

### 3.1. Ritmo de gasto diario (`typicalDailySpend`)

> *"¿Cuánto gasta de media esta persona al día en cosas de ocio?"*

**Cómo se calcula:**
1. Cogemos los gastos (importes negativos) de los **últimos 60 días**.
2. Nos quedamos solo con las categorías **discrecionales** ("fun money":
   restaurantes, ocio, compras… — definido en `packages/shared/src/categories.ts`
   con la propiedad `discretionary`). Excluimos alquiler, facturas, etc.
3. Sumamos todo y dividimos entre 60 (la ventana completa):

```
ritmoDiario = Σ(gastos discrecionales últimos 60 días) / 60
```

**¿Por qué dividir entre 60 y no entre "días con gasto"?**
Porque queremos un ritmo *realista y suavizado*. Si dividiéramos solo entre los días
que sí gastaste, los findes (donde se concentra el ocio) inflarían el número. Dividir
por la ventana completa reparte el gasto del finde entre los días de entre semana, que
es justo como funciona un presupuesto mental: "me gasto ~12 €/día de media".

> 📊 **Concepto estadístico:** esto es una **media aritmética** sobre una ventana
> móvil ("rolling window") de 60 días. Es robusta, barata y fácil de explicar.

### 3.2. Ciclo de ingresos (`daysUntilNextIncome`)

> *"¿Cuántos días faltan para que entre el próximo dinero?"*

**Cómo se calcula:**
1. Miramos los **ingresos** (importes positivos) de los **últimos 120 días**.
2. Los agrupamos por origen (ej. "Beca MEC", "Nómina parcial", "Mamá").
3. Nos quedamos con los que **se repiten en ≥ 2 meses distintos** (son recurrentes,
   no un ingreso puntual).
4. De esos, elegimos el **principal**: el de mayor importe **mediano**.
5. Calculamos su **día del mes típico** (la *mediana* de los días en que llegó) y
   proyectamos la **próxima fecha** desde hoy.

```
si díaTípico aún no ha pasado este mes → próximo ingreso = este mes, ese día
si ya pasó                              → próximo ingreso = mes que viene, ese día
díasHastaIngreso = (próxima fecha − hoy) en días   (mínimo 1)
```

**Si no detectamos ningún patrón** (usuario nuevo, sin ingresos recurrentes), usamos
un *fallback* sensato: los **días que quedan hasta fin de mes**.

> 📊 **¿Por qué la MEDIANA y no la media para el día e importe?**
> La mediana es **robusta a valores atípicos**. Si una beca normalmente entra el día
> 10 pero un mes llegó el día 2 por un festivo, la media se desplazaría; la mediana
> sigue diciendo "día 10". Igual con los importes: un ingreso raro y enorme no
> distorsiona la estimación.

### 3.3. Cómo cambia el veredicto

Con esos dos números, el veredicto deja de ser un porcentaje fijo y pasa a preguntar:

> *"¿Lo que me sobra tras el gasto aguanta hasta mi próximo ingreso a mi ritmo
> habitual?"*

```
necesidadProyectada = ritmoDiario × díasHastaIngreso
```

- Si `sobranteTrasGasto < 0` → **NO**.
- Si `sobranteTrasGasto < necesidadProyectada` → **PRECAUCIÓN**
  (te llega el dinero, pero a tu ritmo te quedarías corto antes del próximo ingreso).
- En otro caso → **SÍ**.

Y además devolvemos un dato muy útil para el usuario:

```
margenDiarioDespués = sobranteTrasGasto / díasHastaIngreso
```

Es decir: *"si compras esto, te quedan X €/día hasta tu próximo ingreso"*. Eso es lo
que ves en la pantalla **¿Puedo?** bajo el veredicto.

### 3.4. Ejemplo real (datos demo)

Con el usuario `demo@pace.app` el motor detectó:
- ritmo de gasto ≈ **11,67 €/día**,
- próximo ingreso (beca, día 10) en **2 días**,
- por tanto necesidad proyectada ≈ 11,67 × 2 ≈ **23 €**.

Como su dinero disponible es alto, gastar 35 € o incluso 400 € sigue dando **SÍ**,
pero mostrando cuánto le quedaría por día. Si fuese un usuario más justo y con el
ingreso lejano, la misma compra daría **PRECAUCIÓN** o **NO** automáticamente. Esa es
la diferencia frente a apps que solo miran el saldo.

---

## 4. ¿Dónde vive cada parte? (importante)

| Pieza | Archivo | Por qué ahí |
|---|---|---|
| Fórmula pura (matemática) | `packages/shared/src/decision.ts` | No toca datos; la comparten móvil y backend |
| Aprendizaje del usuario | `apps/backend/src/services/personalization.ts` | **Necesita leer la base de datos** (historial), por eso NO puede estar en `shared` |
| Orquestación | `apps/backend/src/services/finance.ts` (`runDecision`) | Junta datos + contexto y llama a la fórmula |

> 🔑 Regla de oro: **lo que necesita datos del usuario va en el backend; lo que es
> matemática pura va en `shared`.**

---

## 5. Limitaciones actuales (honestas)

- El ritmo de gasto es una **media simple**; no distingue entre semana/fin de semana
  ni tendencias (si últimamente gastas más).
- El ciclo de ingresos asume **un** ingreso principal recurrente. Un usuario con dos
  becas o ingresos muy caóticos se modela peor.
- No hay **estacionalidad** (vacaciones, inicio de curso, Navidad…).
- Es **reactivo**: usa el pasado, no predice eventos futuros concretos.

Ninguna es grave para un MVP, pero marcan el camino de mejora.

---

## 6. Próximos pasos (cuando haya más usuarios) 🚀

### Paso A — Colchón adaptativo (Nivel 2)
En vez de un colchón fijo que pone el usuario, calcularlo según su **volatilidad**:

```
volatilidad = desviación_estándar(gasto_diario)
colchónSugerido = ritmoDiario × k × (1 + volatilidad_normalizada)
```

Quien gasta de forma muy irregular necesita más colchón. Esto usa **desviación
estándar** (cuánto se desvían tus días del promedio).

### Paso B — Mejores ventanas y ponderación
- Usar **medias móviles ponderadas** (dar más peso a las últimas semanas → EWMA,
  *exponentially weighted moving average*).
- Separar **patrón entre semana vs. fin de semana**.

### Paso C — Detección de ingresos más fina
- Algoritmos de **periodicidad** (autocorrelación) para detectar ciclos semanales,
  quincenales o mensuales automáticamente, sin asumir "una vez al mes".

### Paso D — Machine Learning real (Nivel 3)
Cuando tengas **miles de usuarios** y suficientes datos:
- **Modelo de regresión** que prediga el gasto de los próximos N días a partir de:
  día de la semana, días desde el último ingreso, saldo, categoría, histórico, etc.
- **Modelos por segmento** (clustering de usuarios con hábitos parecidos) para que un
  usuario nuevo herede un buen punto de partida (resuelve el problema del "arranque
  en frío", *cold start*).
- Entrenamiento **offline** (en un servidor aparte, no en el móvil ni en cada
  petición). El móvil solo consume el resultado.

### Consideraciones de datos y ética
- **Privacidad/GDPR:** entrenar con datos agregados/anonimizados; nunca exponer datos
  de un usuario a otro.
- **Explicabilidad:** mantener siempre un "porqué" legible ("te quedan X €/día"), no
  una caja negra. Es parte de la propuesta de valor de Pace.
- **Sesgo:** vigilar que el modelo no penalice injustamente perfiles con ingresos muy
  bajos o irregulares (justo el público objetivo).

---

## 7. Resumen en una frase

> El Nivel 1 convierte "¿tengo el dinero?" en "**¿lo que me quedaría aguanta hasta mi
> próximo ingreso a mi ritmo habitual?**", usando una **media móvil** de gasto diario
> y la **mediana** del día de cobro — estadística sencilla, robusta y explicable,
> pensada para ingresos irregulares.
