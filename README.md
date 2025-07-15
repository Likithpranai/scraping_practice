# Roameo Scraping API

A TypeScript-based internal API service for scraping restaurant and attraction data from various sources.

## Architecture

The project follows a clean, modular architecture with four main layers:

1. **API Layer** (`src/api/`) - Express.js routes and controllers
2. **Workflow Layer** (`src/workflows/`) - Orchestrates scraping strategies
3. **Strategy Layer** (`src/strategies/`) - Individual site scrapers
4. **Services Layer** (`src/services/`) - Shared utilities (LLM, Scraper)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## API Endpoints

### Get Status
```
GET /api/v1/scrape/status
```

### Scrape Data
```
GET /api/v1/scrape/:location/:option
```

Example:
```
GET /api/v1/scrape/hong-kong/restaurants
```

## Supported Workflows

Currently supported location:option combinations:
- `hong-kong:restaurants`

## Adding New Workflows

1. Create strategy files in `src/strategies/locations/{location}/{option}/`
2. Create merger in `src/mergers/locations/` (optional, uses default if not provided)
3. Create workflow in `src/workflows/locations/{location}/{option}.workflow.ts`
4. Register workflow in `src/workflows/workflow.factory.ts`

## Environment Variables

```env
PORT=3001
NODE_ENV=development
PERPLEXITY_API_KEY=your_api_key_here
USER_AGENT=Mozilla/5.0...
REQUEST_TIMEOUT=30000
MAX_CONCURRENT_REQUESTS=5
HEADLESS_BROWSER=true
BROWSER_TIMEOUT=60000
```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Logging

Logs are written to:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs
- Console (development only)
# scraping_practice
