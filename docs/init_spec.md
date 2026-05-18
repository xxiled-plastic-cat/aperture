# Build MVP: Aperture Terminal Static Dashboard

Create a new **SvelteKit + TypeScript** web app for a prediction market intelligence product called **Aperture Terminal**.

This is a **static visual MVP only**. Do not connect to real APIs yet. The goal is to validate the theme, layout, and product feel before building the full aggregator.

## Product concept

Aperture Terminal is a read-only prediction market intelligence terminal.

It will eventually aggregate markets from Alpha Arcade, Polymarket, Kalshi, and others, but this MVP should focus on Alpha-style static market data.

The interface should feel like:

* Bloomberg Terminal
* old Reuters terminal
* modern CLI/agent console
* market scanner
* operator dashboard
* intelligence terminal

It should **not** feel like:

* a casino
* a generic crypto dashboard
* a glossy SaaS landing page
* a cyberpunk game UI

## Tech stack

Use:

* SvelteKit
* TypeScript
* Tailwind CSS
* Static/mock data only

Avoid:

* real API calls
* auth
* database
* animations-heavy UI
* large component libraries unless already present in the project template

## Visual direction

Brand name:

```txt
Aperture Terminal
```

Aesthetic:

* dark-first
* sharp
* sparse
* terminal-like
* information dense
* keyboard/operator feel
* no smooth decorative animations
* minimal transitions only where useful
* subtle borders
* tabular numeric layouts
* compact UI

## Colour palette

Use this as the base palette:

```txt
Background:      #0A0C0F
Panel:           #111418
Panel Alt:       #151922
Border:          #23272E

Primary Text:    #F2F2EE
Secondary Text:  #A8B0B8
Muted Text:      #6B7280

Terminal Green:  #7FDB7F
Muted Gold:      #B89B5E
Amber:           #D6A756
Danger Red:      #C56B6B
Signal Cyan:     #5FA3A3
```

Use green, muted gold, and white as the dominant colors. Cyan and red should be used sparingly.

## Typography

Use a clean sans font for general UI and a monospace font for market data.

Preferred stack:

```css
font-family: Inter, system-ui, sans-serif;
font-family: "IBM Plex Mono", "JetBrains Mono", monospace;
```

If external fonts are inconvenient, use system font fallbacks.

Use tabular numbers where useful.

## Page layout

Build a single dashboard page.

The page should include:

### 1. Top header

Header content:

* Aperture Terminal wordmark
* small status indicator: `ALPHA FEED: STATIC`
* current mock timestamp
* small command hint: `/ scan markets`

Style:

* compact
* terminal-like
* thin bottom border
* no big hero section

### 2. Left navigation rail

Items:

* Overview
* Markets
* Scanner
* Signals
* Venues
* Portfolio
* Alerts
* Settings

The active item should be `Overview`.

Keep the rail narrow and dense.

### 3. Main dashboard area

Use a grid/pane layout.

Include these panels:

#### A. Market Snapshot

Small stat cards:

* Total Markets: 128
* Active Venues: 1
* Avg Spread: 4.2%
* Open Signal Count: 17
* Reward Eligible: 9
* Estimated Edge: $38.40

#### B. Signal Scanner

A dense table of mock opportunities.

Columns:

* Signal
* Market
* Venue
* Side
* Price
* Fair
* Edge
* Liquidity
* Confidence

Example rows:

* Spread capture / UEFA Champions League Winner - Arsenal / Alpha / NO / 0.41 / 0.37 / +4.0% / $1,240 / HIGH
* Parity gap / Bitcoin above $100k in June / Alpha / YES / 0.58 / 0.54 / +4.0% / $840 / MED
* Reward lane / Premier League Winner - Liverpool / Alpha / YES / 0.22 / 0.21 / +1.0% / $420 / HIGH
* Stale price / US Election Popular Vote / Alpha / NO / 0.63 / 0.59 / +4.0% / $2,100 / MED

Use color-coded badges:

* HIGH = green
* MED = gold/amber
* LOW = muted gray

#### C. Market Feed

A compact scrolling-style list of mock market updates.

Examples:

```txt
12:42:18  spread widened on Arsenal NO
12:41:03  reward lane detected on Liverpool YES
12:39:44  parity deviation cleared: BTC > $100k
12:36:12  low-liquidity warning: Eurovision Winner
12:31:08  new market indexed: US CPI above forecast
```

#### D. Venue Health

Show static Alpha venue metrics:

* Venue: Alpha Arcade
* Status: Online
* Markets Indexed: 128
* Last Sync: 8s ago
* API Mode: Mock
* Liquidity Score: 42/100
* Volume Signal: Low

#### E. Probability Drift

Create a simple visual panel showing a mock market with probability changing over time.

No charting library required. A simple CSS/table/ASCII-style sparkline is acceptable.

Example:

Market: `BTC above $100k in June`

```txt
0.49 ▂▃▄▅▃▆▇ 0.58
```

Add small labels:

* 1h: +2.1%
* 24h: +6.8%
* Spread: 5.4%

#### F. Command / LLM Search Bar

At the bottom of the main content, add a terminal-style input bar.

Placeholder examples:

```txt
> ask aperture: show alpha markets with edge above 3%
```

This should not be functional yet.

Add three small example prompt chips:

* `scan parity gaps`
* `show reward lanes`
* `find stale prices`

## Interaction requirements

Keep interactions minimal but useful:

* Sidebar active state
* Hover states on tables and rows
* Clicking prompt chips can fill the input value
* Search input does not need to submit anywhere
* No backend logic required

## Component structure

Use sensible Svelte components, for example:

```txt
src/lib/components/Header.svelte
src/lib/components/Sidebar.svelte
src/lib/components/StatCard.svelte
src/lib/components/Panel.svelte
src/lib/components/SignalTable.svelte
src/lib/components/MarketFeed.svelte
src/lib/components/CommandBar.svelte
src/routes/+page.svelte
```

Mock data can live in:

```txt
src/lib/mock/markets.ts
```

## Design quality bar

The page should look like a credible early product, not a wireframe.

Important details:

* Compact spacing
* Consistent panel borders
* Muted but readable text
* Monospace market data
* No oversized SaaS hero section
* No gradient-heavy crypto styling
* No rounded bubbly cards
* Use subtle square or slightly rounded corners
* Keep the UI dense but not cluttered

## Copy tone

Use restrained, operator-style copy.

Good:

```txt
SIGNAL SCANNER
VENUE HEALTH
ALPHA FEED: STATIC
EDGE DETECTED
```

Avoid:

```txt
Unlock your financial future!
Bet smarter!
AI-powered prediction revolution!
```

## Acceptance criteria

The final app should:

* run locally with `npm install` and `npm run dev`
* show a polished static dashboard
* use SvelteKit + TypeScript
* use Tailwind for styling
* include mock prediction market data
* include the Aperture Terminal branding
* feel like a serious terminal-style market intelligence product
* require no external APIs, database, auth, or secrets
