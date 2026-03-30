// 🔱 RUDRA.0x Bot Ready Event

import { EventHandler } from "../types";

const readyEvent: EventHandler = {
  name: "ready",
  once: true,
  execute(client: any) {
    console.log(`✅ Bot is ready and logged in as ${client?.user?.tag}`);
  },
};

export default readyEvent;
