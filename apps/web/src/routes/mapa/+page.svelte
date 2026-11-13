<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getUser, geofenceApi } from '$lib/api.js';
  import 'leaflet/dist/leaflet.css';
  import 'leaflet-draw/dist/leaflet.draw.css';

  // Centro: Ciudad Juárez
  const CENTER = [31.6907, -106.4344];
  const DEFAULT_COLOR = '#b4552d';

  let user = null;
  let items = [];
  let loading = true;
  let error = '';
  let locating = true;
  let locationMsg = '';

  let L = null;
  let map = null;
  let drawnItems = null;
  let layerById = new Map();

  function styleFor(color) {
    return {
      color: color || DEFAULT_COLOR,
      fillColor: color || DEFAULT_COLOR,
      fillOpacity: 0.22,
      weight: 2,
    };
  }

  function popupHtml(item) {
    const safe = item.nombre.replace(/</g, '&lt;');
    return `<strong>Geocerca:</strong> ${safe}`;
  }

  function registerLayer(layer, item) {
    layer._geofence = item;
    layer.setStyle(styleFor(item.color));
    layer.bindPopup(popupHtml(item));
    layerById.set(item.id, layer);
    drawnItems.addLayer(layer);
  }

  function renderItem(item) {
    const group = L.geoJSON(item.geojson);
    const layers = [];
    group.eachLayer((l) => layers.push(l));
    for (const layer of layers) registerLayer(layer, item);
  }

  async function load() {
    try {
      const { items: data } = await geofenceApi.list();
      items = data;
      for (const item of data) renderItem(item);
      if (data.length && map) {
        const group = L.featureGroup(
          data.flatMap((item) => {
            const g = L.geoJSON(item.geojson);
            const arr = [];
            g.eachLayer((l) => arr.push(l));
            return arr;
          })
        );
        map.fitBounds(group.getBounds().pad(0.15));
      }
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function saveNew(layer) {
    const nombre = prompt('Nombre de la geocerca:');
    if (!nombre || !nombre.trim()) {
      drawnItems.removeLayer(layer);
      return;
    }
    const geojson = layer.toGeoJSON();
    geojson.properties = {};
    try {
      const { item } = await geofenceApi.create({
        nombre: nombre.trim(),
        geojson,
        color: DEFAULT_COLOR,
      });
      items.unshift(item);
      registerLayer(layer, item);
    } catch (e) {
      error = e.message;
      drawnItems.removeLayer(layer);
    }
  }

  function onDrawEdited(e) {
    e.layers.eachLayer(async (layer) => {
      const item = layer._geofence;
      if (!item) return;
      const geojson = layer.toGeoJSON();
      geojson.properties = {};
      try {
        await geofenceApi.update(item.id, { geojson });
        item.geojson = geojson;
      } catch (err) {
        error = err.message;
      }
    });
  }

  function onDrawDeleted(e) {
    e.layers.eachLayer((layer) => {
      const item = layer._geofence;
      if (item && confirm(`¿Eliminar la geocerca "${item.nombre}"?`)) {
        geofenceApi
          .remove(item.id)
          .then(() => {
            items = items.filter((i) => i.id !== item.id);
            layerById.delete(item.id);
          })
          .catch((err) => (error = err.message));
      }
    });
  }

  function flyTo(item) {
    const layer = layerById.get(item.id);
    if (layer && map) map.flyToBounds(layer.getBounds().pad(0.3));
  }

  async function removeItem(item) {
    if (!confirm(`¿Eliminar la geocerca "${item.nombre}"?`)) return;
    try {
      await geofenceApi.remove(item.id);
      items = items.filter((i) => i.id !== item.id);
      const layer = layerById.get(item.id);
      if (layer) {
        drawnItems.removeLayer(layer);
        layerById.delete(item.id);
      }
    } catch (e) {
      error = e.message;
    }
  }

  onMount(async () => {
    user = getUser();

    const mod = await import('leaflet');
    L = mod.default;
    // leaflet-draw no es ESM: extiende la global window.L
    window.L = L;
    await import('leaflet-draw');

    // Etiquetas en español para la barra de herramientas
    if (L.drawLocal) {
      const t = L.drawLocal.draw.toolbar;
      t.buttons.polygon = 'Dibujar polígono';
      t.buttons.rectangle = 'Dibujar rectángulo';
      t.buttons.circle = 'Dibujar círculo';
      t.buttons.circlemarker = '';
      t.buttons.marker = '';
      t.buttons.polyline = '';
      const e = L.drawLocal.edit.toolbar;
      e.buttons.edit = 'Editar geocercas';
      e.buttons.editDisabled = 'Nada que editar';
      e.buttons.remove = 'Eliminar geocercas';
      e.buttons.removeDisabled = 'Nada que eliminar';
      e.actions.save.text = 'Guardar';
      e.actions.cancel.text = 'Cancelar';
      e.actions.clearAll.text = 'Limpiar todo';
      const h = L.drawLocal.draw.handlers;
      h.polygon.tooltip.start = 'Clic para empezar el polígono';
      h.polygon.tooltip.cont = 'Clic para continuar';
      h.polygon.tooltip.end = 'Clic en el primer punto para cerrar';
      h.rectangle.tooltip.start = 'Arrastra para dibujar el rectángulo';
      h.circle.tooltip.start = 'Arrastra para dibujar el círculo';
      h.circle.radius = 'Radio';
    }

    map = L.map('map').setView(CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    drawnItems = new L.FeatureGroup().addTo(map);

    if (user) {
      const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polygon: true,
          rectangle: true,
          circle: true,
          marker: false,
          circlemarker: false,
          polyline: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (ev) => {
        // El círculo se guarda como polígono (aproximación GeoJSON)
        saveNew(ev.layer);
      });
      map.on(L.Draw.Event.EDITED, onDrawEdited);
      map.on(L.Draw.Event.DELETED, onDrawDeleted);
    }

    await load();
    map.invalidateSize();
    locateUser();
  });

  function locateUser() {
    if (!navigator.geolocation) {
      locating = false;
      locationMsg = 'Tu navegador no soporta geolocalización.';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating = false;
        const { latitude, longitude, accuracy } = pos.coords;
        L.circle([latitude, longitude], {
          radius: accuracy || 50,
          color: '#3a6ea5',
          fillColor: '#3a6ea5',
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(map);
        L.circleMarker([latitude, longitude], {
          radius: 7,
          color: '#fff',
          weight: 2,
          fillColor: '#3a6ea5',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup('<strong>Tu ubicación</strong>')
          .openPopup();
        map.flyTo([latitude, longitude], 15, { duration: 1.2 });
      },
      (err) => {
        locating = false;
        locationMsg =
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Mostrando Ciudad Juárez.'
            : 'No se pudo obtener tu ubicación.';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }
</script>

<svelte:head><title>Mapa — SISTEMAIA</title></svelte:head>

<h2>Mapa de geocercas</h2>
<p style="color:var(--muted)">
  {#if user}
    Usa la barra de herramientas (esquina superior derecha) para dibujar
    polígonos, rectángulos o círculos. Edita o elimina con el botón de
    edición. Los cambios se guardan en Supabase.
  {:else}
    Inicia sesión para dibujar y editar geocercas.
  {/if}
</p>

{#if error}<p class="error">{error}</p>{/if}
{#if locationMsg}<p class="meta">{locationMsg}</p>{/if}
{#if locating}<p class="meta">Obteniendo tu ubicación…</p>{/if}
{#if !user}
  <p><a class="btn" href="/login">Entrar</a></p>
{/if}

<div id="map"></div>

{#if !loading && items.length}
  <div class="card" style="margin-top:1rem">
    <h3 style="margin-top:0">Geocercas ({items.length})</h3>
    {#each items as item}
      <div class="geo-item">
        <span class="geo-dot" style="background:{item.color || DEFAULT_COLOR}"></span>
        <button class="btn-link" style="flex:1;text-align:left" on:click={() => flyTo(item)}>
          {item.nombre}
        </button>
        {#if user}
          <button class="danger" on:click={() => removeItem(item)}>Eliminar</button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  #map {
    height: 65vh;
    min-height: 420px;
    border-radius: 12px;
    border: 1px solid var(--border);
    z-index: 0;
  }
  .geo-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--border);
  }
  .geo-item:last-child { border-bottom: none; }
  .geo-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
