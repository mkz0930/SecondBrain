# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Second Brain (外挂大脑) is a personal knowledge management tool built with Vue 3 and Node.js. It supports accumulating and organizing notes, articles, audio/video content, and books with AI-powered content analysis and Feishu (飞书) integration.

## Development Commands

```bash
# Install dependencies
npm install

# Start both frontend and backend (recommended - cross-platform)
# Windows:
.\scripts\start.ps1
# Linux/Mac:
./scripts/start.sh

# Or use Python launcher:
python scripts/start.py

# Manual startup (requires two terminals):
npm run server  # Terminal 1: Backend on port 3000
npm run dev     # Terminal 2: Frontend on port 5173

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Client-Server Structure
- **Frontend**: Vue 3 SPA (port 5173) with Composition API, Pinia state, Vue Router
- **Backend**: Express.js REST API (port 3000) with SQLite database
- **API Proxy**: Vite proxies `/api` requests to `http://127.0.0.1:3000`

### Data Flow
```
Vue Components → Pinia Stores → Axios → Express Routes → Services → SQLite
```

### Key Directories

**Frontend (`src/`)**:
- `views/` - Page components (Home, Login, Content views)
- `stores/` - Pinia stores (user.js, content.js, tag.js)
- `router/` - Vue Router config
- `utils/` - Frontend utilities

**Backend (`server/`)**:
- `routes/` - API route handlers (auth.js, contents.js, tags.js, stats.js, feishu.js, daily-summary.js, research.js)
- `services/` - Business logic (ai-service.js, feishu-adapter.js, sync-service.js, sync-scheduler.js, daily-summary-service.js, research-service.js)
- `models/` - Data access layer (database.js, users.js)
- `middleware/` - Express middleware (auth.js)
- `utils/` - Backend utilities (logger.js)

### Database Schema (SQLite)

Located at `data/brain.db` with auto-migration support in `server/models/database.js`:
- `contents` - Main content table with user_id, type, title, content, url, source, rating, is_favorite, summary, deleted_at
- `tags` - Tag names, colors, user_id
- `content_tags` - Many-to-many relationship
- `users` - User authentication (openid, session_token, username, password_hash)
- `daily_summaries` - Daily content summaries
- `feishu_sync_*` - Feishu integration tables (config, mapping, logs)
- `research_*` - Research assistant tables (projects, questions, materials, connections)

### State Management Pattern

Frontend uses Pinia stores with this pattern:
1. Store manages state and API calls via axios
2. Components reactive-bind to store state
3. Auth required for most routes (see `src/router/index.js`)

### Backend Service Layer

Services encapsulate business logic:
- `ai-service.js` - Google Generative AI (Gemini) integration with model fallback and retry logic
- `feishu-adapter.js` - Feishu API integration
- `sync-service.js` - Two-way sync between local and Feishu
- `sync-scheduler.js` - Cron-based background sync (node-cron)
- `daily-summary-service.js` - Daily content summarization
- `research-service.js` - Research assistant AI functions (requirement analysis, material collection, knowledge graph)

### Logging

Uses Winston with daily rotation:
- Logs stored in `logs/` directory
- Error logs: `logs/error-DATE.log`
- Combined logs: `logs/combined-DATE.log`
- Import from `server/utils/logger.js`, use `logger.info/warn/error/debug()`

### AI Integration

Google Generative AI (Gemini) for:
1. Content analysis (`analyzeContent`) - extracts title, summary, type, tags, reformats content
2. Daily summary generation (`generateDailySummary`)
3. Research assistant (`research-service.js`) - requirement analysis, material relevance assessment, knowledge graph generation, report generation

**Environment variables**:
- `GOOGLE_API_KEY` or `GEMINI_API_KEY` - Required for AI features

**Model fallback chain** (in `server/services/ai-service.js`):
- gemini-3-flash-preview → gemini-2.5-flash-lite → gemini-2.5-flash → gemma-3-27b-it

## Environment Configuration

Key environment variables:
- `PORT` - Backend port (default: 3000)
- `GOOGLE_API_KEY` / `GEMINI_API_KEY` - Google Generative AI key
- `DISABLE_ANON` - Set to 'true' to disable anonymous access
- `FEISHU_SYNC_ENABLED` - Set to 'false' to disable Feishu sync
- `WECHAT_*` - WeChat mini-program credentials

## Content Types

The system uses these exact type values: "随笔" (notes), "文章" (articles), "音视频" (audio/video), "书籍" (books), plus AI-detected types: "随便", "抖音", "公众号", "文档", "其他"

## Features

### 1. Content Management
- Create, read, update, delete notes, articles, audio/video, books
- AI-powered content analysis and formatting
- Tag-based organization
- Favorite and rating system
- Full-text search

### 2. Feishu Integration
- Two-way sync with Feishu (飞书) tables
- Automatic sync scheduling
- Conflict resolution
- Sync status tracking

### 3. Daily Summary
- Automatic daily content summarization
- AI-generated insights
- Historical summary viewing

### 4. Research Assistant (NEW)
- **Dialogue-based research workflow**: AI guides users through research process
- **Requirement analysis**: AI generates research questions based on topic
- **Material collection**: Searches local content library for relevant materials
- **Relevance scoring**: AI assesses material relevance to research topic
- **Knowledge graph**: Visualizes connections between materials
- **Report generation**: AI generates structured research reports

**Research Assistant Routes**:
- `/research` - Project list view
- `/research/:id` - Research dialogue interface

**Research Assistant API** (`/api/research`):
- Project CRUD operations
- Requirement analysis and question answering
- Material collection and processing
- Knowledge graph generation
- Report generation

See `docs/research-assistant.md` for detailed documentation.

## Important Notes

1. **No test files** - The project does not have a test suite. When testing features, test manually by running the dev servers.

2. **Logging** - Always use `logger.info/warn/error/debug()` from `server/utils/logger.js` for backend operations, not `console.log`. See `.qoder/rules/log.md`.

3. **Database** - SQLite file at `data/brain.db` is not git-tracked. Auto-migration handles schema changes via `ensureColumn()` in `server/models/database.js`.

4. **Research Assistant** - Requires valid `GOOGLE_API_KEY` or `GEMINI_API_KEY`. Works best when local content library has relevant materials.
