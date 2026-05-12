import type { UniFiIntegration } from "@prisma/client";

export type NetworkSite = {
  id: string;
  name: string;
  raw?: unknown;
};

export type NetworkClient = {
  clientId: string;
  macAddress: string;
  ssid?: string | null;
  apMac?: string | null;
  isGuest: boolean;
  authorized: boolean;
  raw?: unknown;
};

export type AuthorizeGuestOptions = {
  timeLimitMinutes: number;
  dataUsageLimitMBytes?: number;
  rxRateLimitKbps?: number;
  txRateLimitKbps?: number;
};

export type NetworkActionContext = {
  shopId: string;
  deviceId?: string | null;
  grantId?: string | null;
};

export interface NetworkProvider {
  testConnection(integration: UniFiIntegration): Promise<{ ok: boolean; sites: NetworkSite[]; error?: string }>;
  listSites(integration: UniFiIntegration): Promise<NetworkSite[]>;
  findClientByMac(integration: UniFiIntegration, macAddress: string): Promise<NetworkClient | null>;
  authorizeGuest(
    integration: UniFiIntegration,
    clientId: string,
    options: AuthorizeGuestOptions,
    context?: NetworkActionContext,
  ): Promise<{ ok: boolean; response: unknown; error?: string }>;
  getClient(integration: UniFiIntegration, clientId: string): Promise<NetworkClient | null>;
  listClients(integration: UniFiIntegration): Promise<NetworkClient[]>;
}
