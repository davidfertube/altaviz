# Altaviz Dashboard

Next.js 16 + React 19 frontend for the Altaviz compressor health monitoring platform.

## Getting Started

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Fleet Overview | Texas station map, compressor grid, alert activity stream |
| `/monitoring` | Monitoring Grid | All compressors with real-time status |
| `/monitoring/[id]` | Compressor Detail | Radial gauges, time-series charts, threshold lines |
| `/alerts` | Alert Management | Filterable table, acknowledge/resolve actions |
| `/data-quality` | Pipeline Health | Freshness, completeness, consistency metrics |

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **node-postgres** (database connection)
- **SWR** (data fetching with 30-60s refresh intervals)

## Database Connection

The frontend connects to PostgreSQL via API routes in `src/app/api/`. Configure the connection in `.env.local`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=compressor_health
DB_USER=postgres
DB_PASSWORD=postgres
```

## Project Structure

```
src/
├── app/                  # App Router pages + API routes
│   ├── api/              # Server-side API endpoints
│   ├── alerts/           # Alert management page
│   ├── data-quality/     # Pipeline health page
│   └── monitoring/       # Monitoring grid + detail pages
├── components/           # Reusable UI components
│   ├── cards/            # Metric cards, compressor cards
│   ├── charts/           # Time-series, trend charts
│   ├── maps/             # Texas station map
│   ├── tables/           # Alert tables, data tables
│   ├── indicators/       # Status indicators, gauges
│   ├── filters/          # Date range, compressor, severity filters
│   ├── layout/           # Sidebar, header, navigation
│   └── ui/               # Base UI primitives
├── hooks/                # SWR data fetching hooks
└── lib/                  # Shared utilities
    ├── db.ts             # node-postgres Pool singleton
    ├── queries.ts        # Parameterized SQL query functions
    ├── types.ts          # TypeScript interfaces for DB tables/views
    ├── constants.ts      # Sensor thresholds, colors, nav items
    └── utils.ts          # Formatting, color mapping utilities
```
