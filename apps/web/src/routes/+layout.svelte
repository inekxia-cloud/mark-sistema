<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getUser, clearSession } from '$lib/api.js';
  import { goto } from '$app/navigation';

  let user;

  onMount(() => {
    user = getUser();
  });

  function logout() {
    clearSession();
    user = null;
    goto('/');
  }
</script>

<nav class="nav">
  <a href="/" class="brand">SISTEMAIA</a>
  <div class="links">
    <a href="/" class:active={$page.url.pathname === '/'}>Catálogo</a>
    <a href="/mapa" class:active={$page.url.pathname === '/mapa'}>Mapa</a>
    {#if user}
      <a href="/admin" class:active={$page.url.pathname === '/admin'}>Administrar</a>
      <span class="user">{user.full_name}</span>
      <button class="btn-link" on:click={logout}>Salir</button>
    {:else}
      <a href="/login" class:active={$page.url.pathname === '/login'}>Entrar</a>
      <a href="/registro" class="btn" class:active={$page.url.pathname === '/registro'}>Registro</a>
    {/if}
  </div>
</nav>

<main class="container">
  <slot />
</main>

<footer class="footer">
  Patrimonio gastronómico tradicional de Ciudad Juárez · Zona Centro, Av. Juárez, Mercado Cuauhtémoc
</footer>
