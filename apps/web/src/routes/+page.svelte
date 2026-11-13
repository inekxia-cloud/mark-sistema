<script>
  import { onMount } from 'svelte';
  import { gastronomyApi } from '$lib/api.js';

  const CATEGORIAS = {
    fonda: 'Fonda',
    platillo: 'Platillo',
    mercado: 'Mercado',
    bebida: 'Bebida',
    postre: 'Postre',
    otro: 'Otro',
  };
  const ZONAS = {
    zona_centro: 'Zona Centro',
    avenida_juarez: 'Av. Juárez',
    mercado_cuauhtemoc: 'Mercado Cuauhtémoc',
    otra: 'Otra zona',
  };

  let items = [];
  let loading = true;
  let error = '';
  let q = '';
  let categoria = '';
  let zona = '';

  async function load() {
    loading = true;
    error = '';
    try {
      const { items: data } = await gastronomyApi.list({
        q: q || undefined,
        categoria: categoria || undefined,
        zona: zona || undefined,
      });
      items = data;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Catálogo — SISTEMAIA</title>
</svelte:head>

<section class="hero">
  <h1>Patrimonio gastronómico de Ciudad Juárez</h1>
  <p>
    Documentamos, analizamos y difundimos la cocina tradicional de la ciudad:
    fondas, platillos icónicos y mercados como el Cuauhtémoc, en la Zona Centro
    y la Avenida Juárez.
  </p>
</section>

<div class="filters">
  <input type="search" placeholder="Buscar…" bind:value={q} on:keydown={(e) => e.key === 'Enter' && load()} />
  <select bind:value={categoria} on:change={load}>
    <option value="">Todas las categorías</option>
    {#each Object.entries(CATEGORIAS) as [value, label]}
      <option {value}>{label}</option>
    {/each}
  </select>
  <select bind:value={zona} on:change={load}>
    <option value="">Todas las zonas</option>
    {#each Object.entries(ZONAS) as [value, label]}
      <option {value}>{label}</option>
    {/each}
  </select>
  <button class="btn" on:click={load}>Filtrar</button>
</div>

{#if error}
  <p class="error">{error}</p>
{/if}

{#if loading}
  <p>Cargando registros…</p>
{:else if items.length === 0}
  <p class="card">No hay registros publicados todavía.</p>
{:else}
  <div class="grid">
    {#each items as item}
      <article class="card">
        {#if item.imagen_url}
          <img src={item.imagen_url} alt={item.titulo} style="width:100%;border-radius:8px;margin-bottom:0.75rem" />
        {/if}
        <h3>{item.titulo}</h3>
        <span class="badge">{CATEGORIAS[item.categoria] || item.categoria}</span>
        <span class="badge">{ZONAS[item.zona] || item.zona}</span>
        {#if item.direccion}
          <p class="meta">{item.direccion}</p>
        {/if}
        {#if item.descripcion}
          <p>{item.descripcion}</p>
        {/if}
      </article>
    {/each}
  </div>
{/if}
