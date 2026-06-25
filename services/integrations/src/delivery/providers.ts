// DeliveryProvider abstraction for logistics integrations

export interface DispatchParams {
  orderId: string;
  pickupAddress: any;
  deliveryAddress: any;
  items: { name: string; quantity: number }[];
  scheduledFor?: string;
}

export interface DeliveryStatus {
  status: "pending" | "accepted" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  driverName?: string;
  driverPhone?: string;
  estimatedMinutes?: number;
  trackingUrl?: string;
}

export interface DeliveryProvider {
  dispatch(params: DispatchParams): Promise<{ externalId: string; trackingUrl?: string }>;
  getStatus(externalId: string): Promise<DeliveryStatus>;
  cancel(externalId: string): Promise<boolean>;
}

// ── Foody Delivery ──
export class FoodyProvider implements DeliveryProvider {
  constructor(private token: string, private baseUrl = "https://api.foodydelivery.com") {}

  async dispatch(params: DispatchParams) {
    const res = await fetch(`${this.baseUrl}/v1/deliveries`, {
      method: "POST", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pickup: params.pickupAddress, dropoff: params.deliveryAddress, items: params.items, external_id: params.orderId }),
    });
    const data = await res.json();
    return { externalId: data.id, trackingUrl: data.tracking_url };
  }

  async getStatus(externalId: string) {
    const res = await fetch(`${this.baseUrl}/v1/deliveries/${externalId}`, { headers: { Authorization: `Bearer ${this.token}` } });
    const data = await res.json();
    const statusMap: Record<string, DeliveryStatus["status"]> = { created: "pending", accepted: "accepted", picked_up: "picked_up", in_transit: "in_transit", delivered: "delivered", cancelled: "cancelled" };
    return { status: statusMap[data.status] || "pending", driverName: data.driver?.name, driverPhone: data.driver?.phone, estimatedMinutes: data.eta_minutes, trackingUrl: data.tracking_url };
  }

  async cancel(externalId: string) {
    const res = await fetch(`${this.baseUrl}/v1/deliveries/${externalId}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${this.token}` } });
    return res.ok;
  }
}

// ── Pick N Go ──
export class PickNGoProvider implements DeliveryProvider {
  constructor(private apiKey: string, private baseUrl = "https://api.pickngo.com.br") {}

  async dispatch(params: DispatchParams) {
    const res = await fetch(`${this.baseUrl}/orders`, {
      method: "POST", headers: { "X-API-Key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ pickup_address: params.pickupAddress, delivery_address: params.deliveryAddress, reference: params.orderId }),
    });
    const data = await res.json();
    return { externalId: data.order_id, trackingUrl: data.tracking_link };
  }

  async getStatus(externalId: string) {
    const res = await fetch(`${this.baseUrl}/orders/${externalId}`, { headers: { "X-API-Key": this.apiKey } });
    const data = await res.json();
    return { status: data.status as DeliveryStatus["status"], trackingUrl: data.tracking_link, estimatedMinutes: data.eta };
  }

  async cancel(externalId: string) {
    const res = await fetch(`${this.baseUrl}/orders/${externalId}/cancel`, { method: "POST", headers: { "X-API-Key": this.apiKey } });
    return res.ok;
  }
}

// ── Self Delivery (no integration) ──
export class SelfDeliveryProvider implements DeliveryProvider {
  async dispatch(params: DispatchParams) { return { externalId: `self_${params.orderId}` }; }
  async getStatus() { return { status: "in_transit" as const }; }
  async cancel() { return true; }
}

// ── Saipos PDV (push orders to POS) ──
export class SaiposClient {
  constructor(private token: string, private baseUrl = "https://api.saipos.com") {}

  async pushOrder(order: any) {
    const res = await fetch(`${this.baseUrl}/v1/orders`, {
      method: "POST", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    return res.json();
  }

  async getOrderStatus(externalId: string) {
    const res = await fetch(`${this.baseUrl}/v1/orders/${externalId}`, { headers: { Authorization: `Bearer ${this.token}` } });
    return res.json();
  }
}

// Factory
export function getDeliveryProvider(config: { provider: string; credentials: Record<string, any> }): DeliveryProvider {
  switch (config.provider) {
    case "foody": return new FoodyProvider(config.credentials.token);
    case "pickngo": return new PickNGoProvider(config.credentials.api_key);
    default: return new SelfDeliveryProvider();
  }
}
