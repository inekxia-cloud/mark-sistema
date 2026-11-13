<script>
  import { goto } from '$app/navigation';
  import { authApi, setSession } from '$lib/api.js';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function submit(e) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const { token, user } = await authApi.login({ email, password });
      setSession(token, user);
      goto('/');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Entrar — SISTEMAIA</title></svelte:head>

<div class="card auth-box">
  <h2 style="margin-top:0">Entrar</h2>
  {#if error}<p class="error">{error}</p>{/if}
  <form on:submit={submit}>
    <label for="email">Correo</label>
    <input id="email" type="email" bind:value={email} required />
    <label for="password">Contraseña</label>
    <input id="password" type="password" bind:value={password} required minlength="8" />
    <button class="btn" type="submit" disabled={loading}>
      {loading ? 'Entrando…' : 'Entrar'}
    </button>
  </form>
  <p style="color:var(--muted);font-size:0.9rem">
    ¿No tienes cuenta? <a href="/registro">Regístrate</a>
  </p>
</div>
