# Usly ❤️

A private little world for two.

## Stack

- React + TypeScript + Vite
- Supabase Auth / PostgreSQL / RLS / Storage / Realtime
- Lucide icons

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your Supabase URL and anon/publishable key to `.env.local`.

## Supabase

Create a fresh Supabase project, open **SQL Editor**, and run `supabase/001_initial_schema.sql`.

This first migration creates the identity/couple foundation. Product tables (messages, moments, timeline, wishlist, vault, etc.) will be added in subsequent migrations so each security boundary can be reviewed before it ships.

## Product direction

Usly is not just a chat. It is a private relationship space built around daily rituals, moments, memories, a shared story and a secure private vault.
