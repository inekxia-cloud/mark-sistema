import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[api] Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env. Las llamadas a la base de datos fallarán.'
  );
}

let client = null;

function getClient() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

// Cliente con service role: solo para uso del backend (bypass de RLS).
// NUNCA exponer esta clave al frontend.
// Se instancia de forma perezosa para que el servidor arranque aunque
// falten las variables (útil en desarrollo/CI sin credenciales).
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getClient();
      const value = real[prop];
      return typeof value === 'function' ? value.bind(real) : value;
    },
  }
);
