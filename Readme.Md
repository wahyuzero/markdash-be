# MarkDash Backend 📊

Backend API untuk **MarkDash** - sistem dashboard interaktif berbasis Markdown dengan fitur checklist, log aktivitas, dan notifikasi.

## ✨ Fitur Utama

- ✅ **Authentication** - Register, login dengan JWT (24h expiry)
- 📋 **Board Management** - CRUD dashboard dengan markdown + metadata
- 🕒 **Activity Logs** - Track checklist completion dan aktivitas
- 🔔 **Notifications** - Reminder dan notifikasi berbasis waktu
- 🔒 **Security** - Password hashing (bcrypt), JWT middleware
- 🌐 **Public Boards** - Share dashboard secara publik
- 💾 **Deno KV** - Database NoSQL built-in Deno

## 🚀 Quick Start

### Prerequisites
- [Deno](https://deno.land/) v2.5+

### Installation

```bash
# Clone repository
git clone https://github.com/wahyuzero/markdash-be
cd markdash-be

# Run server
deno task start

# Or dengan watch mode (auto-reload)
deno task dev
```

Server akan berjalan di `http://localhost:8000`

### Environment Variables

Buat file `.env` (opsional):

```env
PORT=8000
JWT_SECRET=your-super-secret-key-change-this
```

## 📁 Struktur Folder

```
markdash-backend/
├── src/
│   ├── main.ts                 # Entry point server
│   ├── types.ts                # Type definitions
│   ├── middleware/
│   │   └── authMiddleware.ts   # JWT validation
│   ├── routes/
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── boards.ts           # Board CRUD
│   │   ├── logs.ts             # Activity logs
│   │   └── notify.ts           # Notifications
│   └── utils/
│       ├── kv.ts               # Deno KV operations
│       ├── crypto.ts           # Password & JWT utils
│       └── response.ts         # Response helpers
├── deno.json                   # Deno configuration
└── README.md
```

## 🛠️ Tech Stack

- **Runtime:** Deno 2.5
- **Framework:** Oak (Router + Middleware)
- **Database:** Deno KV (Built-in NoSQL)
- **Auth:** JWT + bcrypt
- **Deployment:** Deno Deploy ready


### Quick API Overview

#### Authentication
```bash
POST /api/register       # Register user baru
POST /api/login          # Login & dapat JWT token
GET  /api/me             # Info user saat ini
POST /api/logout         # Logout
```

#### Boards
```bash
GET    /api/boards          # List semua board
GET    /api/boards/:id      # Detail board
POST   /api/boards          # Buat board baru
PUT    /api/boards/:id      # Update board
DELETE /api/boards/:id      # Hapus board
GET    /api/public/:boardId # Akses public board (no auth)
```

#### Logs
```bash
GET    /api/logs/:boardId           # List logs by board
GET    /api/logs/:boardId/:date     # Log tanggal spesifik
POST   /api/logs                    # Buat/update log
DELETE /api/logs/:id                # Hapus log
```

#### Notifications
```bash
GET    /api/notify/:boardId         # List notifikasi aktif
POST   /api/notify                  # Buat notifikasi
PATCH  /api/notify/:id/dismiss      # Dismiss notifikasi
DELETE /api/notify/:id              # Hapus notifikasi
```

## 💻 Frontend Integration

### Contoh Login

```javascript
const response = await fetch('http://localhost:8000/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'john', password: 'pass123' })
});

const { token, user } = await response.json();
localStorage.setItem('authToken', token);
```

### Contoh Fetch Boards

```javascript
const token = localStorage.getItem('authToken');

const boards = await fetch('http://localhost:8000/api/boards', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

### Contoh Log Checklist

```javascript
await fetch('http://localhost:8000/api/logs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    boardId: 'abc123',
    actions: [
      { type: 'check', task: 'Morning standup', time: new Date().toISOString() }
    ]
  })
});
```

## 🔑 Deno KV Key Patterns

```
user:${userId}                    # User data
user_by_username:${username}      # Username lookup
board:${userId}:${boardId}        # Board data
log:${boardId}:${date}            # Daily log (YYYY-MM-DD)
notif:${boardId}:${notifId}       # Notification data
```

## 🔐 Security Features

- ✅ Password hashing dengan bcrypt
- ✅ JWT dengan expiry 24 jam
- ✅ Protected routes dengan middleware
- ✅ User-specific data isolation
- ✅ Public/private board visibility

## 🚢 Deployment

### Deploy ke Deno Deploy

1. Install Deno Deploy CLI:
```bash
deno install -Arf jsr:@deno/deployctl
```

2. Deploy project:
```bash
deployctl deploy --project=markdash src/main.ts
```

3. Set environment variables di Deno Deploy dashboard:
   - `JWT_SECRET` = your-secret-key


## 🧪 Testing

```bash
# Test endpoints dengan curl
curl http://localhost:8000/api

# Register user
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```


## 📝 License

MIT License
