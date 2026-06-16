-- ============================================================
-- FC TOTT — Database schema voor Supabase (Postgres)
-- Plak dit volledige bestand in: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- Spelers (accounts)
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  password text not null, -- let op: platte tekst, zie opmerking onderaan
  role text not null default 'speler' check (role in ('speler', 'admin')),
  active boolean not null default true,
  photo text default '',
  position text default 'Allround',
  number int,
  member_since date default current_date,
  created_at timestamptz default now()
);

-- Wedstrijden
create table matches (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('oefenwedstrijd', 'groepsactiviteit', 'toernooi', 'competitie', 'beker')),
  opponent text not null,
  match_date timestamptz not null,
  location text default '',
  created_at timestamptz default now()
);

-- Aanwezigheid per speler per wedstrijd
create table attendance (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  status text not null check (status in ('aanwezig', 'afwezig', 'twijfel')),
  reason text default '',
  updated_at timestamptz default now(),
  unique (match_id, player_id)
);

-- Opstelling per wedstrijd (1 keeper, losse rij per veldspeler)
create table lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  role text not null check (role in ('keeper', 'veldspeler')),
  unique (match_id, player_id)
);

-- Huisregels
create table rules (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Financiën: welke betaalposten zijn er, en per speler welke voldaan zijn
create table fee_types (
  id text primary key, -- bv. 'inschrijving'
  label text not null,
  amount numeric not null
);

create table fee_payments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  fee_type_id text references fee_types(id) on delete cascade,
  paid boolean not null default false,
  unique (player_id, fee_type_id)
);

-- Boetepot
create table fine_rules (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount numeric not null
);

create table fines (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  fine_rule_id uuid references fine_rules(id) on delete set null,
  label text not null, -- kopie van het label, blijft staan ook als regel verwijderd wordt
  amount numeric not null,
  created_at timestamptz default now()
);

-- Statistieken: goals/assists per speler (handmatig bijgehouden door admin)
create table stats (
  player_id uuid primary key references players(id) on delete cascade,
  goals int not null default 0,
  assists int not null default 0
);

-- ============================================================
-- Seed data — startgegevens, pas gerust aan
-- ============================================================
insert into players (name, username, password, role, position, number, member_since) values
  ('Daan Visser', 'daan', 'tott01', 'speler', 'Aanvaller', 9, '2022-09-01'),
  ('Mo El Amrani', 'mo', 'tott02', 'speler', 'Allround', 7, '2021-02-15'),
  ('Tim Bakker', 'tim', 'tott03', 'admin', 'Verdediger', 4, '2019-08-20'),
  ('Sven de Groot', 'sven', 'tott04', 'speler', 'Keeper', 1, '2023-01-10'),
  ('Rico Jansen', 'rico', 'tott05', 'speler', 'Aanvaller', 11, '2020-11-05');

insert into fee_types (id, label, amount) values
  ('inschrijving', 'Inschrijving', 85),
  ('kleding', 'Kleding', 45),
  ('drinken', 'Drinken', 20),
  ('oefenwedstrijden', 'Oefenwedstrijden', 15);

insert into rules (text, sort_order) values
  ('Wees 30 minuten voor aanvang aanwezig in de kantine.', 1),
  ('Clubtenue verplicht bij competitiewedstrijden — geen tenue, geen speeltijd.', 2),
  ('Na de wedstrijd ruimen we samen de kleedkamer op, ongeacht de uitslag.', 3),
  ('Respect voor scheidsrechters en tegenstanders staat bij FC TOTT op nummer 1.', 4);

insert into fine_rules (label, amount) values
  ('Te laat afmelden (na de deadline)', 5),
  ('Zonder afmelding niet komen opdagen', 15),
  ('Geen volledig tenue bij wedstrijd', 5),
  ('Te laat aankomen op training/wedstrijd', 2);

insert into stats (player_id, goals, assists)
  select id, 0, 0 from players;

-- ============================================================
-- Row Level Security: voor deze opzet (geen Supabase Auth, eigen
-- login-systeem in de app) zetten we RLS UIT en gebruiken we de
-- 'anon' key met volledige lees/schrijf-rechten op alle tabellen.
-- Dit past bij een amateur-teamportaal; het is niet geschikt voor
-- gevoelige/financiele productie-data op bedrijfsniveau.
-- ============================================================
alter table players disable row level security;
alter table matches disable row level security;
alter table attendance disable row level security;
alter table lineups disable row level security;
alter table rules disable row level security;
alter table fee_types disable row level security;
alter table fee_payments disable row level security;
alter table fine_rules disable row level security;
alter table fines disable row level security;
alter table stats disable row level security;
