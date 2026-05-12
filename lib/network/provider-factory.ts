import { networkProviderMode } from "@/lib/env";
import { MockNetworkProvider } from "./mock-provider";
import type { NetworkProvider } from "./types";
import { UniFiProvider } from "./unifi-provider";

let provider: NetworkProvider | null = null;

export function getNetworkProvider() {
  if (!provider) {
    provider = networkProviderMode() === "unifi" ? new UniFiProvider() : new MockNetworkProvider();
  }

  return provider;
}

export function setNetworkProviderForTests(nextProvider: NetworkProvider | null) {
  provider = nextProvider;
}
