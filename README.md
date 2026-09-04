![ieeecs-template-header](https://github.com/user-attachments/assets/c3c40c85-51a2-4a5e-82a4-c32a0223e336)

<h1 align="center">BattleCode Arena — Frontend</h1>

<h4 align="center">A gamified 1v1 competitive programming platform built by IEEE Computer Society, VIT.</h4>

---

## Overview

Provide a concise description of:

- **The problem being addressed:** Traditional competitive programming can feel isolated and lack immediate engagement. BattleCode addresses this by adding real-time 1v1 mechanics and gamified elements.
- **Why it is relevant:** It provides an interactive environment for developers to test their skills in a head-to-head competitive format, making coding practice more dynamic and social.
- **What this project aims to achieve:** This project provides the frontend for the BattleCode Arena, enabling participants to solve challenges, manage matches, and track leaderboard status in a highly themed, responsive environment.

---

## Architecture Overview

The BattleCode frontend is a modern Next.js 16 application built with a focus on real-time interactivity and secure competitive environments.

### Core Components:

- **Authentication:** Integrated with Supabase Auth (Google OAuth) and a custom `AuthContext` to verify sessions against a backend API.
- **Real-time Engine:** Uses Socket.IO (`SocketContext`) to handle live match status, matchmaking cycles, and the event-driven leaderboard.
- **Problem Solving Environment:** A custom coding interface using Monaco Editor that handles code submission and provides real-time test verification via Judge0 integration.
- **Security & Integrity:** The `SecureWrapper` component enforces fullscreen mode and monitors for tab-switching or developer tool usage to maintain fair play.

### Data Flow:

- **Session Management:** Auth state is managed via Supabase SSR and Next.js middleware, ensuring protected routes are properly gated.
- **Live Updates:** The backend pushes round-specific state updates (Round 0-3) over WebSockets, which are consumed by round-specific lobbies and dashboards.
- **Execution:** User code is sent to the backend proxy, executed via Judge0, and the results are returned to the `CodePage` for immediate display.

---

## Tech Stack

| Layer       | Technology Used                                         |
| ----------- | ------------------------------------------------------- |
| Frontend    | Next.js 16 (App Router), React 19, TypeScript           |
| Backend     | Node.js / Express (Separate Repository)                 |
| Database    | Supabase (PostgreSQL), Redis (for session/round state)  |
| Layout / UI | Tailwind CSS 4, Framer Motion                           |
| Other Tools | Monaco Editor, Socket.IO Client, Chart.js, Lucide React |

---

## Project Structure

```bash
src/
├── app/                  # Next.js App Router routes and page layouts
│   ├── (main)/           # Protected routes (Dashboard, Rounds 0-3, Admin)
│   ├── api/              # API routes (Auth callback, Session management)
│   └── globals.css       # Global design tokens and tailwind configuration
├── components/           # Reusable UI components
│   ├── shared/           # Core features (SecureWrapper, CodePage, Lobbies)
│   └── editor/           # Monaco editor wrappers
├── contexts/             # Application-wide state (Auth, Socket, Round)
├── lib/                  # Initialization logic (Supabase, Socket instance)
├── types/                # TypeScript interfaces for questions and round state
└── utils/                # Helper functions for Supabase and general logic
```

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/IEEECS-VIT/battlecode-frontend.git
cd battlecode-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and define the required variables.

Refer to the **Environment Variables** section below for the list of required keys.

### 4. Run the Project

```bash
npm run dev
```

---

## Docker Setup

### Build Image

```bash
docker build -t battlecode-frontend .
```

### Run Container

```bash
docker run -p 3000:3000 battlecode-frontend
```

---

## Git Hooks Setup

This repository uses custom Git hooks to enforce commit standards and branch discipline.

After cloning the repository, run the following command once:

```bash
git config core.hooksPath .hooks
```

This enables:

- Commit message validation
- Blocking direct pushes to `main`

---

## Environment Variables

| Variable Name                 | Description                      |
| ----------------------------- | -------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Supabase project URL             |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase public anonymous key    |
| NEXT_PUBLIC_SOCKET_URL        | WebSocket server URL (Socket.IO) |
| NEXT_PUBLIC_API_URL           | Backend API server URL           |

---

## Deployment

The project is optimized for deployment on the **Vercel Platform**.

**Build Steps:**

1. Configure environment variables in the Vercel dashboard.
2. Run `npm run build` to generate the production optimized bundle.
3. Deploy the resulting `.next` output.

---

## Testing (If Applicable)

Currently, unit testing is in the planning phase. To run linting checks:

```bash
npm run lint
```

---

## Project Status

- 🟢 In Development

---

## 🙏 Acknowledgments

- **IEEE Computer Society, VIT** — Event organization
- **Judge0** — Code execution engine
- **Supabase** — Authentication and database
- **Vercel** — Hosting platform
