---
name: update
description: "Busca el estado de los vuelos AR1685 y AR1484 en internet y consulta noticias sobre paros"
---

# Flight Tracker Update

Cuando el usuario diga `/update` o pida actualizar, ejecuta estos pasos:

## 1. Buscar estado de vuelos en internet

Busca información actualizada sobre estos vuelos específicos:

- **AR1685**: Bariloche (BRC) → Aeroparque (AEP), 2 Feb 2026, 15:20
- **AR1484**: Aeroparque (AEP) → Tucumán (TUC), 2 Feb 2026, 19:05

Fuentes a consultar:
1. Google: buscar "AR1685 estado vuelo" y "AR1484 estado vuelo"
2. FlightAware: https://flightaware.com/live/flight/ARG1685 y https://flightaware.com/live/flight/ARG1484
3. Aerolíneas Argentinas: https://www.aerolineas.com.ar

Usar WebFetch o búsqueda web para obtener la información.

## 2. Obtener noticias de paros

```bash
curl -s "https://flight-tracker-rust.vercel.app/api/news"
```

## 3. Reportar al usuario

### ✈️ Estado de Vuelos

Para cada vuelo mostrar:
- Número de vuelo
- Ruta y horario programado
- Estado actual (si se encontró)
- Gate/Terminal (si disponible)
- Cualquier demora o cambio

### 📰 Noticias Relevantes

Las 5 noticias más recientes sobre paros con:
- Título y fuente
- Indicador de urgencia
- Resumen breve

### ⚠️ Análisis y Recomendación

- Evaluación del riesgo para los vuelos
- Recomendación de acción

## Ejemplo de output

```
✈️ ESTADO DE VUELOS (2 Feb 2026)

AR1685 | BRC → AEP | 15:20
Estado: [Programado/En hora/Demorado]
Gate: [Si disponible]

AR1484 | AEP → TUC | 19:05  
Estado: [Programado/En hora/Demorado]
Gate: [Si disponible]

📰 NOTICIAS (5 más recientes)
1. "Título..." - Fuente (hace Xh)
...

⚠️ ANÁLISIS
[Resumen de situación y recomendación]
```
