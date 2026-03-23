# ⚙️ QueueFlow - Real-Time API (Backend)

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white&style=for-the-badge)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white&style=for-the-badge)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3Ecf6E?logo=supabase&logoColor=white&style=for-the-badge)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white&style=for-the-badge)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white&style=for-the-badge)](https://socket.io/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-ffff00?logo=JSON%20web%20tokens&logoColor=white&style=for-the-badge)](https://jwt.io/)
[![CORS](https://img.shields.io/badge/CORS-Enabled-5555ff?style=for-the-badge)](https://www.npmjs.com/package/cors)
[![Bcrypt](https://img.shields.io/badge/Bcrypt-5.1.1-000000?style=for-the-badge)](https://www.npmjs.com/package/bcrypt)
[![GitHub](https://img.shields.io/badge/GitHub-Backend-2496ED?logo=github&logoColor=white&style=for-the-badge)](https://github.com/Anoop-Kumar-31/QueueFlow_Backend)

---

This repository powers the backend infrastructure behind **QueueFlow**, a high-performance Real-time Kanban Workspace. It features robust RESTful endpoints bound natively over an integrated Socket.io ecosystem seamlessly driving Real-time application states directly to isolated front-end clients dynamically.

---

## ✨ Architecture Highlights

* **Relational Database Engine**: Complex, scalable schema designs utilizing **Prisma ORM** built strictly over a **PostgreSQL** (Supabase) database natively enforcing relational tracking blocks (Users -> Projects -> Tasks).
* **Bi-directional WebSockets**: Wrapped the Express HTTP server cleanly into a Socket.io node instance pushing organic telemetry signals isolated exclusively into target active 'Project Rooms'.
* **Time-Bound Cryptographic Invites**: Highly secure cryptographic generation of 6-character Workspace invitations natively evaluating database deadlines executing organic expiry mechanics securely mitigating unauthorized onboardings.
* **Granular Audit Logging**: Custom telemetry tracking logic executing strict `.create()` Prisma hooks immediately sequentially following state interactions permanently generating timeline Analytics securely.
* **JWT Identity Chains**: Stateless JWT-driven authentication headers executing distinct RBAC (Role-Based Access Control) gates strictly preventing Developers from hitting PM-restricted routing nodes securely.

---

## 🗄️ Database Schema & Relations

![Database ER Diagram](./screenshots/ER.png)

The backend is strictly typed and managed using Prisma. Below is a high-level overview of our core tables and how they structurally map the relational QueueFlow ecosystem:

* **`User` (Table)**: Core identity store tracking authentication data (Email, Password Hash) and their persistent `Role` (`PM`, `DEVELOPER`, `CLIENT`).
  * *One-to-Many* ➔ `Project` (A PM creates many Projects).
  * *One-to-Many* ➔ `ProjectMember` (A user can join many workspaces).
  * *One-to-Many* ➔ `Task` (A user is assigned multiple workload items).

* **`Project` (Table)**: Represents an isolated Workspace initialized natively by a Project Manager.
  * *One-to-Many* ➔ `ProjectMember` (Manages who securely has access to the workspace).
  * *One-to-Many* ➔ `Task` (Scopes tasks exclusively to this workspace border).
  * *One-to-Many* ➔ `ActivityEvent` (Scopes timeline logs directly to the project dashboard).

* **`ProjectMember` (Table)**: Serves as the junction matrix securely resolving many-to-many mapping boundaries between `User` ⇄ `Project`.
  * Enforces unique compound keys `[user_id, project_id]` preventing duplicate roles simultaneously holding state.

* **`Task` (Table)**: Granular workload rows tracking agile assignments. Contains state (`status`), structural queue order (`position`), and analytical timestamps (`started_at`, `completed_at`). 
  * *Many-to-One* ➔ `User` (The Developer Assigned).
  * *Many-to-One* ➔ `Project` (The target Workspace).

* **`ProjectInvite` (Table)**: Temporary cryptographic keys allowing users to bypass manual PM assignments securely natively. 
  * Features a strict `expires_at` column actively evaluated mitigating unauthorized onboardings. 

* **`ActivityEvent` (Table)**: Permanent immutable telemetry tracking strings tracing exact granular actions chronologically (e.g. `MOVED_TASK`).
  * *Many-to-One* ➔ `User` (The explicit actor who executed the change).
  * *Many-to-One* ➔ `Task` (Optional reference mapping directly back to the modified Task!).

---

## 📦 Setup & Initialization

### 1. Clone the repository
```bash
git clone https://github.com/Anoop-Kumar-31/QueueFlow_Backend.git
cd QueueFlow_Backend
```

### 2. Install Packages
```bash
npm install
```

### 3. Environment Configuration
Construct a local `.env` exposing your PostgreSQL connections firmly isolating secrets securely formatting like so:
```env
DATABASE_URL="postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

PORT=5000
JWT_SECRET=your_super_secret_jwt_string
CLIENT_URL=http://localhost:5173
```

### 4. Push Database Schema
Execute Prisma's DB Push to force the Postgres engine to compile the QueueFlow analytical tables natively:
```bash
npx prisma db push
```

### 5. Launch Application
```bash
npm run dev
```
The Node.js server and Socket.io instances will aggressively spin up binding to Port `5000` executing seamlessly.

---

**Anoop Kumar | Full Stack Developer**
