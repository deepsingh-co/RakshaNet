import { api } from "./client";

export interface StartJourneyRequest {
  sourceLat: number;
  sourceLng: number;
  destinationLat: number;
  destinationLng: number;
  sourceLabel?: string;
  destinationLabel?: string;
  expectedDurationMinutes: number;
}

export interface HeartbeatPoint {
  latitude: number;
  longitude: number;
  timestampEpochMs: number;
  speed?: number;
  battery?: number;
}

export type JourneyStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "ESCALATED"
  | "AUTO_ESCALATION_PENDING"
  | "CONNECTION_LOST"
  | "DEVICE_UNAVAILABLE"
  | "SOS";

export interface JourneyResponse {
  id: string;
  status: JourneyStatus;
  sourceLat: number;
  sourceLng: number;
  destinationLat: number;
  destinationLng: number;
  sourceLabel?: string;
  destinationLabel?: string;
  startTime: string;
  expectedArrivalTime: string;
  expectedDurationMin: number;
  lastKnownLat?: number;
  lastKnownLng?: number;
  distanceToDestM?: number;
  missedCheckpoints: number;
  escalationLevel?: number;
}

export const journeyApi = {
  async startJourney(input: StartJourneyRequest): Promise<JourneyResponse> {
    const { data } = await api.post<JourneyResponse>("/api/v1/journey/start", input);
    return data;
  },
  async getJourney(journeyId: string): Promise<JourneyResponse> {
    const { data } = await api.get<JourneyResponse>(`/api/v1/journey/${journeyId}`);
    return data;
  },
  async sendHeartbeat(journeyId: string, latitude: number, longitude: number, battery?: number): Promise<void> {
    await api.post(`/api/v1/journey/${journeyId}/heartbeat`, { latitude, longitude, battery }, { timeout: 8_000 });
  },
  async bulkHeartbeat(journeyId: string, points: HeartbeatPoint[]): Promise<{ accepted: number; total: number }> {
    const { data } = await api.post<{ accepted: number; total: number }>(
      `/api/v1/journey/${journeyId}/heartbeat/bulk`,
      { points }
    );
    return data;
  },
  async confirmArrival(journeyId: string): Promise<void> {
    await api.post(`/api/v1/journey/${journeyId}/confirm-arrival`, {}, { timeout: 20_000 });
  },
  async cancelJourney(journeyId: string): Promise<void> {
    await api.post(`/api/v1/journey/${journeyId}/cancel`);
  },
  async acknowledgeEscalation(escalationId: string, guardianId: string, ackType: string): Promise<void> {
    await api.post(`/api/v1/journey/escalation/${escalationId}/ack`, { guardianId, ackType });
  },
};
