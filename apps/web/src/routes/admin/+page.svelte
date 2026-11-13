<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getUser, gastronomyApi } from '$lib/api.js';

  const CATEGORIAS = {
    fonda: 'Fonda', platillo: 'Platillo', mercado: 'Mercado',
    bebida: 'Bebida', postre: 'Postre', otro: 'Otro',
  };
  const ZONAS = {
    zona_centro: 'Zona Centro', avenida_juarez: 'Av. Juárez',
    mercado_cuauhtemoc: 'Mercado Cuauhtémoc', otra: 'Otra zona',
  };

  const emptyForm = {
    titulo: '', categoria: 'fonda', zona: 'zona_centro', direccion: '',
    descripcion: '', historia: '', imagen_url: '', estado: 'borrador',
  };

  let user;
  let items = [];
  let error = '';
  let ok = '';
  let saving = false;
  let editingId = null;
  let form = { ...emptyForm };

  async function load() {
    try {
      const { items: data } = await gastronomyApi.listAll();
      items = data;
    } catch (e) {
      error = e.message;
    }
  }

  onMount(() => {
    user = getUser();
    if (!user) goto('/login');
    else load();
  });

  function edit(item) {
    editingId = item.id;
    form = {
      titulo: item.titulo,
      categoria: item.categoria,
      zona: item.zona,
      direccion: item.direccion || '',
      descripcion: item.descripcion || '',
      historia: item.historia || '',
      imagen_url: item.imagen_url || '',
      estado: item.estado,
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    editingId = null;
    form = { ...emptyForm };
  }

  async function submit(e) {
    e.preventDefault();
    error = '';
    ok = '';
    saving = true;
    try {
      const payload = { ...form, ingredientes: [] };
      if (editingId) {
        await gastronomyApi.update(editingId, payload);
        ok = 'Registro actualizado.';
      } else {
        await gastronomyApi.create(payload);
        ok = 'Registro creado.';
      }
      reset();
      load();
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  async function toggleEstado(item) {
    const nuevo = item.estado === 'publicado' ? 'borrador' : 'publicado';
    try {
      await gastronomyApi.update(item.id, { estado: nuevo });
      load();
    } catch (e) {
      error = e.message;
    }
  }

  async function remove(item) {
    if (!confirm(`¿Eliminar "${item.titulo}"?`)) return;
    try {
      await gastronomyApi.remove(item.id);
      load();
    } catch (e) {
      error = e.message;
    }
  }
</script>

<svelte:head><title>Administrar — SISTEMAIA</title></svelte:head>

<h2>Panel de administración</h2>
{#if user}<p style="color:var(--muted)">Sesión: {user.full_name} ({user.role})</p>{/if}
{#if error}<p class="error">{error}</p>{/if}
{#if ok}<p class="ok">{ok}</p>{/if}

<div class="admin-grid">
  <div class="card">
    <h3 style="margin-top:0">{editingId ? 'Editar registro' : 'Nuevo registro'}</h3>
    <form on:submit={submit}>
      <label for="titulo">Título *</label>
      <input id="titulo" bind:value={form.titulo} required />

      <label for="categoria">Categoría *</label>
      <select id="categoria" bind:value={form.categoria}>
        {#each Object.entries(CATEGORIAS) as [v, l]}<option value={v}>{l}</option>{/each}
      </select>

      <label for="zona">Zona / corredor</label>
      <select id="zona" bind:value={form.zona}>
        {#each Object.entries(ZONAS) as [v, l]}<option value={v}>{l}</option>{/each}
      </select>

      <label for="direccion">Dirección</label>
      <input id="direccion" bind:value={form.direccion} />

      <label for="descripcion">Descripción</label>
      <textarea id="descripcion" bind:value={form.descripcion}></textarea>

      <label for="historia">Historia / contexto</label>
      <textarea id="historia" bind:value={form.historia}></textarea>

      <label for="imagen_url">URL de imagen</label>
      <input id="imagen_url" type="url" bind:value={form.imagen_url} />

      <label for="estado">Estado</label>
      <select id="estado" bind:value={form.estado}>
        <option value="borrador">Borrador</option>
        <option value="publicado">Publicado</option>
      </select>

      <button class="btn" type="submit" disabled={saving}>
        {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear'}
      </button>
      {#if editingId}
        <button type="button" class="btn-link" on:click={reset}>Cancelar edición</button>
      {/if}
    </form>
  </div>

  <div>
    <h3>Registros ({items.length})</h3>
    {#each items as item}
      <div class="card" style="margin-bottom:0.75rem">
        <strong>{item.titulo}</strong>
        <span class="badge">{CATEGORIAS[item.categoria]}</span>
        <span class="badge">{ZONAS[item.zona]}</span>
        <div style="margin-top:0.6rem;display:flex;gap:0.5rem">
          <button class="btn" style="padding:0.3rem 0.7rem;font-size:0.85rem" on:click={() => toggleEstado(item)}>
            {item.estado === 'publicado' ? 'Despublicar' : 'Publicar'}
          </button>
          <button class="btn" style="padding:0.3rem 0.7rem;font-size:0.85rem;background:var(--muted)" on:click={() => edit(item)}>
            Editar
          </button>
          <button class="danger" on:click={() => remove(item)}>Eliminar</button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  @media (max-width: 800px) {
    .admin-grid { grid-template-columns: 1fr; }
  }
</style>
