import fs from "fs";
import path from "path";

export interface GatewayGuildConfig {
  autoroleRoleIds: string[];
  verifyRoleId?: string;
  verifyChannelId?: string;
  verifyMessageId?: string;
  wormholeChannelId?: string;
  wormholeWebhookUrl?: string;
}

export interface MusicTrack {
  title: string;
  query: string;
  requestedBy: string;
  requestedAt: number;
}

export interface MusicGuildState {
  nowPlaying: MusicTrack | null;
  queue: MusicTrack[];
}

interface RuntimeConfig {
  gateway: Record<string, GatewayGuildConfig>;
  music: Record<string, MusicGuildState>;
}

class RuntimeConfigStore {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), "data", "runtime-config.json");
    this.ensureStore();
  }

  private ensureStore(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      const defaults: RuntimeConfig = { gateway: {}, music: {} };
      fs.writeFileSync(this.filePath, JSON.stringify(defaults, null, 2), "utf8");
    }
  }

  private readStore(): RuntimeConfig {
    this.ensureStore();
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
      return {
        gateway: parsed.gateway || {},
        music: parsed.music || {},
      };
    } catch {
      return { gateway: {}, music: {} };
    }
  }

  private writeStore(store: RuntimeConfig): void {
    fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), "utf8");
  }

  getGatewayConfig(guildId: string): GatewayGuildConfig {
    const store = this.readStore();
    return (
      store.gateway[guildId] || {
        autoroleRoleIds: [],
      }
    );
  }

  setGatewayConfig(guildId: string, config: GatewayGuildConfig): void {
    const store = this.readStore();
    store.gateway[guildId] = config;
    this.writeStore(store);
  }

  getMusicState(guildId: string): MusicGuildState {
    const store = this.readStore();
    return (
      store.music[guildId] || {
        nowPlaying: null,
        queue: [],
      }
    );
  }

  setMusicState(guildId: string, state: MusicGuildState): void {
    const store = this.readStore();
    store.music[guildId] = state;
    this.writeStore(store);
  }
}

const runtimeConfigStore = new RuntimeConfigStore();
export default runtimeConfigStore;
