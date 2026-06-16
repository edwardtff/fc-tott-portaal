# FC TOTT — zelf hosten (stap voor stap)

Deze handleiding gaat ervan uit dat je nog nooit een website hebt gehost. Je hebt drie gratis accounts nodig: GitHub, Supabase en Vercel. Geen creditcard nodig. Volg de stappen op volgorde — overslaan zorgt voor problemen later.

Reken op ongeveer 30-45 minuten de eerste keer.

## Wat je gaat doen, in vogelvlucht

1. Een gratis database aanmaken bij Supabase (hier komt alle clubdata in te staan).
2. De code op GitHub zetten (een gratis plek waar je broncode bewaard wordt).
3. Vercel die code laten "bouwen" en hosten op een eigen URL, gratis.
4. Vercel vertellen hoe hij met jouw Supabase-database moet praten.

---

## Stap 1 — Supabase: de database aanmaken

1. Ga naar [supabase.com](https://supabase.com) en klik op **Start your project**. Maak een account aan (kan met je Google-account, scheelt een wachtwoord).
2. Klik op **New project**.
3. Vul in:
   - **Name**: bijvoorbeeld `fc-tott`
   - **Database Password**: laat Supabase er zelf een genereren en bewaar die ergens (een notitie-app is genoeg, je hebt hem zelden nodig).
   - **Region**: kies er een dichtbij, bijvoorbeeld Frankfurt (West EU).
4. Klik **Create new project** en wacht 1-2 minuten tot hij klaar is.
5. Klik in het linkermenu op het **SQL Editor**-icoon (lijkt op `>_`).
6. Klik op **New query**.
7. Open het bestand `supabase-schema.sql` (meegeleverd in dit pakket), kopieer de **volledige inhoud**, en plak die in het SQL Editor-venster.
8. Klik rechtsonder op **Run** (of `Ctrl+Enter` / `Cmd+Enter`).
9. Je zou onderin "Success" moeten zien. Dit heeft alle tabellen aangemaakt én de standaard-spelers, huisregels en boeteregels ingevoerd.

**Controle**: ga in het linkermenu naar **Table Editor**. Je zou tabellen moeten zien als `players`, `matches`, `attendance`, enzovoort, en bij `players` staan al 5 namen klaar.

### Je API-gegevens ophalen (nodig in stap 4)

1. Ga naar **Project Settings** (tandwiel-icoon linksonder) → **API**.
2. Je ziet twee dingen die je later nodig hebt:
   - **Project URL** (ziet uit als `https://xxxxx.supabase.co`)
   - **anon public** key (een lange tekst onder "Project API keys")
3. Zet deze twee even apart in een notitie — je plakt ze in stap 4.

---

## Stap 2 — GitHub: de code online zetten

1. Ga naar [github.com](https://github.com) en maak een gratis account.
2. Klik rechtsboven op de **+** en kies **New repository**.
3. Geef hem een naam, bijvoorbeeld `fc-tott-portaal`. Laat hem **Public** of **Private** staan naar keuze (Private kan ook gratis). Klik **Create repository**.
4. Je krijgt nu een lege repository met instructies. De simpelste manier om jouw bestanden hierin te krijgen, zonder terminal-commando's te hoeven leren:
   - Klik op de link **uploading an existing file** (midden op de pagina).
   - Sleep alle bestanden en mappen uit het meegeleverde projectpakket (zoals je dat van mij hebt gekregen) in dat upload-vak. Zorg dat de mapstructuur behouden blijft — dus de map `src` met alles erin, plus `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `.env.example`.
   - **Belangrijk**: upload geen `.env`-bestand als je dat ooit zelf aanmaakt — dat blijft alleen lokaal of in Vercel's instellingen, nooit op GitHub.
   - Onderaan: typ een korte commit-message zoals "Eerste versie" en klik **Commit changes**.

**Controle**: je repository toont nu alle bestanden, inclusief de map `src`.

---

## Stap 3 — Vercel: hosten

1. Ga naar [vercel.com](https://vercel.com) en maak een account aan — kies **Continue with GitHub** zodat de twee meteen gekoppeld zijn.
2. Klik op **Add New** → **Project**.
3. Je ziet een lijst van je GitHub-repositories. Zoek `fc-tott-portaal` en klik **Import**.
4. Vercel herkent automatisch dat dit een Vite-project is. Je hoeft niets te veranderen bij **Build & Output Settings**.
5. **Voordat je op Deploy klikt**: klik het blokje **Environment Variables** open en voeg twee variabelen toe:
   - Name: `VITE_SUPABASE_URL` — Value: (de Project URL die je in stap 1 apart had gezet)
   - Name: `VITE_SUPABASE_ANON_KEY` — Value: (de anon public key)
6. Klik op **Deploy**.
7. Wacht 1-2 minuten. Je krijgt een groen vinkje en een link zoals `fc-tott-portaal.vercel.app` — dat is jouw live clubportaal.

---

## Stap 4 — Testen

1. Open de Vercel-link in je browser.
2. Log in met een van de standaard-accounts:
   - Admin: gebruikersnaam `tim`, wachtwoord `tott03`
   - Speler: gebruikersnaam `daan`, wachtwoord `tott01`
3. Test of een wijziging (bijvoorbeeld je aanwezigheid aanpassen) ook zichtbaar is als je dezelfde link op je telefoon opent en met een ander account inlogt. Als dat werkt, praat de app inderdaad met de gedeelde database.

---

## Daarna: gegevens aanpassen

- **Spelers, wachtwoorden, wedstrijden**: kun je direct in de app doen via het admin-account (rol "admin"), geen Supabase nodig.
- **Iets in de database direct aanpassen** (bijvoorbeeld een speler handmatig toevoegen via Supabase zelf): ga naar **Table Editor** in Supabase, klik de juiste tabel open, en bewerk rijen rechtstreeks.
- **Nieuwe code-update van mij krijgen**: vervang de bestanden op GitHub (via **Add file → Upload files** in je repository, met dezelfde bestanden overschrijven) — Vercel deployt vanzelf opnieuw zodra GitHub een wijziging ziet.

---

## Wat dit wél en niet oplost

Dit is een echte, eigen database (Postgres bij Supabase) en een eigen URL, los van Claude. Je data verdwijnt niet wanneer een Claude-gesprek stopt, en je kunt op elk moment exporteren via Supabase's **Table Editor → Export**.

Wat het niet oplost: wachtwoorden staan nog steeds in platte tekst in de database (geen hashing/encryptie), omdat dit project geen volwaardig authenticatiesysteem gebruikt maar een eigen, simpele login-tabel. Voor een amateur zaalvoetbalteam is dat een acceptabel risico; voor gevoeligere toepassingen zou je een echt authenticatiesysteem (bijvoorbeeld Supabase Auth) moeten toevoegen — dat is een vervolgstap, geen onderdeel van wat hier nu staat.

## Hulp nodig?

Als een stap niet werkt — bijvoorbeeld een rode foutmelding in Vercel, of de "Run" in Supabase geeft een foutmelding — kopieer de exacte foutmelding en stuur die naar mij in de chat, dan kan ik gericht helpen.
