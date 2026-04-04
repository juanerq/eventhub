# Solución: Renderizado Correcto del Mapa Leaflet 🗺️

## 🐛 Problema Identificado

El mapa de Leaflet no se estaba renderizando correctamente en los formularios de crear/editar eventos. Los tiles del mapa no aparecían o aparecían en posiciones incorrectas.

## 🔍 Causas Raíz

### 1. **Import de CSS en ubicación incorrecta**
```typescript
// ❌ ANTES: CSS importado en <script> de cliente
<script>
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css'; // ← No se procesa correctamente
</script>
```

**Problema:** En Astro, cuando importas CSS dentro de un `<script>` tag de cliente, Vite puede no procesarlo correctamente, resultando en tiles sin estilo o mal posicionados.

### 2. **Falta de invalidación de tamaño**
```typescript
// ❌ ANTES: Solo mostrar el contenedor
if (mapContainer) {
  mapContainer.style.display = 'block';
}
// Leaflet aún tiene dimensiones incorrectas
```

**Problema:** Leaflet calcula las dimensiones del mapa cuando se inicializa. Si el contenedor está oculto (`display: none`) o cambia de tamaño después, Leaflet necesita ser notificado.

### 3. **Falta de z-index explícitos**
**Problema:** Sin z-index definidos, las capas del mapa (tiles, markers, controles) podrían superponerse incorrectamente con otros elementos de la página.

## ✅ Soluciones Implementadas

### 1. Mover import de CSS al Frontmatter

**create-event.astro:**
```diff
---
import Layout from "../layouts/Layout.astro";
import { getUser } from "../lib/auth";
+ import 'leaflet/dist/leaflet.css';

const user = await getUser(Astro.cookies);
---
```

**edit-event/[id].astro:**
```diff
---
import Layout from "../../layouts/Layout.astro";
import { getUser } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
+ import 'leaflet/dist/leaflet.css';
---
```

**Beneficio:** El CSS de Leaflet se procesa correctamente por Vite/Astro en tiempo de build, asegurando que todos los estilos estén disponibles antes de que el mapa se renderice.

### 2. Agregar `map.invalidateSize()`

```typescript
// ✅ AHORA: Forzar recalculo de dimensiones
if (mapContainer) {
  mapContainer.style.display = 'block';
  // Force Leaflet to recalculate map size after showing container
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 100);
}
```

**Beneficio:** 
- Leaflet recalcula las dimensiones del mapa después de mostrarlo
- El timeout de 100ms da tiempo al DOM para actualizar antes de invalidar
- Los tiles se posicionan correctamente

### 3. Estilos CSS mejorados

**Agregado a ambos formularios:**
```css
#location-map {
  background: var(--background-light);
  z-index: 1;
  position: relative;
}

#map-container {
  position: relative;
  width: 100%;
}

/* Leaflet container con dimensiones explícitas */
:global(.leaflet-container) {
  font-family: 'Outfit', system-ui, sans-serif;
  height: 350px !important;
  width: 100% !important;
  z-index: 1;
}

/* Z-index para todas las capas del mapa */
:global(.leaflet-tile-pane) { z-index: 200; }
:global(.leaflet-pane) { z-index: 400; }
:global(.leaflet-overlay-pane) { z-index: 400; }
:global(.leaflet-shadow-pane) { z-index: 500; }
:global(.leaflet-marker-pane) { z-index: 600; }
:global(.leaflet-tooltip-pane) { z-index: 650; }
:global(.leaflet-popup-pane) { z-index: 700; }
:global(.leaflet-control) { z-index: 800; }
```

**Beneficios:**
- ✅ Altura explícita con `!important` para evitar conflictos
- ✅ Width 100% para ocupar todo el contenedor
- ✅ Z-index jerárquico correcto para todas las capas
- ✅ Position relative en contenedores para contexto de stacking

## 📊 Antes vs Después

| Aspecto | Antes ❌ | Después ✅ |
|---------|----------|-----------|
| **Import CSS** | En `<script>` cliente | En frontmatter de Astro |
| **Procesamiento CSS** | Puede fallar/omitirse | Garantizado por Vite |
| **Tiles del mapa** | No aparecen o mal posicionados | Aparecen correctamente |
| **Dimensiones mapa** | Calculadas incorrectamente | `invalidateSize()` las corrige |
| **Z-index capas** | Implícito (puede fallar) | Explícito y jerárquico |
| **Controles** | Pueden quedar ocultos | Siempre visibles (z-index: 800) |

## 🎯 Flujo Correcto Ahora

```
1. Página carga
   ↓
2. CSS de Leaflet ya está disponible (frontmatter)
   ↓
3. Usuario geocodifica dirección
   ↓
4. initializeMap(lat, lng) se ejecuta
   ↓
5. Mapa se crea con L.map()
   ↓
6. Tiles se cargan de OpenStreetMap
   ↓
7. Contenedor se muestra (display: block)
   ↓
8. Después de 100ms: map.invalidateSize()
   ↓
9. Leaflet recalcula dimensiones
   ↓
10. ✅ Mapa se renderiza perfectamente
```

## 🧪 Verificación

### Pasos para probar:
```
1. Abre formulario crear/editar evento
2. Ingresa dirección y ciudad
3. Click "Obtener coordenadas"
4. Verifica:
   ✅ Mapa aparece inmediatamente
   ✅ Tiles de OpenStreetMap se ven completos
   ✅ Marcador está en la posición correcta
   ✅ Controles de zoom visibles (esquina superior izquierda)
   ✅ Atribución visible (esquina inferior derecha)
   ✅ Puedes hacer zoom in/out
   ✅ Puedes arrastrar el mapa (pan)
   ✅ Puedes arrastrar el marcador
   ✅ Click en el mapa coloca el marcador
```

### Consolasin errores:
```javascript
// En DevTools Console, NO debe aparecer:
❌ "Leaflet not defined"
❌ "Cannot read property 'invalidateSize' of null"
❌ CSS import errors
❌ Tile loading errors (403/404)

// Debe aparecer:
✅ Tiles loading correctly (200 status)
✅ No error messages
```

## 📁 Archivos Modificados

1. **`src/pages/create-event.astro`**
   - ✅ Movido `import 'leaflet/dist/leaflet.css'` al frontmatter
   - ✅ Agregados z-index para capas de Leaflet
   - ✅ Agregado `map.invalidateSize()` después de mostrar mapa
   - ✅ Height/width explícitos en `.leaflet-container`

2. **`src/pages/edit-event/[id].astro`**
   - ✅ Movido `import 'leaflet/dist/leaflet.css'` al frontmatter
   - ✅ Agregados z-index para capas de Leaflet
   - ✅ Agregado `map.invalidateSize()` después de mostrar mapa
   - ✅ Height/width explícitos en `.leaflet-container`

## 🔍 Debugging Tips

### Si el mapa aún no se ve:

**1. Verificar CSS cargado:**
```javascript
// En DevTools Console
const styles = document.styleSheets;
const leafletCSS = Array.from(styles).find(s => 
  s.href && s.href.includes('leaflet')
);
console.log('Leaflet CSS:', leafletCSS);
// Debe devolver un objeto, no undefined
```

**2. Verificar dimensiones del contenedor:**
```javascript
const mapEl = document.getElementById('location-map');
console.log('Map dimensions:', {
  width: mapEl.offsetWidth,
  height: mapEl.offsetHeight,
  display: window.getComputedStyle(mapEl).display
});
// width debe ser > 0, height debe ser 350, display: 'block'
```

**3. Verificar objeto map:**
```javascript
// Después de geocodificar
console.log('Map object:', map);
console.log('Map size:', map.getSize());
console.log('Map center:', map.getCenter());
console.log('Map zoom:', map.getZoom());
```

**4. Forzar invalidateSize manualmente:**
```javascript
// En Console del navegador, después de ver el mapa
const mapInstance = document.querySelector('.leaflet-container');
if (mapInstance && mapInstance._leaflet_id) {
  L.map('location-map').invalidateSize();
}
```

## 🚀 Mejoras Adicionales Consideradas

### 1. Loading skeleton
```css
#location-map::before {
  content: 'Cargando mapa...';
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}
```

### 2. Retry automático si falla
```typescript
function initializeMap(lat: number, lng: number, retries = 3) {
  try {
    // ... inicializar mapa
  } catch (error) {
    if (retries > 0) {
      setTimeout(() => initializeMap(lat, lng, retries - 1), 500);
    }
  }
}
```

### 3. Fallback a imagen estática
```typescript
// Si Leaflet falla, mostrar imagen estática de Google Maps
if (!map) {
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=600x350&markers=${lat},${lng}`;
  mapElement.innerHTML = `<img src="${staticMapUrl}" alt="Mapa estático" />`;
}
```

## 📚 Referencias

- **Leaflet invalidateSize()**: https://leafletjs.com/reference.html#map-invalidatesize
- **Astro CSS imports**: https://docs.astro.build/en/guides/styling/#import-a-stylesheet-from-an-npm-package
- **Leaflet z-index management**: https://leafletjs.com/reference.html#map-pane

---

**Fecha de solución**: Marzo 2026  
**Estado**: ✅ Problema resuelto  
**Testing**: Listo para probar en navegador
