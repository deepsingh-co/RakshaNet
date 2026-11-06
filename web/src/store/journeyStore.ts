import { create } from "zustand";
import { journeyApi, JourneyResponse, HeartbeatPoint, JourneyStatus } from "../api/journeyApi";

// Offline location buffer stored in localStorage
const OFFLINE_BUFFER_KEY = "aegis_offline_buffer";
const JOURNEY_ID_KEY = "aegis_journey_id";
const JOURNEY_DATA_KEY = "aegis_current_journey";

function loadOfflineBuffer(): HeartbeatPoint[] {
  try {
    const raw = localStorage.getItem(OFFLINE_BUFFER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineBuffer(points: HeartbeatPoint[]) {
  try {
    localStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(points));
  } catch { /* ignore quota errors */ }
}

interface JourneyState {
  // Core journey data
  currentJourney: JourneyResponse | null;
  journeyId: string | null;
  journeyStatus: JourneyStatus | null;
  missedCheckpoints: number;
  escalationLevel: number;
  isJourneyActive: boolean;

  // Real-time tracking
  lastHeartbeatTime: string | null;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  heartbeatSent: boolean; // pulse animation trigger

  // Offline sync
  offlineBuffer: HeartbeatPoint[];
  isSyncing: boolean;
  lastSyncResult: { accepted: number; total: number } | null;
  isOnline: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Completion tracking (kept in memory after confirm-arrival)
  completedJourney: JourneyResponse | null;

  // Actions
  startJourney: (input: {
    sourceLat: number;
    sourceLng: number;
    destinationLat: number;
    destinationLng: number;
    sourceLabel?: string;
    destinationLabel?: string;
    expectedDurationMinutes: number;
  }) => Promise<void>;
  loadJourney: (id: string) => Promise<void>;
  sendHeartbeat: (lat: number, lng: number, battery?: number) => Promise<void>;
  bufferOfflinePoint: (lat: number, lng: number, battery?: number) => void;
  syncOfflineBuffer: () => Promise<void>;
  confirmArrival: () => Promise<void>;
  cancelJourney: () => Promise<void>;
  setOnline: (online: boolean) => void;
  clearError: () => void;
  clearCompletedJourney: () => void;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  currentJourney: (() => {
    try {
      const stored = localStorage.getItem(JOURNEY_DATA_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })(),
  journeyId: localStorage.getItem(JOURNEY_ID_KEY),
  journeyStatus: localStorage.getItem("aegis_journey_status") as JourneyStatus | null || null,
  missedCheckpoints: Number(localStorage.getItem("aegis_missed_checkpoints") || 0),
  escalationLevel: Number(localStorage.getItem("aegis_escalation_level") || 0),
  isJourneyActive: localStorage.getItem("aegis_is_journey_active") === "true",
  lastHeartbeatTime: localStorage.getItem("aegis_last_heartbeat") || null,
  lastKnownLat: null,
  lastKnownLng: null,
  heartbeatSent: false,
  offlineBuffer: loadOfflineBuffer(),
  isSyncing: false,
  lastSyncResult: null,
  isOnline: navigator.onLine,
  isLoading: false,
  error: null,
  completedJourney: null,

  startJourney: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const data = await journeyApi.startJourney(input);
      const now = new Date().toISOString();
      localStorage.setItem(JOURNEY_DATA_KEY, JSON.stringify(data));
      localStorage.setItem(JOURNEY_ID_KEY, data.id);
      localStorage.setItem("aegis_journey_status", data.status);
      localStorage.setItem("aegis_missed_checkpoints", String(data.missedCheckpoints ?? 0));
      localStorage.setItem("aegis_escalation_level", String(data.escalationLevel ?? 0));
      localStorage.setItem("aegis_is_journey_active", "true");
      localStorage.setItem("aegis_last_heartbeat", now);
      set({
        currentJourney: data,
        journeyId: data.id,
        journeyStatus: data.status,
        missedCheckpoints: data.missedCheckpoints ?? 0,
        escalationLevel: data.escalationLevel ?? 0,
        isJourneyActive: true,
        lastHeartbeatTime: now,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || "Failed to start journey" });
      throw error;
    }
  },

  loadJourney: async (id) => {
    try {
      const data = await journeyApi.getJourney(id);
      // A journey is "active" (still ongoing) for all non-terminal statuses
      const TERMINAL_STATUSES: JourneyStatus[] = ["COMPLETED", "CANCELLED"];
      const isActive = !TERMINAL_STATUSES.includes(data.status as JourneyStatus);
      localStorage.setItem(JOURNEY_DATA_KEY, JSON.stringify(data));
      localStorage.setItem(JOURNEY_ID_KEY, data.id);
      localStorage.setItem("aegis_journey_status", data.status);
      localStorage.setItem("aegis_missed_checkpoints", String(data.missedCheckpoints ?? 0));
      localStorage.setItem("aegis_escalation_level", String(data.escalationLevel ?? 0));
      localStorage.setItem("aegis_is_journey_active", String(isActive));
      set({
        currentJourney: data,
        journeyId: data.id,
        journeyStatus: data.status,
        missedCheckpoints: data.missedCheckpoints ?? 0,
        escalationLevel: data.escalationLevel ?? 0,
        isJourneyActive: isActive,
        lastKnownLat: data.lastKnownLat ?? null,
        lastKnownLng: data.lastKnownLng ?? null,
      });
      // If journey completed/cancelled server-side, clear active state
      if (!isActive && (data.status === "COMPLETED" || data.status === "CANCELLED")) {
        localStorage.setItem("aegis_is_journey_active", "false");
      }
    } catch (error) {
      console.error("[journeyStore] Failed to load journey:", error);
    }
  },

  sendHeartbeat: async (lat, lng, battery) => {
    const { journeyId, offlineBuffer } = get();
    if (!journeyId) return;

    const now = new Date().toISOString();
    const point: HeartbeatPoint = {
      latitude: lat,
      longitude: lng,
      timestampEpochMs: Date.now(),
      battery,
    };

    if (!navigator.onLine) {
      // Buffer the point for later sync
      const newBuffer = [...offlineBuffer, point];
      saveOfflineBuffer(newBuffer);
      set({ offlineBuffer: newBuffer, lastKnownLat: lat, lastKnownLng: lng });
      return;
    }

    try {
      await journeyApi.sendHeartbeat(journeyId, lat, lng, battery);
      localStorage.setItem("aegis_last_heartbeat", now);
      set({
        lastHeartbeatTime: now,
        lastKnownLat: lat,
        lastKnownLng: lng,
        heartbeatSent: true,
      });
      // Reset pulse animation after 1s
      setTimeout(() => set({ heartbeatSent: false }), 1000);
      // Refresh journey state after heartbeat
      await get().loadJourney(journeyId);
    } catch (error) {
      // If network error, buffer it
      const newBuffer = [...get().offlineBuffer, point];
      saveOfflineBuffer(newBuffer);
      set({ offlineBuffer: newBuffer });
      console.warn("[journeyStore] Heartbeat failed, buffered locally");
    }
  },

  bufferOfflinePoint: (lat, lng, battery) => {
    const point: HeartbeatPoint = {
      latitude: lat,
      longitude: lng,
      timestampEpochMs: Date.now(),
      battery,
    };
    const newBuffer = [...get().offlineBuffer, point];
    saveOfflineBuffer(newBuffer);
    set({ offlineBuffer: newBuffer, lastKnownLat: lat, lastKnownLng: lng });
  },

  syncOfflineBuffer: async () => {
    const { journeyId, offlineBuffer, isSyncing } = get();
    if (!journeyId || offlineBuffer.length === 0 || isSyncing) return;

    set({ isSyncing: true });
    try {
      // Sort by timestamp before syncing
      const sorted = [...offlineBuffer].sort((a, b) => a.timestampEpochMs - b.timestampEpochMs);
      const result = await journeyApi.bulkHeartbeat(journeyId, sorted);
      const now = new Date().toISOString();
      localStorage.setItem("aegis_last_heartbeat", now);
      saveOfflineBuffer([]);
      set({
        offlineBuffer: [],
        isSyncing: false,
        lastSyncResult: result,
        lastHeartbeatTime: now,
      });
      // Refresh journey state after sync
      await get().loadJourney(journeyId);
    } catch (error) {
      set({ isSyncing: false });
      console.error("[journeyStore] Bulk sync failed:", error);
    }
  },

  confirmArrival: async () => {
    const { journeyId, currentJourney } = get();
    if (!journeyId) return;
    set({ isLoading: true, error: null });
    try {
      await journeyApi.confirmArrival(journeyId);
      // Only clear localStorage AFTER successful API call
      localStorage.setItem("aegis_journey_status", "COMPLETED");
      localStorage.setItem("aegis_is_journey_active", "false");
      localStorage.removeItem(JOURNEY_ID_KEY);
      localStorage.removeItem(JOURNEY_DATA_KEY);
      saveOfflineBuffer([]);
      set({
        completedJourney: currentJourney,
        currentJourney: null,
        journeyId: null,
        journeyStatus: "COMPLETED",
        missedCheckpoints: 0,
        escalationLevel: 0,
        isJourneyActive: false,
        offlineBuffer: [],
        isLoading: false,
      });
    } catch (error: any) {
      console.error("[journeyStore] confirmArrival failed:", error);
      set({ isLoading: false, error: error?.response?.data?.message || "Failed to confirm arrival. Please try again." });
    }
  },

  cancelJourney: async () => {
    const { journeyId } = get();
    if (!journeyId) return;
    set({ isLoading: true });
    try {
      await journeyApi.cancelJourney(journeyId);
      localStorage.setItem("aegis_journey_status", "CANCELLED");
      localStorage.setItem("aegis_is_journey_active", "false");
      localStorage.removeItem(JOURNEY_ID_KEY);
      localStorage.removeItem(JOURNEY_DATA_KEY);
      saveOfflineBuffer([]);
      set({
        currentJourney: null,
        journeyId: null,
        journeyStatus: "CANCELLED",
        missedCheckpoints: 0,
        escalationLevel: 0,
        isJourneyActive: false,
        offlineBuffer: [],
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: "Failed to cancel journey" });
    }
  },

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) {
      // Auto-sync when back online
      setTimeout(() => get().syncOfflineBuffer(), 1000);
    }
  },

  clearError: () => set({ error: null }),
  clearCompletedJourney: () => set({ completedJourney: null, journeyStatus: null }),
}));
