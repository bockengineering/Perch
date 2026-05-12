import { NetworkActionStatus, NetworkProviderType, type UniFiIntegration } from "@prisma/client";
import { normalizeMac } from "@/lib/crypto/mac";
import { decryptSecret } from "@/lib/crypto/field-encryption";
import { logNetworkAction } from "@/lib/services/network-log";
import type {
  AuthorizeGuestOptions,
  NetworkActionContext,
  NetworkClient,
  NetworkProvider,
  NetworkSite,
} from "./types";

const retryDelays = [500, 1000, 2000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function apiUrl(integration: UniFiIntegration, path: string) {
  return `${integration.apiBaseUrl.replace(/\/$/, "")}${path}`;
}

function authHeaders(integration: UniFiIntegration) {
  return {
    Authorization: `Bearer ${decryptSecret(integration.apiKeyEncrypted)}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function asArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data;
    }
    if (Array.isArray(record.results)) {
      return record.results;
    }
  }

  return [];
}

function siteFromRaw(raw: unknown): NetworkSite {
  const record = raw as Record<string, unknown>;
  return {
    id: String(record.id ?? record.siteId ?? record._id ?? ""),
    name: String(record.name ?? record.description ?? record.id ?? "UniFi Site"),
    raw,
  };
}

function clientFromRaw(raw: unknown): NetworkClient | null {
  const record = raw as Record<string, unknown>;
  const mac = record.macAddress ?? record.mac ?? record.client_mac ?? record.id;
  const id = record.id ?? record.clientId ?? record._id ?? mac;

  if (!mac || !id) {
    return null;
  }

  let normalized: string;
  try {
    normalized = normalizeMac(String(mac));
  } catch {
    return null;
  }

  const guest = Boolean(record.isGuest ?? record.guest ?? record.is_guest ?? record.guestClient);
  const authorized = Boolean(
    record.authorized ??
      record.isAuthorized ??
      record.guestAuthorized ??
      record.authorizedGuest ??
      record.accessAuthorized,
  );

  return {
    clientId: String(id),
    macAddress: normalized,
    ssid: record.ssid ? String(record.ssid) : null,
    apMac: record.apMac ? String(record.apMac) : record.ap_mac ? String(record.ap_mac) : null,
    isGuest: guest,
    authorized,
    raw,
  };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

export class UniFiProvider implements NetworkProvider {
  async testConnection(integration: UniFiIntegration) {
    try {
      const sites = await this.listSites(integration);
      return { ok: true, sites };
    } catch (error) {
      return { ok: false, sites: [], error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async listSites(integration: UniFiIntegration) {
    const response = await fetch(apiUrl(integration, "/v1/sites"), {
      headers: authHeaders(integration),
      cache: "no-store",
    });
    const payload = await readJson(response);

    if (!response.ok) {
      throw new Error(`UniFi sites request failed: ${response.status}`);
    }

    return asArray(payload).map(siteFromRaw).filter((site) => site.id);
  }

  async listClients(integration: UniFiIntegration) {
    const response = await fetch(apiUrl(integration, `/v1/sites/${integration.siteId}/clients`), {
      headers: authHeaders(integration),
      cache: "no-store",
    });
    const payload = await readJson(response);

    if (!response.ok) {
      throw new Error(`UniFi clients request failed: ${response.status}`);
    }

    return asArray(payload)
      .map(clientFromRaw)
      .filter((client): client is NetworkClient => Boolean(client));
  }

  async findClientByMac(integration: UniFiIntegration, macAddress: string) {
    const normalized = normalizeMac(macAddress);

    for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
      const filter = encodeURIComponent(`macAddress.eq('${normalized}')`);
      const response = await fetch(
        apiUrl(integration, `/v1/sites/${integration.siteId}/clients?filter=${filter}`),
        {
          headers: authHeaders(integration),
          cache: "no-store",
        },
      );
      const payload = await readJson(response);

      if (response.ok) {
        const client = asArray(payload)
          .map(clientFromRaw)
          .find((candidate): candidate is NetworkClient => Boolean(candidate));
        if (client) {
          return client;
        }
      }

      if (attempt < retryDelays.length) {
        await sleep(retryDelays[attempt]);
      }
    }

    return null;
  }

  async authorizeGuest(
    integration: UniFiIntegration,
    clientId: string,
    options: AuthorizeGuestOptions,
    context?: NetworkActionContext,
  ) {
    const body = {
      action: "AUTHORIZE_GUEST_ACCESS",
      timeLimitMinutes: options.timeLimitMinutes,
      dataUsageLimitMBytes: options.dataUsageLimitMBytes,
      rxRateLimitKbps: options.rxRateLimitKbps,
      txRateLimitKbps: options.txRateLimitKbps,
    };

    try {
      const response = await fetch(
        apiUrl(integration, `/v1/sites/${integration.siteId}/clients/${clientId}/actions`),
        {
          method: "POST",
          headers: authHeaders(integration),
          body: JSON.stringify(body),
          cache: "no-store",
        },
      );
      const payload = await readJson(response);

      if (context) {
        await logNetworkAction({
          ...context,
          shopId: context.shopId,
          provider: NetworkProviderType.UNIFI,
          action: "AUTHORIZE_GUEST_ACCESS",
          requestJson: { clientId, body },
          responseJson: payload,
          status: response.ok ? NetworkActionStatus.SUCCESS : NetworkActionStatus.FAILED,
          error: response.ok ? undefined : `UniFi authorization failed: ${response.status}`,
        });
      }

      if (!response.ok) {
        return { ok: false, response: payload, error: `UniFi authorization failed: ${response.status}` };
      }

      return { ok: true, response: payload };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown UniFi authorization error";
      if (context) {
        await logNetworkAction({
          ...context,
          shopId: context.shopId,
          provider: NetworkProviderType.UNIFI,
          action: "AUTHORIZE_GUEST_ACCESS",
          requestJson: { clientId, body },
          status: NetworkActionStatus.FAILED,
          error: message,
        });
      }

      return { ok: false, response: null, error: message };
    }
  }

  async getClient(integration: UniFiIntegration, clientId: string) {
    const response = await fetch(apiUrl(integration, `/v1/sites/${integration.siteId}/clients/${clientId}`), {
      headers: authHeaders(integration),
      cache: "no-store",
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return null;
    }

    return clientFromRaw(payload);
  }
}
