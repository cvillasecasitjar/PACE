# Pace

> **The only financial app that thinks like a student.**

Pace is a mobile app that helps students and young people with limited or irregular
income manage their money in a simple, intuitive way — connected to their real bank
accounts via Open Banking (PSD2). It answers the one question that matters in the
moment: **"Can I afford this right now?"**

This repository is a **monorepo** containing the open-source client (mobile app),
the backend API, and shared TypeScript types.

---

## Monorepo structure

```
pace/
├── apps/
│   ├── mobile/        # React Native + Expo app (iOS / Android / Web)
│   └── backend/       # Node.js + Express + TypeScript REST API
├── packages/
│   └── shared/        # Shared TypeScript types & domain logic contracts
├── package.json       # npm workspaces root
└── tsconfig.base.json
```

## Tech stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| Mobile App       | React Native + Expo                         |
| Client state     | Zustand + React Query                       |
| Navigation       | React Navigation v6                         |
| Backend API      | Node.js + Express + TypeScript              |
| ORM / DB         | Prisma — SQLite (dev) / PostgreSQL (prod)   |
| Auth             | JWT (email/password) — Supabase-ready       |
| Open Banking     | Provider abstraction → Mock (dev) / Tink    |
| i18n             | Spanish + English                           |

> The bank integration sits behind a **provider abstraction layer**. Out of the box
> it uses a realistic **mock provider** so the whole app runs offline with no
> credentials. Dropping in real **Tink** (EU) or **Plaid** (US) keys requires no
> changes to the rest of the system.

---

## Quick start

> Requires **Node.js 18+**. Everything runs locally with **zero external accounts**.

```bash
# 1. Install all workspace dependencies (from the repo root)
npm install

# 2. Build the shared types package
npm run build:shared

# 3. Set up the local database (SQLite) and seed demo data
npm run db:setup
npm run seed

# 4. Start the backend API  (http://localhost:4000)
npm run backend

# 5. In a second terminal, start the mobile app
npm run mobile:web      # opens in the browser (easiest on Windows)
# or:  npm run mobile    # Expo dev server (scan QR with Expo Go, or run emulator)
```

### Demo login

The seed script creates a demo user with a connected (mock) bank account full of
realistic transactions:

```
email:    demo@pace.app
password: pace1234
```

---

## View it on your phone (Expo Go)

To run the app on your real iPhone/Android (not just the browser):

1. **Install Expo Go** on your phone (App Store / Play Store).
2. **Same Wi-Fi:** your phone and your computer must be on the **same network**.
3. **Find your computer's local IP** (so the phone can reach the backend; `localhost`
   on the phone means the phone itself, not your PC):

```powershell
# Windows (PowerShell): look for an address like 192.168.x.x
ipconfig | Select-String "IPv4"
```

4. **Point the app at your backend** via an env var, then start both servers:

```powershell
# Terminal 1 — backend (already listens on all interfaces)
npm run backend

# Terminal 2 — tell the app where the backend is, then start Expo
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.20:4000"   # <-- your IP from step 3
npm run mobile
```

5. **Scan the QR** shown in the terminal: open the **Camera** app (iPhone) or the
   **Expo Go** app (Android) and point it at the QR. The app opens in Expo Go.

### If the QR won't connect (common on Windows / strict Wi-Fi)

Use **tunnel mode**, which routes the connection through the internet instead of the
LAN (the first run installs a small helper):

```powershell
npm run mobile:tunnel
```

> Note: in tunnel mode the **JavaScript bundle** comes through the tunnel, but API
> calls still go to `EXPO_PUBLIC_API_URL`. For the data to load, your phone must
> reach that address — so keep both devices on the same Wi-Fi, or deploy the backend
> publicly. If you only want to see the UI, the app still loads either way.

---

## Development workflow (recommended habit)

This repo has a **CI pipeline** (GitHub Actions, see `.github/workflows/ci.yml`) that
typechecks and runs the full test suite on every push and pull request to `main`.

CI runs **after** you push and reports ✅/❌ on the commit. To avoid pushing something
broken in the first place, get into this rhythm:

```powershell
# 1. Run the tests locally first (takes a couple of seconds)
npm test

# 2. If green, typecheck everything (optional but catches type errors)
npm run typecheck

# 3. Commit and push
git add .
git commit -m "your message"
git push
```

4. Open the repo's **Actions** tab on GitHub and confirm the run is **green**.
5. If it's red, open the failing step, read the error, fix it, and push again.

> Working solo? A push straight to `main` is fine. When you want the extra safety net
> of *"can't merge while CI is red"*, work on a **branch**, open a **Pull Request**,
> and merge only once the check is green. See `docs/TESTS.md` for the full testing &
> CI guide.

---

## How the "Can I afford this?" engine works

Given an amount `X`, the decision engine computes:

```
discretionary = current_balance
              − fixed_commitments_remaining_this_month   (detected recurring payments)
              − safety_buffer                            (user-configured)

verdict = YES      if X <= discretionary - buffer headroom
          CAUTION  if X eats meaningfully into the buffer
          NO       if X would push you below your safety buffer
```

It returns a **natural-language recommendation**, not just a number.

---

## Security model (PSD2 / Open Banking)

- Pace **never** sees or stores banking credentials. The user authenticates directly
  with their bank (SCA) through the provider's secure flow.
- Pace receives a **read-only (AISP)** access token, stored **encrypted with AES-256**.
- Tokens can be revoked instantly by the user, and expire per PSD2 (≈90 days).
- TLS 1.3 in transit; GDPR-aligned, EU-hosted in production.

See [`apps/backend`](apps/backend) for implementation details.

---

## License

Client code is open source under the [MIT License](LICENSE).
