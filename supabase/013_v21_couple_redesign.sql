-- Usly v21: indexes/realtime foundation for current couple desires.
create index if not exists couple_desires_couple_id_idx on public.couple_desires(couple_id);
alter table public.couple_desires replica identity full;
