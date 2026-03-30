# 🔱 RUDRA.0x - THE SUPREME DISCORD BOT
## Complete TypeScript Boilerplate | 1,300+ Commands | 15 Modules

---

## 📋 TABLE OF CONTENTS
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Module Breakdown](#module-breakdown)
- [Quick Start](#quick-start)
- [Database Configuration](#database-configuration)
- [Deployment](#deployment)

---

## 🎯 PROJECT OVERVIEW

**RUDRA.0x** is an advanced, feature-rich Discord bot engineered for:
- **High-tier server management** with 44-flag antinuke shield
- **Elite security** with SentinelScan (66 commands)
- **Entertainment** with 99-command audio engine & 150-command economy
- **AI Integration** with Gemini AI, image generation, voice synthesis
- **Database Flexibility** - switch between JSON (GitHub) and SQLite with zero code changes

### Key Statistics:
- **1,300+ Commands** across 15 specialized modules
- **3-Page Help Menu** with 63 pagination buttons
- **18-Status Rotation Engine** that reacts to server events
- **Type-Safe** - 100% TypeScript with strict mode
- **Modular Architecture** - easily add/remove modules
- **Production Ready** - error handling, logging, security

---

## 🏗️ ARCHITECTURE

### Core Components:

```
RUDRA.0x BOT
├── Command Handler (Modular system)
├── Event Handler (Discord.js events)
├── Database Handler (JSON/SQLite abstraction)
├── Status Rotator (18 dynamic statuses)
├── Security Layer (Antinuke + Sentinel)
└── Module System (15 specialized modules)
```

### Database Architecture:
```
If DB_TYPE=GITHUB_JSON:
  ├── src/database/local/users.json
  └── src/database/local/guilds.json

If DB_TYPE=SQLITE:
  └── src/database/rudra_main.sqlite
      ├── users table
      ├── guilds table
      └── transactions table
```

---

## 🚀 INSTALLATION

### Prerequisites:
- **Node.js 20+** ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Discord Bot Token** ([Create here](https://discord.com/developers/applications))
- **Bot Permissions**: 8 (Administrator)

### Step 1: Clone/Setup Project

```bash
# Navigate to project directory
cd c:\Users\harsha\Desktop\Rudra

# Install dependencies
npm install

# Install TypeScript globally (optional but recommended)
npm install -g typescript ts-node
```

### Step 2: Configure Environment

```bash
# Copy .env template
cp .env.example .env

# Edit .env with your values
# --- BOT CORE ---
BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
CLIENT_ID=YOUR_BOT_APPLICATION_ID
PREFIX=/

# --- STAFF IDS ---
ASHU_ID=YOUR_DISCORD_ID
ZORO_ID=YOUR_DEV_ID

# --- DATABASE ---
DB_TYPE=GITHUB_JSON  # or SQLITE
DATABASE_PATH=./src/database/rudra_main.sqlite

# --- API KEYS ---
GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_KEY

# --- SYSTEM ---
VC_STATUS_INTERVAL=600000  # 10 minutes
NODE_ENV=development
```

### Step 3: Build & Run

```bash
# Development (with auto-reload)
npm run dev

# Production build
npm run build
npm start

# Watch mode (for development)
npm run watch
```

---

## ⚙️ CONFIGURATION

### Change Database Type:

**Option 1: JSON (GitHub-Synced)**
```env
DB_TYPE=GITHUB_JSON
```
- ✅ Easy to version control
- ✅ GitHub-synced automatically
- ❌ Slower for large datasets
- Files: `src/database/local/users.json` & `guilds.json`

**Option 2: SQLite (Recommended for Production)**
```env
DB_TYPE=SQLITE
DATABASE_PATH=./src/database/rudra_main.sqlite
```
- ✅ Fast queries
- ✅ Transaction support
- ✅ Relational data handling
- ❌ Requires initialization

### Customize Status Rotation:

Edit `src/utils/statusRotator.ts`:

```typescript
private statuses: StatusOption[] = [
  {
    text: "Your custom status here",
    type: ActivityType.Playing,
  },
  // Add more...
];
```

### Owner-Only Commands:

Hardcoded in commands with:
```typescript
if (interaction.user.id !== process.env.ASHU_ID) {
  return interaction.reply("❌ Owner only!");
}
```

---

## 📂 PROJECT STRUCTURE

```
RUDRA.0x/
├── src/
│   ├── index.ts                    # Main entry point
│   │
│   ├── commands/
│   │   ├── utility/
│   │   │   └── help.ts            # 63-button help menu
│   │   ├── moderation/
│   │   │   ├── ban.ts
│   │   │   ├── warn.ts
│   │   │   └── ... (77 commands)
│   │   ├── security/
│   │   │   ├── antinuke.ts        # 44-flag shield
│   │   │   ├── sentinel.ts        # 66 scanning commands
│   │   │   └── ...
│   │   ├── economy/
│   │   │   ├── balance.ts
│   │   │   ├── shop.ts
│   │   │   ├── casino.ts
│   │   │   └── ... (150 commands)
│   │   ├── music/
│   │   │   ├── play.ts
│   │   │   ├── filters.ts
│   │   │   └── ... (99 commands)
│   │   ├── ai/
│   │   │   ├── chat.ts
│   │   │   ├── image.ts
│   │   │   └── voice.ts
│   │   └── ... (9 more modules)
│   │
│   ├── events/
│   │   ├── ready.ts               # Bot startup
│   │   ├── interactionCreate.ts   # Command handling
│   │   ├── messageCreate.ts       # Messages
│   │   ├── guildMemberAdd.ts      # Joins
│   │   └── ...
│   │
│   ├── handlers/
│   │   ├── commandHandler.ts      # Load commands (1,300+)
│   │   ├── eventHandler.ts        # Load events
│   │   └── errorHandler.ts        # Centralized errors
│   │
│   ├── database/
│   │   ├── dbHandler.ts           # Abstraction layer
│   │   └── local/
│   │       ├── users.json         # User data (JSON mode)
│   │       └── guilds.json        # Guild configs
│   │
│   ├── utils/
│   │   ├── statusRotator.ts       # 18-status engine
│   │   ├── logger.ts              # Logging utility
│   │   ├── validators.ts          # Input validation
│   │   └── helpers.ts             # General utilities
│   │
│   └── types/
│       └── index.ts               # TypeScript interfaces
│
├── dist/                          # Compiled JS (after build)
├── .env                           # Environment variables
├── .env.example                   # Template
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── README.md                      # This file
└── .gitignore                     # Git ignore rules
```

---

## 📦 MODULE BREAKDOWN (15 Modules)

| # | Module | Commands | Key Features |
|---|--------|----------|--------------|
| 1 | VIP & Owner | 24 | God-mode access, auto-admin, mass-nuke |
| 2 | Antinuke | 86 | 44 security flags, whitelist, alliance |
| 3 | SentinelScan | 66 | URL scanning, payload detection, user profiling |
| 4 | Moderation | 77 | Auto-mod, strikes, channel control |
| 5 | Utility & AI | 69 | AI chat, tickets, voice synthesis |
| 6 | Pro Music | 99 | 8D audio, filters, playlists, 25-button console |
| 7 | Economy | 150 | Banking, OTT shop, casino, 100+ items |
| 8 | JTC Voice | 50 | Join-to-create automation |
| 9 | Tickets | 53 | Support system, eSports registration |
| 10 | Creator | 85 | YouTube sync, Instagram, live counters |
| 11 | Gateway | 97 | Verification, auto-roles, wormhole, IDE |
| 12 | Greeting | 100 | Welcome cards, invite tracking, growth stats |
| 13 | Echo | 69 | Auto-responder, mimic, custom reactions |
| 14 | (Reserved) | - | - |
| 15 | Future-Tech | 100 | AI images, media studio, profiles |

---

## 🎛️ QUICK START

### 1. Create First Custom Command

Create `src/commands/custom/hello.ts`:

```typescript
import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const helloCommand: Command = {
  name: "hello",
  description: "Say hello!",
  category: "custom",
  module: "custom",
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply(`👋 Hello, ${interaction.user.username}!`);
  },
};

export default helloCommand;
```

The command will auto-load when bot starts!

### 2. Add Custom Event

Create `src/events/guildMemberAdd.ts`:

```typescript
import { GuildMember } from "discord.js";
import { EventHandler } from "../types";

const guildMemberAddEvent: EventHandler = {
  name: "guildMemberAdd",
  execute(member: GuildMember) {
    console.log(`👋 ${member.user.tag} joined ${member.guild.name}`);
  },
};

export default guildMemberAddEvent;
```

### 3. Access Database in Commands

```typescript
const db = (global as any).db;

// Get user
const user = await db.getUser(interaction.user.id);

// Update user
user.balance += 100;
await db.setUser(interaction.user.id, user);
```

---

## 🗄️ DATABASE CONFIGURATION

### Initial Setup (JSON Mode):
Files auto-create at `src/database/local/`:
- `users.json` - User bank accounts, XP, roles
- `guilds.json` - Server configurations, antinuke settings

### Initial Setup (SQLite Mode):
```bash
# Database file creates automatically
# Tables: users, guilds, transactions
```

### Switching Databases (Zero-Code):

```env
# Change this single line - NO code changes needed!
DB_TYPE=SQLITE  # was GITHUB_JSON
```

The abstraction layer handles everything!

---

## 🚀 DEPLOYMENT

### Option 1: Heroku (Recommended for Testing)

```bash
# Install Heroku CLI
# Create Procfile
echo "worker: npm run build && npm start" > Procfile

# Deploy
git push heroku main
```

### Option 2: VPS (DigitalOcean/Linode)

```bash
# SSH into server
ssh root@your_ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone project
git clone <your-repo> rudra-bot
cd rudra-bot

# Setup with PM2
npm install -g pm2
npm install
npm run build

# Start bot
pm2 start dist/index.js --name rudra

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Option 3: Docker

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```bash
# Build & run
docker build -t rudra-bot .
docker run -d --env-file .env rudra-bot
```

---

## 📊 HELP MENU STRUCTURE

The bot includes a **63-Button Help Menu** split into 3 pages:

### Page 1: THE SECURITY VAULT
- 🛡️ Antinuke (86 commands)
- 🦠 Sentinel (66 commands)
- ⚖️ Moderation (77 commands)
- 🎫 Support Tickets (53 commands)
- 🎭 Gateway (97 commands)
- 🌀 Wormhole (22 commands)

### Page 2: THE LIFESTYLE & CASINO
- 🏦 Economy (150 commands)
- 🛒 OTT Shop (100 items)
- 🎰 Casino (40 games)
- 🎡 Entertainment (175 commands)
- 🎵 Music (99 commands)
- 🔊 Voice (50 commands)

### Page 3: THE AI & DEV STUDIO
- 🧠 Gemini AI (12 commands)
- 🎨 AI Image Generation (30 commands)
- 🎙️ AI Voice Synthesis (8 commands)
- 🗣️ Echo Engine (69 commands)
- 🛠️ Utilities (23 commands)
- 👑 Owner Panel (God-mode)

---

## 🔐 SECURITY NOTES

### Owner Protection:
```typescript
// Commands automatically check:
if (interaction.user.id !== process.env.ASHU_ID) {
  // Access denied
}
```

### Permission Layers:
1. **Owner-Only** - /eval, /exec, /mass-nuke
2. **Admin-Required** - /shield, /antinuke config
3. **Moderator** - /warn, /mute, /lock
4. **VIP-Tier** - /custom-role, /ghost-vc
5. **Everyone** - /help, /balance, /play

---

## 📈 SCALING TO 1,300+ COMMANDS

The boilerplate supports infinite commands:

```
Each Module:
  ├── 3-15 categories
  └── 5-30 commands per category

Example: Module 7 (Economy)
  ├── Banking (20)
  ├── Shop (30)
  ├── Casino (40)
  ├── Leveling (20)
  └── ... = 150 total
```

Simply create new files in `src/commands/{module}/`:
- Bot auto-loads them
- Auto-registers with Discord
- Type-safe with Command interface

---

## 🛠️ TROUBLESHOOTING

### Bot not responding?
```bash
# Check logs
tail -f logs/bot.log

# Verify token in .env
echo $BOT_TOKEN

# Restart
npm run dev
```

### Database errors?
```typescript
// Ensure tables exist for SQLite
npm run build  # Initializes schema
```

### Commands not loading?
```bash
# Commands load from src/commands/
# If file names don't match module structure, check:
1. File extension is .ts
2. Command has export default
3. Module folder exists
```

---

## 📚 RESOURCES

- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Better SQLite3 Docs](https://github.com/WiseLibs/better-sqlite3/wiki)

---

## 📄 LICENSE

MIT License - Free to use, modify, and distribute.

---

## 🙏 CREDITS

**Owner & Architect**: Ashu 👑  
**Lead Developer**: Zoro ⚔️  
**Created**: 2026  
**Status**: 🔴 Under Development → 🟢 Production Ready

---

**🔱 RUDRA.0x: Beyond Limitations. Beyond Boundaries. 🔱**

For issues, feature requests, or contributions, please raise a GitHub issue or contact the development team.

---

## ⚡ QUICK COMMAND REFERENCE

```bash
# Development
npm run dev              # Start with auto-reload
npm run watch           # TypeScript watch mode

# Production
npm run build           # Compile TypeScript
npm start               # Run compiled bot

# Utilities
npm run lint            # Check code style
npm run format          # Format code (prettier)
npm run help            # Show all commands
```

---

**Last Updated**: March 29, 2026  
**Bot Version**: 1.0.0  
**Discord.js**: v14.14.0  
**Node.js**: 20.0.0+
