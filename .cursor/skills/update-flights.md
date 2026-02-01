---
name: update
description: "Actualiza el estado de vuelos y noticias en producción, lee las noticias y reporta el status"
---

# Flight Tracker Update

Cuando el usuario diga `/update` o pida actualizar los vuelos, ejecuta estos pasos:

## 1. Refrescar datos de vuelos en producción

Ejecuta este comando para disparar la consulta a AviationStack:

```bash
curl -s "https://flight-tracker-rust.vercel.app/api/flights?token=bariloche2026"
```

Muestra cuántos vuelos se obtuvieron y el timestamp.

## 2. Obtener noticias de paros

Ejecuta este comando para obtener las noticias:

```bash
curl -s "https://flight-tracker-rust.vercel.app/api/news"
```

## 3. Leer el contenido de las noticias

Para cada una de las 5 noticias más relevantes:
- Extrae la URL del campo `link`
- Usa WebFetch o navegación para leer el contenido de cada artículo
- Resume el contenido en 1-2 oraciones

## 4. Reportar al usuario

Presenta un resumen con:

### Estado de Vuelos
- Lista de vuelos AR1685 y AR1484 con su estado actual
- Cualquier cambio en estado, delays o gates

### Noticias Relevantes
- Las 5 noticias con su resumen
- Indicar si alguna menciona cancelaciones o afectaciones

### Conclusión
- Si hay riesgo para los vuelos del usuario basado en las noticias
- Recomendación si es necesario tomar acción

## Ejemplo de output

```
✈️ ACTUALIZACIÓN DE VUELOS

📊 Vuelos monitoreados:
- AR1685 (BRC→AEP): Programado 15:20 | Gate: 4
- AR1484 (AEP→TUC): Programado 19:05 | Gate: pendiente

📰 Noticias (5):
1. "Título..." - Resumen del contenido
2. "Título..." - Resumen del contenido
...

⚠️ Análisis: [Hay/No hay] menciones de cancelaciones que afecten tus vuelos.
```
