# ⚙️ QueueFlow - Real-Time Project Management Backend

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white&style=for-the-badge)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white&style=for-the-badge)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF6E?logo=supabase&logoColor=white&style=for-the-badge)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white&style=for-the-badge)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white&style=for-the-badge)](https://socket.io/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-FFB300?logo=jsonwebtokens&logoColor=white&style=for-the-badge)](https://jwt.io/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github&logoColor=white&style=for-the-badge)](https://github.com/Anoop-Kumar-31/QueueFlow_Backend)

---

# 🚀 Overview

QueueFlow is a production-oriented **real-time Kanban project management backend** built with **Node.js, Express.js, Prisma ORM, PostgreSQL (Supabase), and Socket.io**.

It powers a collaborative workspace where teams can create projects, manage tasks, collaborate through sticky notes, track activities in real time, and securely manage members using Role-Based Access Control (RBAC).

Designed with scalability in mind, QueueFlow focuses on clean architecture, optimized database queries, real-time synchronization, and production-ready backend engineering practices.

---

# ✨ Core Features

- 🔐 JWT Authentication
- 👥 Role-Based Access Control (RBAC)
- 📁 Project Management
- ✅ Kanban Task Management
- 📝 Sticky Notes
- ⚡ Real-Time Updates using Socket.io
- 📈 Activity Timeline
- 📊 Dashboard Analytics
- 📨 Time-Limited Project Invitations
- 🔍 Optimized Database Queries
- 📄 Server-side Pagination
- 🛡 Custom Sliding Window Rate Limiter

---

# 🛠 Technology Stack

| Category | Technology |
|-----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | JavaScript |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma ORM |
| Authentication | JWT |
| Password Security | Bcrypt |
| Real-Time Communication | Socket.io |
| Authorization | RBAC |
| API Style | REST |
| Deployment | Render |

---

# 🏗 Architecture Highlights

### Relational Database Design

QueueFlow uses Prisma ORM with PostgreSQL to maintain a scalable relational database architecture.

Relationships include:

- User → Projects
- Project → Tasks
- Task → Sticky Notes
- Project → Activity Timeline
- User ↔ Project (Many-to-Many via ProjectMember)

---

### Real-Time Collaboration

Socket.io enables instant synchronization across connected clients.

Users joining the same project automatically receive updates when:

- Tasks are created
- Tasks are updated
- Tasks move across Kanban columns
- Sticky notes are added
- Sticky notes are edited
- Sticky notes are deleted
- Activities are generated

---

### Authentication & Authorization

QueueFlow implements stateless JWT authentication.

Every protected endpoint validates:

- JWT token
- User identity
- Project membership
- User role

Only Project Managers can access privileged endpoints like:

- Create Project
- Generate Invite
- Manage Members

---

### Activity Tracking

Every important action generates an immutable Activity Event.

Examples:

- Project Created
- Task Assigned
- Task Completed
- Sticky Note Added
- Task Deleted

This creates a complete audit history for every workspace.

---

# 🔐 Security Features

- JWT Authentication
- Password Hashing using Bcrypt
- Role-Based Access Control
- Protected Routes
- Secure Invite Codes
- Expiring Project Invitations
- Custom Sliding Window Rate Limiter
- Environment Variable Isolation
- CORS Protection

---

# ⚡ Performance Optimizations

QueueFlow has recently undergone major backend optimizations focused on reducing database load and improving response times.

### API Optimizations

- Lazy loading for Sticky Notes
- Reduced API payload sizes
- Prisma `select` queries instead of heavy `include`
- Optimized REST responses
- Removed unnecessary nested joins

---

### Pagination

Implemented server-side pagination for:

- Project Tasks
- User Queue
- Activity Timeline
- Sticky Notes

Benefits:

- Faster page rendering
- Reduced bandwidth usage
- Lower database load
- Improved scalability

---

### Database Optimizations

- Removed redundant indexes
- Added targeted composite indexes
- Optimized WHERE + ORDER BY queries
- Reduced full table scans
- Improved Prisma query execution

---

### Real-Time Improvements

- Optimistic frontend updates
- Socket synchronization
- Incremental activity loading
- Lazy note fetching

---

# 📈 Recent Engineering Improvements

Recent updates include:

- Server-side pagination across all major resources
- Lazy loading for Sticky Notes
- Composite PostgreSQL indexes
- Optimized Prisma queries
- Smaller API payloads
- Activity Timeline pagination
- Incremental frontend loading
- Custom Sliding Window Log Rate Limiter
- Improved Redux synchronization
- Better database scalability

---

# 🗄 Database Schema

![Database ER Diagram](./screenshots/ER_NEW.png)

## Core Tables

### User

Stores authentication and profile information.

Relationships

- One User → Many Projects
- One User → Many Tasks
- One User → Many Sticky Notes
- One User → Many Project Memberships

---

### Project

Represents an isolated workspace.

Contains:

- Members
- Tasks
- Activities
- Invitations

---

### Task

Stores task information including:

- Status
- Priority
- Position
- Assigned User
- Project
- Completion timestamps

---

### StickyNote

Stores collaborative notes attached to tasks.

---

### ActivityEvent

Tracks every important action occurring inside a project.

---

### ProjectInvite

Stores temporary invitation codes with automatic expiration.

---

### ProjectMember

Junction table connecting Users and Projects with assigned roles.

---

# 📂 Project Structure

```
QueueFlow_Backend
│
├── prisma
│   ├── schema.prisma
│   └── migrations
│
├── src
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── routes
│   ├── services
│   ├── sockets
│   ├── utils
│   ├── app.js
│   └── server.js
│
├── screenshots
│
├── .env
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Anoop-Kumar-31/QueueFlow_Backend.git

cd QueueFlow_Backend
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Configure Environment Variables

Create a `.env` file in the project root.

```env
DATABASE_URL="postgresql://username:password@host:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://username:password@host:5432/postgres"

PORT=5000

JWT_SECRET=your_secret_key

CLIENT_URL=http://localhost:5173
```

---

## 4️⃣ Push Database Schema

```bash
npx prisma db push
```

---

## 5️⃣ Generate Prisma Client

```bash
npx prisma generate
```

---

## 6️⃣ Start Development Server

```bash
npm run dev
```

Server starts at

```
http://localhost:5000
```

---

# 📡 REST API

## Authentication

| Method | Endpoint |
|----------|----------------|
| POST | /api/auth/register |
| POST | /api/auth/login |
| GET | /api/auth/profile |

---

## Projects

| Method | Endpoint |
|----------|--------------------------|
| GET | /api/projects |
| POST | /api/projects |
| GET | /api/projects/:projectId |
| PATCH | /api/projects/:projectId |
| DELETE | /api/projects/:projectId |

---

## Tasks

| Method | Endpoint |
|----------|-----------------------------|
| GET | /api/tasks |
| POST | /api/tasks |
| PATCH | /api/tasks/:taskId |
| DELETE | /api/tasks/:taskId |
| GET | /api/tasks/:taskId/notes |

---

## Sticky Notes

| Method | Endpoint |
|----------|-------------------------------|
| POST | /api/tasks/:taskId/notes |
| PATCH | /api/notes/:noteId |
| DELETE | /api/notes/:noteId |

---

## Activities

| Method | Endpoint |
|----------|-------------------------------|
| GET | /api/projects/:projectId/activity |

---

## Invitations

| Method | Endpoint |
|----------|--------------------------------|
| POST | /api/projects/:projectId/invite |
| POST | /api/projects/join |

---

# ⚡ Socket.io Events

QueueFlow uses Socket.io for real-time collaboration.

## Client → Server

| Event |
|--------|
| joinProject |
| leaveProject |
| typing |

---

## Server → Client

| Event | Description |
|----------|-------------------------------|
| taskCreated | New task created |
| taskUpdated | Task updated |
| taskDeleted | Task removed |
| stickyNoteAdded | New sticky note |
| stickyNoteUpdated | Sticky note updated |
| stickyNoteDeleted | Sticky note deleted |
| activityCreated | New timeline activity |

---

# 📊 Performance Metrics

Recent backend improvements include

✅ Lazy Loading

✅ Pagination

✅ Composite Database Indexes

✅ Optimized Prisma Queries

✅ Reduced Payload Size

✅ Optimistic Updates

✅ Socket Synchronization

✅ Custom Rate Limiter

These improvements significantly reduced unnecessary database operations while improving scalability for larger projects.

---

# 📸 Screenshots

## Database ER Diagram

```
screenshots/
    └── ER_NEW.png
```

### Future Screenshots

- Login
- Dashboard
- Kanban Board
- Task Details
- Activity Timeline

---

# 🚧 Roadmap

## Completed

- [x] Authentication
- [x] Authorization
- [x] RBAC
- [x] Project Management
- [x] Kanban Board
- [x] Sticky Notes
- [x] Activity Timeline
- [x] Dashboard Analytics
- [x] Socket.io Integration
- [x] Pagination
- [x] Database Optimization
- [x] Rate Limiting

---

## Upcoming Features

- [ ] Email Notifications
- [ ] Calendar Integration
- [ ] Task Attachments
- [ ] File Uploads
- [ ] Search & Filtering
- [ ] AI Task Assistant
- [ ] Project Templates
- [ ] Email Verification
- [ ] Password Reset
- [ ] Unit & Integration Testing

---

# 🧪 Development Practices

The project follows modern backend development principles including:

- Layered Architecture
- RESTful API Design
- Repository Pattern (Prisma)
- Middleware-based Authentication
- Centralized Error Handling
- Modular Routing
- Scalable Folder Structure
- Real-time Event Broadcasting
- Secure Environment Configuration

---

# 🤝 Contributing

Contributions are always welcome.

1. Fork the repository

2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit your changes

```bash
git commit -m "feat: add awesome feature"
```

4. Push the branch

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

---

# 📜 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

## Anoop Kumar

**Full Stack Developer**

### Expertise

- React.js
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- Socket.io
- REST APIs
- Database Design
- Authentication & RBAC
- Real-Time Systems

---

## Connect With Me

**GitHub**

https://github.com/Anoop-Kumar-31

**LinkedIn**

https://linkedin.com/in/anoop--kumar

**Portfolio**

https://myportfolio-kto7.onrender.com

---

⭐ If you found this project useful, consider giving it a star on GitHub. It helps support the project and motivates future improvements.
