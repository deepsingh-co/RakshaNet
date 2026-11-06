/**
 * AEGIS WebSocket client — STOMP over SockJS.
 *
 * Subscriptions:
 *   /topic/sos/new         → broadcast new SOS alerts to admin dash
 *   /topic/sos/resolved    → broadcast resolved alerts
 *   /topic/location/{uid}  → live GPS updates for a user
 *   /user/queue/notifications → personal push notifications
 */
import { tokenStore } from "./client";
type Client = any;
type IMessage = any;
type StompHeaders = Record<string, string>;

type Listener<T = any> = (payload: T) => void;

class AegisSocket {
  private client: Client | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private connected = false;

  async connect() {
    const wsUrl = (import.meta.env.VITE_WS_URL as string) || "";
    if (!wsUrl) return; // demo mode, no backend

    // Lazy-load the heavy STOMP + SockJS libs so they don't bloat the initial bundle
    const [{ Client }, SockJSModule] = await Promise.all([
      import("@stomp/stompjs"),
      import("sockjs-client"),
    ]);
    const SockJS = SockJSModule.default || SockJSModule;

    const t = tokenStore.get();
    const connectHeaders: StompHeaders = t ? { Authorization: `Bearer ${t}` } : {};
    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl) as WebSocket,
      connectHeaders,
      reconnectDelay: 5_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onStompError: (f) => console.error("[WS] STOMP error", f.headers["message"]),
      onWebSocketClose: () => { this.connected = false; console.warn("[WS] closed"); },
      onConnect: () => {
        this.connected = true;
        console.info("[WS] connected");
        // Resubscribe listeners
        this.listeners.forEach((set, dest) => {
          set.forEach((fn) => this._subscribeRaw(dest, fn));
        });
      },
    });
    this.client.activate();
  }

  disconnect() {
    this.client?.deactivate();
    this.client = null;
    this.connected = false;
  }

  subscribe<T = any>(destination: string, fn: Listener<T>) {
    if (!this.listeners.has(destination)) this.listeners.set(destination, new Set());
    this.listeners.get(destination)!.add(fn as Listener);
    if (this.connected) this._subscribeRaw(destination, fn as Listener);
    return () => {
      this.listeners.get(destination)?.delete(fn as Listener);
    };
  }

  private _subscribeRaw(destination: string, fn: Listener) {
    this.client?.subscribe(destination, (msg: IMessage) => {
      try {
        fn(JSON.parse(msg.body));
      } catch {
        fn(msg.body);
      }
    });
  }

  isOnline() { return this.connected; }
}

export const socket = new AegisSocket();
