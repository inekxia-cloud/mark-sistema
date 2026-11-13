-- ============================================================
-- SISTEMAIA — Esquema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensión para gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------- Usuarios ----------
-- El backend gestiona todo el acceso con service_role (bypass RLS),
-- por lo que las tablas NO tienen políticas públicas: nadie puede
-- leerlas directamente desde el cliente.
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text,                -- bcrypt, nunca texto plano
  full_name     text not null,
  role          text not null default 'investigador'
                check (role in ('investigador', 'editor', 'admin')),
  created_at    timestamptz not null default now()
);

-- ---------- Patrimonio gastronómico ----------
create table if not exists public.patrimonio_gastronomico (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  categoria    text not null
               check (categoria in ('fonda','platillo','mercado','bebida','postre','otro')),
  zona         text not null default 'otra'
               check (zona in ('zona_centro','avenida_juarez','mercado_cuauhtemoc','otra')),
  direccion    text,
  descripcion  text,
  historia     text,
  imagen_url   text,
  ingredientes jsonb not null default '[]'::jsonb,
  estado       text not null default 'borrador'
               check (estado in ('borrador','publicado')),
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_patrimonio_estado on public.patrimonio_gastronomico(estado);
create index if not exists idx_patrimonio_zona   on public.patrimonio_gastronomico(zona);
create index if not exists idx_patrimonio_cat    on public.patrimonio_gastronomico(categoria);

-- ---------- Geocercas ----------
-- Polígonos/círculos dibujados en el mapa, guardados como GeoJSON Feature.
create table if not exists public.geocercas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  geojson     jsonb not null,
  color       text not null default '#b4552d',
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.geocercas enable row level security;

drop trigger if exists trg_geocercas_touch on public.geocercas;
create trigger trg_geocercas_touch
  before update on public.geocercas
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.users enable row level security;
alter table public.patrimonio_gastronomico enable row level security;

-- Sin políticas = acceso denegado para anon/authenticated.
-- Todo el tráfico pasa por la API (service_role), que valida JWT y roles.

-- ---------- Trigger updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_patrimonio_touch on public.patrimonio_gastronomico;
create trigger trg_patrimonio_touch
  before update on public.patrimonio_gastronomico
  for each row execute function public.touch_updated_at();
