# STACKS // PERSONAL ARCHIVE

A personal catalog for the physical books you keep. React Native + Expo + TypeScript, backed by FastAPI, SQLAlchemy, PostgreSQL, and Open Library.

**Milestone 2A:** manually enter an ISBN, review edition metadata, save a physical copy with personal details, and view saved copies in the catalog. Editing/deleting, camera scanning, and advanced library sorting remain deferred.

Read [architecture and schema](docs/architecture.md) for boundaries, design decisions, the duplicate-copy policy, and the five-milestone plan. See [verification](docs/verification.md) for what was actually checked.

## Repository

```text
stacks/
├── mobile/                 Expo app, UI, request hook, generated API types
├── backend/
│   ├── app/
│   │   ├── api/            Routes and dependency wiring
│   │   ├── core/           Settings and centralized error handling
│   │   ├── db/             SQLAlchemy base and session factory
│   │   ├── models/         Edition, author, ordered credits, physical copy
│   │   ├── repositories/   PostgreSQL persistence
│   │   ├── schemas/        Pydantic contracts
│   │   └── services/       ISBN, lookup, provider adapter
│   ├── migrations/        Explicit Alembic revision
│   ├── scripts/           OpenAPI export
│   └── tests/             Unit, HTTP, provider, PostgreSQL integration tests
├── docs/
├── .github/workflows/      CI with PostgreSQL
└── compose.yaml            Local PostgreSQL only
```

## Prerequisites

- Python 3.10+ (3.12 recommended for a fresh installation).
- Node.js 22.13+ and npm. A Node 24 environment was used for verification.
- Docker with Compose, or an existing PostgreSQL 17 server.
- Expo Go matching SDK 57 or a compatible development build. Xcode is needed for the iOS simulator; Android Studio for the Android emulator. Web preview also works, but does not replace native testing.

## Run the backend

From the `stacks` directory:

```sh
docker compose up -d db
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.lock
pip install -e . --no-deps
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On Windows use `.venv\Scripts\activate`. Commands assume you run the API and Alembic from `backend/`, where `.env` is loaded. `requirements.lock` contains the tested dependency versions, including development tools. To intentionally update dependencies, install `pip install -e '.[dev]'`, run checks, and regenerate the lock. The lock is a tested version snapshot, not a cross-platform hash lock.

The Compose credentials are local development defaults. If using your own database, set `DATABASE_URL` to `postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE`. Replace `OPEN_LIBRARY_USER_AGENT` with your app name and contact for regular use. Schema changes require Alembic; startup does not create tables.

Check [API docs](http://localhost:8000/docs), [liveness](http://localhost:8000/health), and [database readiness](http://localhost:8000/health/ready). Readiness returns 503 until PostgreSQL is reachable and the initial migration is applied.

```sh
curl http://localhost:8000/books/lookup/9780140328721
curl http://localhost:8000/books/lookup/0140328726
```

On a new database the first successful response has `source: "provider"`; the second has `source: "cache"` and the same edition ID. Lookup inserts edition metadata, never an owned copy.

## Run the mobile app

In another terminal, from `stacks`:

```sh
cd mobile
npm ci
cp .env.example .env
# Set EXPO_PUBLIC_API_URL for your device before starting.
npm start
```

Use the QR code in a compatible Expo Go, or press `i` / `a` for a configured simulator/emulator. For browser preview use `npm run web`.

| Client | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| iOS simulator / local browser | `http://localhost:8000` |
| Android emulator | `http://10.0.2.2:8000` |
| Physical phone | `http://YOUR_COMPUTER_LAN_IP:8000` |

A phone's `localhost` is the phone, not your computer. Use the same Wi-Fi, allow port 8000 through your local firewall, and restart Expo after `.env` changes. `EXPO_PUBLIC_*` values are bundled into the app and must not contain secrets. The backend binds to your LAN for device testing; this unauthenticated milestone is for trusted local development. Browser previews use explicit allowed origins in backend `CORS_ORIGINS`; add the exact origin if you change the Expo host/port. Native clients do not use browser CORS.

## Automated checks

Backend, with the virtual environment active:

```sh
cd backend  # if at the repository root
pytest -q
ruff check .
ruff format --check .
alembic upgrade head --sql  # inspect PostgreSQL DDL without a server
```

The ordinary suite uses deterministic mock HTTP responses and repository doubles. PostgreSQL tests skip unless `TEST_DATABASE_URL` is provided. Run them on a **disposable database**; the fixture truncates catalog tables:

```sh
# From repository root, with Compose running:
docker compose exec db createdb -U stacks stacks_test
cd backend
export TEST_DATABASE_URL=postgresql+psycopg://stacks:stacks@localhost:5432/stacks_test
DATABASE_URL="$TEST_DATABASE_URL" alembic upgrade head
pytest -q
DATABASE_URL="$TEST_DATABASE_URL" alembic check
```

For a migration round trip on that same disposable database:

```sh
DATABASE_URL="$TEST_DATABASE_URL" alembic downgrade base
DATABASE_URL="$TEST_DATABASE_URL" alembic upgrade head
```

CI runs these checks with PostgreSQL 17, including concurrent cache writes, author reuse, copy constraints, and API → provider adapter → database integration. It also checks TypeScript, generated contract drift, Expo dependency compatibility, and web export.

```sh
cd mobile
npm run typecheck
npx expo install --check
npx expo export --platform web
```

After changing Pydantic contracts, regenerate and commit both generated files:

```sh
# From backend with virtual environment active:
python scripts/export_openapi.py
cd ../mobile
npm ci --prefix ../tooling/api-types
npm run api:generate
npm run typecheck
```

## Manual acceptance checklist

1. Open the app: charcoal/sage lookup screen, readable labels, empty state, no invented library data.
2. Tap the Fantastic Mr. Fox example and submit `9780140328721`. Expect loading followed by title, authors, cover if available, and publication details.
3. Submit `0-14-032872-6`. Expect the same edition with a `CACHED` label after the initial successful lookup.
4. Try `9780140328722` or `abc`. Expect an inline validation error and a usable retry action. Empty submission should explain what to enter.
5. Try another real ISBN. Optional metadata may be absent; the layout should remain readable and missing covers should have a placeholder.
6. Stop the backend and submit again. Expect a connection message. Start it and retry. Stop PostgreSQL separately: liveness stays 200, readiness/lookup reports 503.
7. Change the input while a lookup is pending. An old result must not replace the new input's state.
8. Check small screens, keyboard dismissal, large system text, VoiceOver/TalkBack labels, scrolling, and safe areas on a real device.
9. Inspect PostgreSQL after lookups: editions/authors may exist; `library_copies` stays empty.

Book-not-found, timeout, malformed upstream data, and throttling behavior are covered deterministically in tests; a random ISBN is not a reliable way to provoke provider absence.
