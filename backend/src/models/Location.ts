import mongoose, { Schema, model, type Model, type InferSchemaType, type Types } from 'mongoose';
import { LOCATION_SOURCES } from './Incident.js';

/**
 * Immutable location pings tied to an incident. The device generates
 * `clientLocationId` so retries after an offline period never duplicate
 * points. `capturedAt` is device time; `receivedAt` is server time, which
 * makes offline upload delay visible and auditable.
 */
const locationSchema = new Schema(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    clientLocationId: { type: String, required: true, maxlength: 120 },

    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    accuracyMeters: { type: Number, default: null, min: 0 },
    speedMps: { type: Number, default: null, min: 0 },
    headingDeg: { type: Number, default: null, min: 0, max: 360 },
    batteryLevel: { type: Number, default: null, min: 0, max: 100 },

    source: { type: String, enum: LOCATION_SOURCES, default: 'GPS' },
    capturedAt: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now },

    /** True when the point arrived too late to be treated as live. */
    isStale: { type: Boolean, default: false, index: true },
    /** Device was offline when the point was captured. */
    offlineCaptured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

locationSchema.index({ incidentId: 1, clientLocationId: 1 }, { unique: true });
locationSchema.index({ incidentId: 1, capturedAt: -1 });

export type LocationDoc = InferSchemaType<typeof locationSchema> & { _id: Types.ObjectId };
export const Location =
  (mongoose.models.Location as Model<InferSchemaType<typeof locationSchema>>) ??
  model('Location', locationSchema);
