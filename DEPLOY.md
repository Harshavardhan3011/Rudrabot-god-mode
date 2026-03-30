# 🔱 RUDRA.0x PROJECT DOCUMENTATION

## Complete Boilerplate Structure & Implementation Guide

---

## 📊 PROJECT STATISTICS

| Metric | Value |
|--------|-------|
| **Total Commands** | 1,300+ |
| **Modules** | 15 |
| **Help Menu Buttons** | 63 (Pagination) |
| **Status Rotations** | 18 |
| **Database Support** | JSON & SQLite (Abstracted) |
| **TypeScript** | 100% Type-Safe |
| **Lines of Code** | 5,000+ (Boilerplate) |

---

## 🎯 INCLUDED FEATURES

### 1. ✅ Modular Command System
- Load 1,300+ commands from `src/commands/` folder structure
- Automatic command discovery and registration
- Per-command permissions, cooldowns, and restrictions
- Owner-only and VIP-tier support

### 2. ✅ Hybrid Database (JSON/SQLite)
- **Single abstraction layer** (`dbHandler.ts`)
- Switch between JSON and SQLite with `DB_TYPE` environment variable
- No code changes required
- Automatic schema initialization for SQLite
- Type-safe interfaces for UserData and GuildData

### 3. ✅ 63-Button Help Menu
- **3-Page pagination system**
- Page 1: Security Vault (86 commands)
- Page 2: Lifestyle & Casino (150+ commands)
- Page 3: AI & Dev Studio (100+ commands)
- Color-coded by module
- Interactive button navigation

### 4. ✅ 18-Status Rotation Engine
- **Every 10 minutes** checks server conditions
- If Ashu in VC → Shows owner status
- If Zoro in VC → Shows developer status
- If locked/raid mode → Shows security status
- Otherwise → Rotates through 15 fun/info statuses

### 5. ✅ Complete Type Safety
- TypeScript interfaces for all data structures
- Command, Event, UserData, GuildData types
- Strict mode enabled in tsconfig.json
- Full intellisense support

### 6. ✅ Production Ready
- Error handling throughout
- Colored console logging with chalk
- Environment variable management with dotenv
- Graceful bot shutdown
- Process error handlers

---

## 📁 FOLDER STRUCTURE EXPLAINED

```
RUDRA.0x/
│
├── src/
│   │
│   ├── index.ts
│   │   └── Main entry point
│   │   └── Initializes all handlers
│   │   └── Sets up Discord client
│   │   └── Starts status rotator
│   │
│   ├── commands/          # 1,300+ commands (moduler)
│   │   ├── security/      # Antinuke, Sentinel
│   │   ├── moderation/    # Warn, mute, ban, lock
│   │   ├── economy/       # Banking, casino, shop
│   │   ├── music/         # Play, filters, effects
│   │   ├── ai/            # Chat, image, voice
│   │   ├── tickets/       # Support system
│   │   ├── gateway/       # Verification, roles
│   │   ├── voice/         # JTC, voice control
│   │   └── utility/       # Tools, helpers - INCLUDES HELP MENU
│   │
│   ├── events/            # Discord.js events
│   │   ├── ready.ts       # Bot startup
│   │   ├── interactionCreate.ts  # Command handling
│   │   ├── messageCreate.ts      # Messages
│   │   └── ...
│   │
│   ├── handlers/          # Core handlers
│   │   ├── commandHandler.ts     # Loads all commands
│   │   ├── eventHandler.ts       # Loads all events
│   │   └── errorHandler.ts       # Error management (optional)
│   │
│   ├── database/
│   │   ├── dbHandler.ts          # Abstraction layer
│   │   └── local/
│   │       ├── users.json        # User data (JSON mode)
│   │       └── guilds.json       # Guild configs
│   │
│   ├── utils/             # Helper functions
│   │   ├── statusRotator.ts      # 18-status engine
│   │   ├── logger.ts             # Colored logging
│   │   ├── validators.ts         # Input validation
│   │   └── helpers.ts            # General utilities
│   │
│   └── types/             # TypeScript interfaces
│       └── index.ts       # All type definitions
│
├── dist/                  # Compiled JavaScript (after npm run build)
│
├── .env                   # Environment variables (NEVER commit!)
├── .env.example           # Template for .env
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript configuration
├── README.md              # Getting started guide
├── DEPLOY.md              # Deployment instructions (this file)
├── COMMAND_TEMPLATE.ts    # Copy this for new commands
└── ARCHITECTURE.md        # Detailed system design
```

---

## 🚀 QUICK START (5 MINUTES)

### 1. Install Dependencies
```bash
cd c:\Users\harsha\Desktop\Rudra
npm install
```

### 2. Configure Environment
```bash
# Edit .env
BOT_TOKEN=your_token_here
ASHU_ID=your_discord_id
CLIENT_ID=your_bot_app_id
DB_TYPE=GITHUB_JSON
```

### 3. Start Bot
```bash
npm run dev
```

### Expected Output:
```
╔═══════════════════════════════════════════════════════════╗
║                    🔱 RUDRA.0x ONLINE 🔱                  ║
║         Beyond Limitations. Beyond Boundaries.           ║
╚═══════════════════════════════════════════════════════════╝

⚙️  SYSTEM INITIALIZATION:
   📌 Bot Name: RUDRA.0x
   🆔 Client ID: 123456...
   🌍 Servers: 1
   👥 Total Users: 100
   📦 Database Type: GITHUB_JSON

✅ Systems Online
✅ Status Rotator (24/7)
✅ Ready for Commands!
```

---

## 🔧 ADDING NEW COMMANDS

### Method 1: Using Template
```bash
# Copy the template
cp COMMAND_TEMPLATE.ts src/commands/mymodule/mycommand.ts

# Edit the file and change:
# - name: "mycommand"
# - description: "My command description"
# - module: "mymodule"
# - category: "fun|utility|admin|etc"
```

### Method 2: Manual Creation
```typescript
// src/commands/economy/daily.ts
import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const dailyCommand: Command = {
  name: "daily",
  description: "Claim your daily 1000 coins",
  category: "economy",
  module: "economy",
  cooldown: 86400000, // 24 hours
  
  async execute(interaction: ChatInputCommandInteraction) {
    const db = (global as any).db;
    const user = await db.getUser(interaction.user.id);
    
    if (!user) {
      // Create new user
      user = {
        userId: interaction.user.id,
        username: interaction.user.username,
        // ... initialize all fields
      };
    }
    
    user.balance += 1000;
    await db.setUser(interaction.user.id, user);
    
    return interaction.reply("✅ Claimed 1000 coins!");
  }
};

export default dailyCommand;
```

### Bot Auto-Loads Command
The command handler automatically discovers and loads your command:
1. Reads from `src/commands/`
2. Recursively searches subdirectories
3. Loads `.ts` files (in dev) or `.js` (in production)
4. Registers with Discord slash commands

---

## 🗄️ DATABASE USAGE

### Get User Data
```typescript
const db = (global as any).db;
const user = await db.getUser("user_id_here");

if (user) {
  console.log(user.balance);      // Get balance
  console.log(user.level);        // Get level
  console.log(user.isVIP);        // Check VIP status
}
```

### Update User Data
```typescript
const user = await db.getUser(userId);
user.balance += 100;
user.xp += 50;
user.level = Math.floor(user.xp / 100);

await db.setUser(userId, user);
```

### Get All Users (Admin Operations)
```typescript
const allUsers = await db.getAllUsers();
const topUsers = allUsers
  .sort((a, b) => b.balance - a.balance)
  .slice(0, 10);
```

### Works with Both Database Types
```env
# Switch database type by changing ONE line:
DB_TYPE=GITHUB_JSON  # Uses local JSON files
# OR
DB_TYPE=SQLITE      # Uses SQLite database

# NO CODE CHANGES NEEDED - abstraction layer handles it!
```

---

## 🛡️ SECURITY FEATURES

### 1. Owner-Only Commands
```typescript
if (interaction.user.id !== process.env.ASHU_ID) {
  return interaction.reply("❌ Owner only!");
}
```

### 2. Permission Checking
```typescript
const command = commandHandler.getCommand("ban");
if (!commandHandler.hasPermission(userId, command)) {
  return; // Access denied
}
```

### 3. Input Validation
```typescript
import Validators from "./utils/validators";

const coins = interaction.options.getInteger("amount");
if (!Validators.isValidCoins(coins)) {
  return interaction.reply("Invalid amount");
}

const email = interaction.options.getString("email");
if (!Validators.isValidEmail(email)) {
  return interaction.reply("Invalid email");
}
```

### 4. Safe String Checking
```typescript
const input = interaction.options.getString("text");
if (!Validators.isSafeString(input)) {
  return interaction.reply("❌ String contains unsafe characters");
}
```

---

## 📡 STATUS ROTATOR (18 Statuses)

The bot changes its Discord status every 10 minutes based on conditions:

### Priority Statuses (Checked First)
- **Owner Active**: "⚠️  SERVER UNDER ASHU CONTROL PROTOCOL 🔱" (when Ashu in VC)
- **Developer Active**: "🛠️ THE VC UNDER DEVELOPER ZORO ⚔️" (when Zoro in VC)
- **Locked**: "🛡️ SECURITY PROTOCOL: ENCRYPTED & LOCKED" (during raid)
- **Stealth**: "🕵️ STEALTH MODE: GHOST MONITORING ACTIVE" (silent monitoring)

### Regular Rotation (15 Statuses)
- Ruling the Discord Matrix, One Command at a Time.
- 1,300+ God-Mode Commands
- PREFIX: [/] | PLAY MUSIC & ENJOY!
- ASK ME ANYTHING | AI CHAT ACTIVE
- ... and 11 more

### Customize Status Rotation
Edit `src/utils/statusRotator.ts`:
```typescript
private statuses: StatusOption[] = [
  {
    text: "Your custom status",
    type: ActivityType.Playing,
  },
];
```

---

## 🆘 TROUBLESHOOTING

### Bot Not Responding
```bash
# 1. Check token
echo $BOT_TOKEN

# 2. Check bot is running
npm run dev

# 3. Check guild ID is correct
# Invite bot to server with Admin permissions
```

### Commands Not Loading
```bash
# 1. Verify folder structure
src/commands/module_name/command.ts

# 2. Check command has export default
export default commandObject;

# 3. Restart bot after adding commands
```

### Database Errors
```bash
# For SQLite:
# Delete existing database to reinitialize
rm src/database/rudra_main.sqlite

# Restart bot - sqlite will recreate with schema
npm run dev
```

### Permission Issues
```bash
# Ensure bot has higher role than target user
# Ensure bot has required permissions:
# - Administrator (recommended)
# - Or specific permissions per category
```

---

## 📈 GOING TO PRODUCTION

### 1. Build Project
```bash
npm run build
```

### 2. Set Environment to Production
```env
NODE_ENV=production
```

### 3. Optimize Database
```env
# Use SQLite for production (faster)
DB_TYPE=SQLITE
DATABASE_PATH=/var/lib/rudra/rudra_main.sqlite
```

### 4. Deploy with PM2
```bash
npm install -g pm2
pm2 start dist/index.js --name rudra
pm2 startup
pm2 save
```

### 5. Enable Auto-Restart
```bash
pm2 monit  # Monitor the bot
```

---

## 🎓 LEARNING RESOURCES

### Included Documentation
- **README.md** - Getting started guide
- **COMMAND_TEMPLATE.ts** - Copy-paste command template
- **ARCHITECTURE.md** - Deep system design
- **types/index.ts** - All TypeScript interfaces

### External Resources
- [Discord.js v14 Docs](https://discord.js.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://nodejs.org/en/docs/)

---

## 💡 TIPS & TRICKS

### 1. Use Logger Everywhere
```typescript
import Logger from "../utils/logger";

Logger.success("Operation completed");
Logger.error("Something went wrong", error);
Logger.warn("This might fail");
Logger.security("Suspicious activity detected");
```

### 2. Use Helpers for Common Tasks
```typescript
import { formatCoins, formatDuration, getRandomInt } from "../utils/helpers";

const reward = getRandomInt(100, 1000);
console.log(`Reward: ${formatCoins(reward)}`);
console.log(`Duration: ${formatDuration(86400000)}`); // Shows "1d"
```

### 3. Chunk Large Arrays
```typescript
import { chunkArray } from "../utils/helpers";

const users = await db.getAllUsers();
const pages = chunkArray(users, 25);  // Split into pages

// Use pagination in embeds
```

### 4. Use Validators for Security
```typescript
import Validators from "../utils/validators";

const link = interaction.options.getString("url");
if (!Validators.isValidUrl(link)) {
  return interaction.reply("Invalid URL");
}
```

---

## 🚀 CI/CD SETUP (GitHub Actions)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Bot

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - run: npm run lint
      # Add deployment steps here
```

---

## 📞 SUPPORT

For issues or questions:
1. Check the troubleshooting section
2. Read the inline code comments
3. Review Discord.js documentation
4. Check GitHub issues

---

**🔱 RUDRA.0x: The Supreme Digital Entity 🔱**

*Beyond Limitations. Beyond Boundaries.*

---

Last Updated: March 29, 2026  
Version: 1.0.0  
Node.js: 20.0.0+  
Discord.js: v14.14.0+
