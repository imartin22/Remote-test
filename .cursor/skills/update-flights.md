---
name: update
description: "Consulta noticias sobre paros y reporta el estado"
---

# Flight Tracker Update (Solo Noticias)

Cuando el usuario diga `/update` o pida actualizar, ejecuta estos pasos:

## 1. Obtener noticias de paros

```bash
curl -s "https://flight-tracker-rust.vercel.app/api/news"
```

## 2. Analizar las noticias

Para cada noticia relevante (relevance > 20):
- Extraer título y fuente
- Identificar si menciona cancelaciones, demoras o paros
- Calcular hace cuánto tiempo se publicó

## 3. Reportar al usuario

### 📰 Noticias Relevantes
Lista las 5 noticias más recientes con:
- Título
- Fuente
- Tiempo desde publicación
- Indicador de urgencia (🔴 alta, 🟡 media, 🟢 baja)

### ⚠️ Análisis
- Resumen de la situación actual
- Si hay riesgo para los vuelos AR1685 y AR1484
- Recomendación

## Ejemplo de output

```
📰 ACTUALIZACIÓN DE NOTICIAS

1. 🟡 "ATE postergó el paro en aeropuertos" - Perfil (hace 2h)
2. 🟡 "Postergan el paro pero habrá demoras" - Infobae (hace 3h)
...

⚠️ Análisis:
El paro fue postergado al 9 de febrero. Mañana 2 de febrero los vuelos operan normal.
Posibles demoras menores por asambleas.

✅ Recomendación: Tus vuelos deberían operar sin problemas. Llegar con tiempo extra.
```

## Nota
La API de vuelos (AviationStack) agotó su cuota mensual. Solo consultamos noticias.
