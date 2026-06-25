import type { ChannelProvider } from "./types";
import { UazapiProvider } from "./uazapi";
import { MetaProvider } from "./meta";

export interface ChannelConfig {
  provider: "uazapi" | "meta_cloud";
  credentials: Record<string, any>;
  externalId?: string;
}

export function getProvider(config: ChannelConfig): ChannelProvider {
  switch (config.provider) {
    case "uazapi": return new UazapiProvider(config.credentials, config.externalId);
    case "meta_cloud": return new MetaProvider(config.credentials);
    default: throw new Error("Provider not supported");
  }
}

export * from "./types";
