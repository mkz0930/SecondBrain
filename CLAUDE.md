# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Second Brain (外挂大脑) is a personal knowledge management tool with **Web** and **Android** clients. Built with Vue 3, Node.js, and React Native, it supports content collection, AI analysis, Feishu sync, and research assistance.

## Development Commands

### Web Application

```bash
# Install dependencies
npm install

# Start both frontend and backend (recommended - cross-platform)
# Windows:
.\scripts\start.ps1
# Linux/Mac:
./scripts/start.sh

# Or use Python launcher:
python start.py

# Manual startup (requires two terminals):
npm run server  # Terminal 1: Backend on port 3000
npm run dev     # Terminal 2: Frontend on port 5173

# Build for production
npm run build

# Preview production build
npm run preview

# Testing
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:api            # API tests only
npm run test:services       # Service tests only

# Run a single test file
npx mocha test/api/contents.test.js --timeout 10000 --exit

# Code quality
npm run lint                # ESLint check
npm run update-requirements # Update requirements doc
```

### Android Application

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Run on Android device/emulator
npm run android
# or
react-native run-android

# Start Metro bundler
npm start

# Build release APK
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Architecture

### Multi-Platform Structure
- **Web Frontend**: Vue 3 SPA (port 5173) with Composition API, Pinia state, Vue Router
- **Backend API**: Express.js REST API (port 3000) with SQLite database
- **Android App**: React Native 0.73 with background clipboard monitoring
- **API Proxy**: Vite proxies `/api` requests to `http://127.0.0.1:3000`

### Data Flow

**Web Application**:
```
Vue Components → Pinia Stores → Axios → Express Routes → Services → SQLite
```

**Android Application**:
```
Clipboard Monitor → Local Queue (SQLite) → API Service → Backend API → Feishu Sync
```

### Key Directories

**Web Frontend (`src/`)**:
- `views/` - Page components (Home, Login, Content, Research)
- `stores/` - Pinia stores (user.js, content.js, tag.js)
- `router/` - Vue Router config
- `utils/` - Frontend utilities

**Backend (`server/`)**:
- `routes/` - API route handlers (auth, contents, tags, stats, feishu, daily-summary, research, graph, database, upload)
- `services/` - Business logic (ai-service, feishu-adapter, sync-service, sync-scheduler, daily-summary-service, research-service)
- `models/` - Data access layer (database.js, users.js)
- `middleware/` - Express middleware (auth.js)
- `utils/` - Backend utilities (logger.js)

**Android App (`mobile/`)**:
- `src/screens/` - React Native screens (Home, ContentList, Settings)
- `src/services/` - Services (ClipboardService, ApiService, SyncService)
- `src/database/` - SQLite queue management (ClipboardQueue.js)
- `src/utils/` - Utilities (urlValidator.js)
- `android/` - Native Android configuration

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

**AI Model** (configured in `server/services/ai-base.js`):
- Primary model: `gemini-3-flash-preview`
- Retry logic: 3 retries per model with exponential backoff
- Concurrency: max 100 concurrent requests, 20 per batch

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

### 4. Research Assistant
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

### 5. Android Clipboard Monitoring
- **Background monitoring**: Detects article URLs copied to clipboard
- **Smart filtering**: Automatically filters non-article URLs (images, videos, e-commerce)
- **Offline queue**: Local SQLite queue for offline content storage
- **Auto-sync**: Syncs to backend and Feishu when network available
- **Notification interaction**: User confirmation before saving
- **Foreground service**: Persistent background operation

**Android API endpoints used**:
- `POST /api/auth/login` - User authentication
- `POST /api/contents/quick-save` - Fast content save (recommended)
- `POST /api/contents/batch` - Batch content save
- `GET /api/contents` - Fetch content list
- `POST /api/feishu/sync` - Trigger Feishu sync

See `mobile/README.md` for Android app documentation.

## Testing

The project has a comprehensive test suite using Mocha, Chai, and Supertest:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api        # API endpoint tests
npm run test:services   # Service layer tests

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test structure**:
- `test/api/` - API endpoint tests (contents, tags, auth)
- `test/services/` - Service layer tests (ai-service, sync-service)
- `test/frontend/` - Frontend component tests

**Test database**: Tests use a separate test database to avoid affecting development data.

## Important Notes

1. **Logging** - Always use `logger.info/warn/error/debug()` from `server/utils/logger.js` for backend operations, not `console.log`. Logs are stored in `logs/` directory with daily rotation.

2. **Database** - SQLite file at `data/brain.db` is not git-tracked. Auto-migration handles schema changes via `ensureColumn()` in `server/models/database.js`. Use `scripts/inspect_db.js` to inspect database contents.

3. **AI Integration** - Requires valid `GOOGLE_API_KEY` or `GEMINI_API_KEY` environment variable. Uses `gemini-3-flash-preview` model with retry logic and concurrency control (max 100 concurrent, 20 per batch). Research assistant works best when local content library has relevant materials.

4. **Path alias** - Frontend uses `@` alias for `src/` directory (configured in `vite.config.js`).

5. **Naming conventions**:
   - Components: PascalCase (e.g., `HomeView.vue`)
   - Files: kebab-case (e.g., `ai-service.js`)
   - Variables/functions: camelCase
   - Constants: UPPER_SNAKE_CASE

6. **API responses** - Backend APIs return consistent format: `{ success: boolean, data?: any, message?: string }`

7. **Error handling** - Routes should catch errors, log with `logger.error()`, and return 500 with error message.

8. **Android Development**:
   - Android emulator uses `http://10.0.2.2:3000` to access localhost backend
   - Real devices need the computer's LAN IP address
   - Clipboard monitoring requires foreground service and notification permissions
   - Battery optimization must be disabled for reliable background operation

9. **Feishu Sync** - Can be disabled by setting `FEISHU_SYNC_ENABLED=false`. Sync scheduler runs every 5 minutes by default (configured in `sync-scheduler.js`).

10. **Static files** - Uploaded files are served from `/uploads` directory via Express static middleware.
