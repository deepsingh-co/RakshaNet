/**
 * Safety store — extended to push SOS to the backend + subscribe to WS.
 * Keeps Zustand as source-of-truth for UI, but syncs with /api/v1/sos
 * and /topic/sos/* in real time.
 */
import { create } from "zustand";
import { isBackendAvailable, sosApi, incidentApi, type TriggerType } from "../api/endpoints";
import { socket } from "../api/ws";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SOSAlert {
  id: string;
  user: string;
  userId: string;
  avatar: string;
  lat: number;
  lng: number;
  area: string;
  level: RiskLevel;
  confidence: number;
  trigger: string;
  time: string;
  status: "ACTIVE" | "ESCALATED" | "RESOLVED";
  battery: number;
  speed: number;
  heartbeat?: number;
}

export interface CommunityReport {
  id: string;
  area: string;
  type: "Harassment" | "Stalking" | "Poor Lighting" | "Suspicious" | "Crowd";
  severity: 1 | 2 | 3 | 4 | 5;
  time: string;
  votes: number;
  verified: boolean;
  reporter: string;
  lat?: number;
  lng?: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  online: boolean;
  lastSeen: string;
}

interface SafetyState {
  sosActive: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  threatFactors: { label: string; value: number; trend: "up" | "down" | "flat" }[];
  currentLocation: { lat: number; lng: number; area: string };
  battery: number;
  heartbeat: number;
  speed: number;
  activeAlerts: SOSAlert[];
  communityReports: CommunityReport[];
  contacts: EmergencyContact[];
  liveTracking: { path: [number, number][]; eta: number; deviation: boolean };
  notifications: { id: string; kind: "info" | "warn" | "critical"; msg: string; t: number }[];
  triggerSOS: (trigger: string) => Promise<void>;
  resolveSOS: (id: string) => Promise<void>;
  dismissSOS: () => void;
  pushNotification: (kind: "info" | "warn" | "critical", msg: string) => void;
  tick: () => void;
  reportIncident: (r: Omit<CommunityReport, "id" | "votes" | "verified" | "time">) => Promise<void>;
  syncFromBackend: () => Promise<void>;
  fetchIncidents: () => Promise<void>;
  fetchContacts: () => Promise<void>;
  addContact: (name: string, relation: string, phone: string, email?: string) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  startTrackingLocation: () => void;
}

const starting: [number, number] = [28.6139, 77.209];

const triggerMap: Record<string, TriggerType> = {
  "Manual Press": "MANUAL",
  "Voice Trigger • HELP": "VOICE",
  "Shake Detection": "SHAKE",
  "Smartwatch Trigger": "SMARTWATCH",
  "Stealth PIN": "STEALTH_PIN",
  "Volume Pattern": "VOLUME_PATTERN",
  "Panic Emotion AI": "EMOTION_AI",
  "Fall Detection": "FALL_DETECTION",
  "Behavioral AI • Route Deviation": "BEHAVIORAL_AI",
};

export const useSafetyStore = create<SafetyState>((set, get) => ({
  sosActive: false,
  riskScore: 42,
  riskLevel: "MEDIUM",
  confidence: 87,
  threatFactors: [
    { label: "Area crime density", value: 58, trend: "up" },
    { label: "Lighting quality", value: 36, trend: "down" },
    { label: "Crowd behavior", value: 24, trend: "flat" },
    { label: "Time risk (night)", value: 72, trend: "up" },
    { label: "Route deviation", value: 12, trend: "flat" },
    { label: "Community reports", value: 44, trend: "up" },
  ],
  currentLocation: { lat: starting[0], lng: starting[1], area: "Connaught Place, New Delhi" },
  battery: 73,
  heartbeat: 82,
  speed: 2.4,
  activeAlerts: [
    { id: "SOS-4821", user: "Ananya Sharma", userId: "USR-0142", avatar: "AS",
      lat: 28.6203, lng: 77.2107, area: "Paharganj Market", level: "CRITICAL",
      confidence: 94, trigger: "Voice Trigger • HELP", time: "2 min ago",
      status: "ACTIVE", battery: 41, speed: 6.2, heartbeat: 138 },
    { id: "SOS-4819", user: "Meera Iyer", userId: "USR-0098", avatar: "MI",
      lat: 28.6352, lng: 77.2249, area: "Kashmere Gate Metro", level: "HIGH",
      confidence: 81, trigger: "Shake Detection", time: "7 min ago",
      status: "ESCALATED", battery: 28, speed: 1.1, heartbeat: 121 },
    { id: "SOS-4815", user: "Priya Desai", userId: "USR-0321", avatar: "PD",
      lat: 28.5921, lng: 77.2281, area: "Saket District Centre", level: "MEDIUM",
      confidence: 66, trigger: "Behavioral AI • Route Deviation", time: "14 min ago",
      status: "ACTIVE", battery: 64, speed: 3.3, heartbeat: 99 },
  ],
  communityReports: [
    { id: "CR-1", area: "Chandni Chowk North", type: "Stalking", severity: 4, time: "1h ago", votes: 48, verified: true, reporter: "Anonymous" },
    { id: "CR-2", area: "Nehru Place Flyover", type: "Poor Lighting", severity: 3, time: "3h ago", votes: 27, verified: true, reporter: "Verified User" },
    { id: "CR-3", area: "Rohini Sector 7 Park", type: "Suspicious", severity: 3, time: "5h ago", votes: 19, verified: false, reporter: "Anonymous" },
    { id: "CR-4", area: "Lajpat Nagar Metro", type: "Harassment", severity: 5, time: "8h ago", votes: 86, verified: true, reporter: "Verified User" },
    { id: "CR-5", area: "Dwarka Sector 21", type: "Crowd", severity: 2, time: "1d ago", votes: 11, verified: false, reporter: "Anonymous" },
  ],
  contacts: [
    { id: "c1", name: "Rahul Sharma", relation: "Brother", phone: "+91 98XXX 11234", online: true, lastSeen: "now" },
    { id: "c2", name: "Sneha Kapoor", relation: "Best Friend", phone: "+91 98XXX 55678", online: true, lastSeen: "now" },
    { id: "c3", name: "Mom • Sunita", relation: "Mother", phone: "+91 98XXX 90123", online: false, lastSeen: "14m ago" },
    { id: "c4", name: "Delhi Police", relation: "Emergency • 112", phone: "112", online: true, lastSeen: "always" },
  ],
  liveTracking: {
    path: [
      [28.6139, 77.209], [28.6152, 77.2103], [28.6167, 77.2119], [28.618, 77.2134],
      [28.6193, 77.2151], [28.6203, 77.2168], [28.6214, 77.2187],
    ],
    eta: 14,
    deviation: false,
  },
  notifications: [],

  triggerSOS: async (trigger) => {
    const { currentLocation, battery, heartbeat, speed } = get();
    const localAlert: SOSAlert = {
      id: `SOS-${Math.floor(1000 + Math.random() * 9000)}`,
      user: "You", userId: "USR-SELF", avatar: "ME",
      lat: currentLocation.lat, lng: currentLocation.lng, area: currentLocation.area,
      level: "CRITICAL", confidence: 96, trigger, time: "just now",
      status: "ACTIVE", battery, speed, heartbeat,
    };
    set({
      sosActive: true, riskScore: 92, riskLevel: "CRITICAL", confidence: 96,
      activeAlerts: [localAlert, ...get().activeAlerts],
    });
    get().pushNotification("critical", `SOS ACTIVATED via ${trigger} — Guardians & Police notified`);

    const backendAvailable = isBackendAvailable();
    console.log(">>> [FRONTEND] triggerSOS called!", {
      trigger,
      currentLocation,
      isBackendAvailable: backendAvailable,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL
    });

    if (backendAvailable) {
      try {
        console.log(">>> [FRONTEND] Sending SOS trigger payload to backend...");
        const payload = {
          triggerType: triggerMap[trigger] ?? "MANUAL",
          latitude: currentLocation.lat, longitude: currentLocation.lng,
          areaName: currentLocation.area, batteryPct: battery,
          speedMps: speed, heartRate: heartbeat,
        };
        const response = await sosApi.trigger(payload);
        console.log(">>> [FRONTEND] SOS trigger backend SUCCESS:", response);
      } catch (e) {
        console.error(">>> [FRONTEND] SOS trigger backend ERROR:", e);
      }
    } else {
      console.warn(">>> [FRONTEND] Backend is NOT marked available (VITE_API_BASE_URL is not set).");
    }
  },

  resolveSOS: async (id) => {
    set({
      activeAlerts: get().activeAlerts.map((a) => (a.id === id ? { ...a, status: "RESOLVED" } : a)),
    });
    get().pushNotification("info", `Alert ${id} marked resolved`);
    if (isBackendAvailable()) {
      try { await sosApi.resolve(id); } catch (e) { console.warn("[sos] resolve failed", e); }
    }
  },

  dismissSOS: () => {
    set({
      sosActive: false, riskScore: 42, riskLevel: "MEDIUM", confidence: 87,
      activeAlerts: get().activeAlerts.filter((a) => a.userId !== "USR-SELF"),
    });
    get().pushNotification("info", "SOS disarmed • All systems nominal");
  },

  pushNotification: (kind, msg) => {
    const id = Math.random().toString(36).slice(2, 9);
    set({ notifications: [{ id, kind, msg, t: Date.now() }, ...get().notifications].slice(0, 6) });
    setTimeout(() => {
      set({ notifications: get().notifications.filter((n) => n.id !== id) });
    }, 5200);
  },

  tick: () => {
    const { riskScore, liveTracking } = get();
    const drift = (Math.random() - 0.5) * 6;
    const newScore = Math.max(12, Math.min(94, riskScore + drift));
    const level: RiskLevel = newScore >= 80 ? "CRITICAL" : newScore >= 60 ? "HIGH" : newScore >= 35 ? "MEDIUM" : "LOW";
    const last = liveTracking.path[liveTracking.path.length - 1];
    const next: [number, number] = [
      last[0] + (Math.random() - 0.5) * 0.0012,
      last[1] + (Math.random() - 0.5) * 0.0012,
    ];
    set({
      riskScore: Math.round(newScore), riskLevel: level,
      confidence: Math.max(60, Math.min(99, get().confidence + (Math.random() - 0.5) * 3)),
      heartbeat: Math.max(60, Math.min(150, get().heartbeat + (Math.random() - 0.5) * 6)),
      battery: Math.max(5, get().battery - (Math.random() > 0.8 ? 1 : 0)),
      speed: Math.max(0, +(get().speed + (Math.random() - 0.5) * 0.8).toFixed(1)),
      liveTracking: {
        ...liveTracking,
        path: [...liveTracking.path.slice(-12), next],
        eta: Math.max(1, liveTracking.eta + (Math.random() > 0.5 ? -1 : 0)),
      },
    });
  },

  reportIncident: async (r) => {
    const { currentLocation } = get();
    const local: CommunityReport = {
      ...r,
      id: `CR-${Date.now()}`,
      votes: 1,
      verified: false,
      time: "just now",
      lat: currentLocation.lat,
      lng: currentLocation.lng,
    };
    set({ communityReports: [local, ...get().communityReports] });
    get().pushNotification("info", `Community report filed • ${r.area}`);

    if (isBackendAvailable()) {
      try {
        await incidentApi.create({
          areaName: r.area,
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          type: r.type.toUpperCase().replace(" ", "_"),
          severity: r.severity,
          isAnonymous: r.reporter === "Anonymous",
        });
      } catch (e) { console.warn("[incidents] create failed", e); }
    }
  },

  syncFromBackend: async () => {
    if (!isBackendAvailable()) return;
    try {
      get().fetchContacts();
      get().fetchIncidents();
      const alerts = await sosApi.active();
      set({
        activeAlerts: alerts.map((a) => ({
          id: a.id, user: a.userName, userId: a.userId,
          avatar: a.userName.split(" ").map((s) => s[0]).join("").slice(0, 2),
          lat: a.latitude, lng: a.longitude,
          area: a.areaName || "Unknown", level: a.riskLevel,
          confidence: Math.round(a.confidence), trigger: a.triggerType,
          time: new Date(a.createdAt).toLocaleTimeString(),
          status: a.status === "RESOLVED" ? "RESOLVED" : "ACTIVE",
          battery: a.batteryPct ?? 0, speed: a.speedMps ?? 0, heartbeat: a.heartRate,
        })),
      });
    } catch (e) { console.warn("[sync] failed", e); }
  },

  fetchIncidents: async () => {
    if (!isBackendAvailable()) return;
    try {
      const res = await incidentApi.list(0, 50);
      if (res && res.content) {
        const mapped = res.content.map((inc) => ({
          id: inc.id,
          area: inc.areaName,
          type: (inc.type.toLowerCase().replace("_", " ") as any)
            .split(" ")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
          severity: inc.severity as 1 | 2 | 3 | 4 | 5,
          time: new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (" + new Date(inc.createdAt).toLocaleDateString() + ")",
          votes: inc.upvotes,
          verified: inc.verified,
          reporter: inc.isAnonymous ? "Anonymous" : inc.reporterName || "Verified User",
          lat: inc.latitude,
          lng: inc.longitude,
        }));
        
        set({ communityReports: mapped });
      }
    } catch (e) {
      console.warn("[sync incidents] failed", e);
    }
  },

  fetchContacts: async () => {
    if (!isBackendAvailable()) return;
    try {
      const real = await sosApi.getContacts();
      set({
        contacts: real.map((c) => ({
          id: c.id,
          name: c.name,
          relation: c.relation,
          phone: c.phone,
          online: true,
          lastSeen: "active",
        })),
      });
    } catch (e) {
      console.warn("[contacts] fetch failed", e);
    }
  },

  addContact: async (name, relation, phone, email) => {
    const localContact: EmergencyContact = {
      id: `c-${Date.now()}`,
      name, relation, phone, online: true, lastSeen: "now"
    };
    set({ contacts: [...get().contacts, localContact] });
    get().pushNotification("info", `Contact ${name} added locally`);

    if (isBackendAvailable()) {
      try {
        await sosApi.addContact({ name, relation, phone, email, priority: 1 });
        await get().fetchContacts();
      } catch (e) {
        console.warn("[contacts] add failed", e);
      }
    }
  },

  deleteContact: async (id) => {
    set({ contacts: get().contacts.filter((c) => c.id !== id) });
    get().pushNotification("info", `Contact removed`);

    if (isBackendAvailable() && !id.startsWith("c-")) {
      try {
        await sosApi.deleteContact(id);
        await get().fetchContacts();
      } catch (e) {
        console.warn("[contacts] delete failed", e);
      }
    }
  },

  startTrackingLocation: () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      console.warn(">>> [FRONTEND] Geolocation is not supported by this browser.");
      return;
    }
    
    console.log(">>> [FRONTEND] Starting live browser Geolocation watch...");
    
    // Attempt single fast fetch first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log(">>> [FRONTEND] Initial geolocation fetched successfully:", { latitude, longitude });
        set({
          currentLocation: {
            lat: latitude,
            lng: longitude,
            area: `Live Coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          },
        });
      },
      (err) => {
        console.warn(">>> [FRONTEND] Initial getCurrentPosition failed, falling back to watchPosition:", err);
      }
    );

    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log(">>> [FRONTEND] Live Geolocation update received:", { latitude, longitude, accuracy: position.coords.accuracy });
        
        set({
          currentLocation: {
            lat: latitude,
            lng: longitude,
            area: `Live Coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          },
        });
        
        if (isBackendAvailable()) {
          sosApi.pushLocation({ 
            latitude, 
            longitude, 
            accuracy: position.coords.accuracy,
            batteryPct: 100 // dummy
          })
          .then(() => console.log(">>> [FRONTEND] Successfully pushed live location coordinates to backend!"))
          .catch((err) => console.error(">>> [FRONTEND] Failed to push live coordinates to backend:", err));
        }
      },
      (error) => {
        console.error(">>> [FRONTEND] Geolocation watch error occurred:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  },
}));

// Auto-subscribe to backend WebSocket events
if (isBackendAvailable()) {
  socket.connect();
  socket.subscribe<SOSAlert>("/topic/sos/new", (alert) => {
    useSafetyStore.getState().pushNotification("critical", `🚨 New SOS from ${alert.user} at ${alert.area}`);
    useSafetyStore.getState().syncFromBackend();
  });
  socket.subscribe<{ id: string }>("/topic/sos/resolved", () => {
    useSafetyStore.getState().syncFromBackend();
  });
}
