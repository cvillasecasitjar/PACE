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
