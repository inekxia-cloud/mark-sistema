<script>
  import { goto } from '$app/navigation';
  import { authApi, setSession } from '$lib/api.js';

  let full_name = '';
  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function submit(e) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const { token, user } = await authApi.register({ full_name, email, password });
      setSession(token, user);
      goto('/');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Registro — SISTEMAIA</title></svelte:head>

<div class="card auth-box">
  <h2 style="margin-top:0">Crear cuenta</h2>
  {#if error}<p class="error">{error}</p>{/if}
  <form on:submit={submit}>
    <label for="full_name">Nombre completo</label>
    <input id="full_name" type="text" bind:value={full_name} required />
    <label for="email">Correo</label>
    <input id="email" type="email" bind:value={email} required />
    <label for="password">Contraseña (mín. 8 caracteres)</label>
    <input id="password" type="password" bind:value={password} required minlength="8" />
    <button class="btn" type="submit" disabled={loading}>
      {loading ? 'Registrando…' : 'Registrarse'}
    </button>
  </form>
  <p style="color:var(--muted);font-size:0.9rem">
    ¿Ya tienes cuenta? <a href="/login">Entra aquí</a>
  </p>
</div>
