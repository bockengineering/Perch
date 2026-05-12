import { NetworkActionStatus, NetworkProviderType, type UniFiIntegration } from "@prisma/client";
import { normalizeMac } from "@/lib/crypto/mac";
import { logNetworkAction } from "@/lib/services/network-log";
import type { AuthorizeGuestOptions, NetworkActionContext, NetworkClient, NetworkProvider } from "./types";

function defaultClients(): NetworkClient[] {
  return [
    {
      clientId: "mock-client-AA-BB-CC-DD-EE-FF",
      macAddress: "AA:BB:CC:DD:EE:FF",
      ssid: "DemoGuest",
      apMac: "11:22:33:44:55:66",
      isGuest: true,
      authorized: false,
      raw: { source: "default-mock-client" },
    },
  ];
}

function loadConfiguredClients() {
  const raw = process.env.MOCK_UNIFI_CLIENTS_JSON;
  if (!raw) {
    return defaultClients();
  }

  try {
    return JSON.parse(raw) as NetworkClient[];
  } catch {
    return defaultClients();
  }
}

export class MockNetworkProvider implements NetworkProvider {
  private clients: NetworkClient[];

  constructor(clients = loadConfiguredClients()) {
    this.clients = clients.map((client) => ({
      ...client,
      macAddress: normalizeMac(client.macAddress),
    }));
  }

  async testConnection() {
    return {
      ok: true,
      sites: [{ id: "mock-site", name: "Mock UniFi Site", raw: { provider: "mock" } }],
    };
  }

  async listSites() {
    return [{ id: "mock-site", name: "Mock UniFi Site", raw: { provider: "mock" } }];
  }

  async findClientByMac(_integration: UniFiIntegration, macAddress: string) {
    const normalized = normalizeMac(macAddress);
    return (
      this.clients.find((client) => normalizeMac(client.macAddress) === normalized) ?? {
        clientId: `mock-client-${normalized.replaceAll(":", "-")}`,
        macAddress: normalized,
        ssid: "DemoGuest",
        isGuest: true,
        authorized: false,
        raw: { generated: true },
      }
    );
  }

  async authorizeGuest(
    _integration: UniFiIntegration,
    clientId: string,
    options: AuthorizeGuestOptions,
    context?: NetworkActionContext,
  ) {
    const response = {
      provider: "mock",
      clientId,
      action: "AUTHORIZE_GUEST_ACCESS",
      timeLimitMinutes: options.timeLimitMinutes,
      authorized: true,
    };

    if (context) {
      await logNetworkAction({
        ...context,
        shopId: context.shopId,
        provider: NetworkProviderType.MOCK,
        action: "AUTHORIZE_GUEST_ACCESS",
        requestJson: { clientId, options },
        responseJson: response,
        status: NetworkActionStatus.SUCCESS,
      });
    }

    return { ok: true, response };
  }

  async getClient(_integration: UniFiIntegration, clientId: string) {
    return this.clients.find((client) => client.clientId === clientId) ?? null;
  }

  async listClients() {
    return this.clients;
  }
}
