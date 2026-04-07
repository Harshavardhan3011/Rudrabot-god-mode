// 🔱 RUDRA.0x Event Handler
// Loads and manages Discord events

import { Client } from "discord.js";
import fs from "fs";
import path from "path";
import { EventHandler } from "../types";

class EventHandlerClass {
  private client: Client;
  private events: EventHandler[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Load all events from src/events directory
   * Expected structure:
   * src/events/
   *   ├── ready.ts
   *   ├── interactionCreate.ts
   *   ├── messageCreate.ts
   *   └── ...
   */
  async loadEvents(): Promise<void> {
    const eventsPath = path.join(process.cwd(), "src/events");

    if (!fs.existsSync(eventsPath)) {
      console.warn("⚠️ Events directory not found. Creating events directory...");
      fs.mkdirSync(eventsPath, { recursive: true });
      return;
    }

    const files = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".ts"));

    for (const file of files) {
      try {
        const filePath = path.join(eventsPath, file);
        const event: EventHandler = require(filePath).default || require(filePath);

        if (!event.name) {
          console.warn(`⚠️ Skipping ${file} - missing event name`);
          continue;
        }

        this.events.push(event);

        // Register event listener
        if (event.once) {
          this.client.once(event.name, (...args) => event.execute(...args));
        } else {
          this.client.on(event.name, (...args) => event.execute(...args));
        }

        console.log(`✅ Loaded event: ${event.name}${event.once ? " (once)" : ""}`);
      } catch (error) {
        console.error(`❌ Error loading event ${file}:`, error);
      }
    }

    console.log(`📊 Total events loaded: ${this.events.length}`);
  }

  /**
   * Get all loaded events
   */
  getEvents(): EventHandler[] {
    return this.events;
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }
}

export default EventHandlerClass;
