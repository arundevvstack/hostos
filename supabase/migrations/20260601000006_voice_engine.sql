-- Migration: Phase 6 Voice Host Engine

-- Add voice fields to hosts table
alter table public.hosts add column if not exists voice_enabled boolean default true;
alter table public.hosts add column if not exists voice_provider text default 'browser';
alter table public.hosts add column if not exists voice_id text;
alter table public.hosts add column if not exists voice_rate numeric default 1.0;
alter table public.hosts add column if not exists voice_pitch numeric default 1.0;
alter table public.hosts add column if not exists voice_volume numeric default 1.0;
alter table public.hosts add column if not exists future_voice_clone_id text;

-- Add voice analytics fields to episodes table
alter table public.episodes add column if not exists voice_play_count integer default 0;
alter table public.episodes add column if not exists voice_replay_count integer default 0;
alter table public.episodes add column if not exists voice_disabled_count integer default 0;
