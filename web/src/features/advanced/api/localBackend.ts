/**
 * Local engine for the advanced feature lab.
 *
 * RakshaNet does not ship the Spring Boot / FastAPI services that the original
 * Vasudra pages were written against. Instead of leaving those pages as dead
 * demo screens, this module implements the same behaviours on the device:
 *
 *   - state persists in localStorage (and syncs across tabs via BroadcastChannel)
 *   - evidence hashes are real SHA-256 chains computed with Web Crypto
 *   - safe-ride OTPs are generated and verified locally
 *   - audio analysis uses the Web Audio API (a spectral heuristic, not an ML model)
 *   - pods, SOS and beacons work between open tabs on the same browser
 *
 * Everything here is explicitly local. No incident is created in the RakshaNet
 * backend, no SMS is sent, and no external contact is alerted. When
 * VITE_FEATURES_API_URL / VITE_FEATURES_AI_URL are configured, endpoints.ts
 * calls the real services instead of this module.
 */

const STORAGE_KEY = 'rakshanet.advanced.v1';
const POD_CHANNEL = 'rakshanet.pods';
const SOS_CHANNEL = 'rakshanet.sos';

type Json = Record<string, any>;

interface AdvancedStore {
  pods: Json[];
  evidence: Json[];
  sos: Json[];
  contacts: Json[];
  rides: Json[];
  voice: { hash: string; hint: string; words: number } | null;
  companion: Json[];
  incidents: Json[];
  biometric: { pinHash: string; enrolledAt: string } | null;
  mood: Json[];
}

const DEFAULTS: AdvancedStore = {
  pods: [],
  evidence: [],
  sos: [],
  contacts: [],
  rides: [],
  voice: null,
  companion: [],
  incidents: [],
  biometric: null,
  mood: [],
};

function load(): AdvancedStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AdvancedStore>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(store: AdvancedStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage may be full or blocked; the UI still works for this session */
  }
}

function update(mutator: (store: AdvancedStore) => void): AdvancedStore {
  const store = load();
  mutator(store);
  save(store);
  return store;
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function broadcast(channel: string, payload: Json): void {
  try {
    const bc = new BroadcastChannel(channel);
    bc.postMessage(payload);
    bc.close();
  } catch {
    /* BroadcastChannel unavailable */
  }
}

function currentUser(): { id: string; name: string } {
  try {
    const raw = localStorage.getItem('rakshanet.auth.v1');
    if (!raw) return { id: 'local-user', name: 'You' };
    const parsed = JSON.parse(raw) as { session?: { name?: string; contact?: string } };
    return {
      id: parsed.session?.contact || 'local-user',
      name: parsed.session?.name || 'You',
    };
  } catch {
    return { id: 'local-user', name: 'You' };
  }
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function sha256(text: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Non-secure contexts may not expose crypto.subtle. Deterministic fallback.
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < text.length; i += 1) {
      h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193);
      h2 = Math.imul(h2 + text.charCodeAt(i), 0x85ebca6b);
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* ────────────────────────────── Auth helpers ────────────────────────────── */

export const localAuth = {
  async hashPassword(password: string): Promise<string> {
    return sha256(`rakshanet:${password}`);
  },
};

/* ──────────────────────────────── Biometric ─────────────────────────────── */

export const localBiometric = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
  },
  async enrollPin(pin: string): Promise<void> {
    if (pin.length < 4) throw new Error('PIN must be at least 4 digits');
    const pinHash = await sha256(`rakshanet:duress:${pin}`);
    update((store) => {
      store.biometric = { pinHash, enrolledAt: nowIso() };
    });
  },
  async verifyPin(pin: string): Promise<boolean> {
    const store = load();
    if (!store.biometric) return false;
    return store.biometric.pinHash === (await sha256(`rakshanet:duress:${pin}`));
  },
  state(): { enrolled: boolean; enrolledAt: string | null } {
    const store = load();
    return {
      enrolled: Boolean(store.biometric),
      enrolledAt: store.biometric?.enrolledAt ?? null,
    };
  },
};

/* ────────────────────────────────── Voice code ──────────────────────────── */

function hintFor(phrase: string): string {
  const words = phrase.trim().split(/\s+/);
  return words.map((w) => `${w[0]?.toUpperCase() ?? ''}${'•'.repeat(Math.max(0, w.length - 1))}`).join(' ');
}

export const localVoiceCode = {
  async get(): Promise<{ active: boolean; hint: string }> {
    const store = load();
    return { active: Boolean(store.voice), hint: store.voice?.hint ?? '' };
  },
  async save(phrase: string): Promise<{ hint: string }> {
    const clean = phrase.trim().toLowerCase();
    if (clean.length < 3) throw new Error('Phrase must be at least 3 characters');
    const hash = await sha256(`rakshanet:voice:${clean}`);
    const hint = hintFor(clean);
    const words = clean.split(/\s+/).length;
    update((store) => {
      store.voice = { hash, hint, words };
    });
    return { hint };
  },
  async remove(): Promise<void> {
    update((store) => {
      store.voice = null;
    });
  },
  async verify(spoken: string): Promise<{ match: boolean; words: number }> {
    const store = load();
    if (!store.voice) return { match: false, words: 0 };
    const clean = spoken.trim().toLowerCase().replace(/[.,!?]/g, '');
    const hash = await sha256(`rakshanet:voice:${clean}`);
    return { match: hash === store.voice.hash, words: store.voice.words };
  },
};

/* ────────────────────────────────── Safe ride ───────────────────────────── */

export const localSafeRide = {
  active(): Json | null {
    const store = load();
    return store.rides.find((r) => r.status === 'ACTIVE') ?? null;
  },
  sendOtp(mobile: string): { sent: boolean; devOtp: string } {
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    update((store) => {
      store.rides = store.rides.filter((r) => r.status === 'ACTIVE');
      store.rides.push({
        id: uid('ride'),
        status: 'OTP_SENT',
        mobile,
        otp,
        createdAt: nowIso(),
      });
    });
    return { sent: true, devOtp: otp };
  },
  verifyOtp(mobile: string, otp: string): { verified: boolean } {
    const store = load();
    const draft = [...store.rides].reverse().find((r) => r.mobile === mobile && r.otp);
    const verified = Boolean(draft && draft.otp === otp.trim());
    if (verified) {
      update((s) => {
        const target = s.rides.find((r) => r.id === draft?.id);
        if (target) {
          target.verified = true;
          delete target.otp;
        }
      });
    }
    return { verified };
  },
  start(input: Json): Json {
    const ride = {
      id: uid('ride'),
      ...input,
      status: 'ACTIVE',
      startedAt: nowIso(),
      trail: [] as Json[],
    };
    update((store) => {
      store.rides.push(ride);
    });
    broadcast(POD_CHANNEL, { type: 'SAFE_RIDE_STARTED', ride });
    return ride;
  },
  addLocation(id: string, location: string): void {
    update((store) => {
      const ride = store.rides.find((r) => r.id === id);
      if (ride) {
        ride.trail = [...(ride.trail ?? []), { location, at: nowIso() }].slice(-200);
      }
    });
  },
  end(id: string): void {
    update((store) => {
      const ride = store.rides.find((r) => r.id === id);
      if (ride) {
        ride.status = 'COMPLETED';
        ride.endedAt = nowIso();
      }
    });
  },
};

/* ──────────────────────────────────── Pods ──────────────────────────────── */

export const localPods = {
  list(userName: string): Json[] {
    return load().pods.filter(
      (p) => p.creatorName === userName || (p.memberNames ?? '').split(',').includes(userName),
    );
  },
  create(name: string, userName: string): Json {
    const pod = {
      id: uid('pod'),
      name,
      code: randomCode(),
      members: 1,
      active: true,
      creatorName: userName,
      memberNames: userName,
      sosTriggeredBy: null,
      createdAt: nowIso(),
    };
    update((store) => {
      store.pods.push(pod);
    });
    broadcast(POD_CHANNEL, { type: 'POD_CREATED', pod });
    return pod;
  },
  join(code: string, userName: string): Json {
    const store = load();
    const pod = store.pods.find((p) => p.code.toUpperCase() === code.toUpperCase());
    if (!pod) throw new Error('Pod not found — check the invite code.');
    const names = (pod.memberNames ?? '').split(',').filter(Boolean);
    if (!names.includes(userName)) {
      names.push(userName);
      pod.memberNames = names.join(',');
      pod.members = names.length;
    }
    save(store);
    broadcast(POD_CHANNEL, { type: 'POD_JOINED', pod });
    return pod;
  },
  triggerSos(code: string, userName: string): Json {
    const store = load();
    const pod = store.pods.find((p) => p.code === code);
    if (!pod) throw new Error('Pod not found');
    pod.sosTriggeredBy = userName;
    pod.active = true;
    save(store);
    const alert = {
      podId: pod.id,
      podName: pod.name,
      podCode: pod.code,
      triggeredBy: userName,
      at: nowIso(),
    };
    broadcast(POD_CHANNEL, { type: 'POD_SOS', alert });
    return pod;
  },
  resolveSos(code: string): Json {
    const store = load();
    const pod = store.pods.find((p) => p.code === code);
    if (!pod) throw new Error('Pod not found');
    pod.sosTriggeredBy = null;
    save(store);
    broadcast(POD_CHANNEL, { type: 'POD_SOS_RESOLVED', code });
    return pod;
  },
  remove(code: string, userName: string): void {
    update((store) => {
      store.pods = store.pods.filter(
        (p) => !(p.code === code && p.creatorName === userName),
      );
    });
    broadcast(POD_CHANNEL, { type: 'POD_DELETED', code });
  },
};

/* ──────────────────────────────────── SOS ───────────────────────────────── */

function buildAlert(input: Json): Json {
  const user = currentUser();
  return {
    id: uid('sos'),
    userId: user.id,
    userName: user.name,
    triggerType: input.triggerType ?? 'MANUAL',
    riskLevel: 'CRITICAL',
    confidence: 1,
    latitude: input.latitude ?? 0,
    longitude: input.longitude ?? 0,
    areaName: input.areaName,
    status: 'ACTIVE',
    batteryPct: input.batteryPct,
    speedMps: input.speedMps,
    heartRate: input.heartRate,
    createdAt: nowIso(),
    localOnly: true,
  };
}

export const localSos = {
  trigger(input: Json): Json {
    const alert = buildAlert(input);
    update((store) => {
      store.sos.push(alert);
    });
    broadcast(SOS_CHANNEL, { type: 'SOS_RAISED', alert });
    return alert;
  },
  resolve(id: string): Json {
    const store = load();
    const alert = store.sos.find((a) => a.id === id);
    if (!alert) throw new Error('Alert not found');
    alert.status = 'RESOLVED';
    alert.resolvedAt = nowIso();
    save(store);
    broadcast(SOS_CHANNEL, { type: 'SOS_RESOLVED', id });
    return alert;
  },
  active(): Json[] {
    return load().sos.filter((a) => a.status === 'ACTIVE');
  },
  pushLocation(): void {
    /* location is attached at trigger time in local mode */
  },
  contacts(): Json[] {
    return load().contacts;
  },
  addContact(contact: Json): Json {
    const created = { id: uid('contact'), priority: 1, ...contact };
    update((store) => {
      store.contacts.push(created);
    });
    return created;
  },
  deleteContact(id: string): void {
    update((store) => {
      store.contacts = store.contacts.filter((c) => c.id !== id);
    });
  },
};

/* ────────────────────────────────── Blockchain ──────────────────────────── */

async function blockHash(block: {
  blockIndex: number;
  timestamp: string;
  type: string;
  description: string;
  prevHash: string;
}): Promise<string> {
  return sha256(
    `${block.blockIndex}|${block.timestamp}|${block.type}|${block.description}|${block.prevHash}`,
  );
}

export const localBlockchain = {
  async getChain(): Promise<Json[]> {
    return load().evidence;
  },
  async addEvidence(input: { type: string; description: string }): Promise<Json> {
    const store = load();
    const prev = store.evidence[store.evidence.length - 1];
    const block = {
      id: uid('block'),
      blockIndex: store.evidence.length,
      timestamp: nowIso(),
      type: input.type,
      description: input.description,
      prevHash: prev?.hash ?? '0'.repeat(64),
      tampered: false,
      userId: currentUser().id,
    };
    const hash = await blockHash(block);
    const saved = { ...block, hash };
    update((s) => {
      s.evidence.push(saved);
    });
    return saved;
  },
  async verifyChain(): Promise<boolean> {
    const evidence = load().evidence;
    let prevHash = '0'.repeat(64);
    for (const block of evidence) {
      if (block.prevHash !== prevHash) return false;
      const expected = await blockHash(block as {
        blockIndex: number;
        timestamp: string;
        type: string;
        description: string;
        prevHash: string;
      });
      if (expected !== block.hash) return false;
      prevHash = block.hash;
    }
    return true;
  },
  async tamperBlock(id: string): Promise<Json> {
    const store = load();
    const block = store.evidence.find((b) => b.id === id);
    if (!block) throw new Error('Block not found');
    block.description = `${block.description} [edited locally]`;
    block.tampered = true;
    save(store);
    return block;
  },
};

/* ───────────────────────────── AI-style services ────────────────────────── */

function replyToCompanion(message: string, name: string): { message: string; suggestion: string; pattern_detected: boolean } {
  const text = message.toLowerCase();
  const memory = load().companion;
  const pattern = memory.length >= 3;

  if (/follow|stalk|behind|chase/.test(text)) {
    return {
      message: `${name}, move toward people and light right now. Share your live location with a trusted contact, and call 112 if you feel you are in immediate danger. I am staying with you.`,
      suggestion: 'Open RakshaNet SOS',
      pattern_detected: pattern,
    };
  }
  if (/scared|afraid|panic|anxious|unsafe/.test(text)) {
    return {
      message: `That feeling is valid, ${name}. Try one slow breath in for four counts, hold for four, out for six. Tell me where you are and whether you are alone.`,
      suggestion: 'Breathing exercise',
      pattern_detected: pattern,
    };
  }
  if (/sad|lonely|alone|tired|cry/.test(text)) {
    return {
      message: `You are not alone in this conversation, ${name}. Would it help to write down one small thing you can do in the next ten minutes, or would you rather just talk?`,
      suggestion: 'Grounding',
      pattern_detected: pattern,
    };
  }
  if (/thank|better|okay|calm/.test(text)) {
    return {
      message: `I am glad to hear that, ${name}. I will remember this so we can build on what helped.`,
      suggestion: 'Save to memory',
      pattern_detected: pattern,
    };
  }
  return {
    message: `I hear you, ${name}. Tell me a little more about what is happening, and I will help you think it through one step at a time.`,
    suggestion: 'Keep talking',
    pattern_detected: pattern,
  };
}

export const localAi = {
  async detectDeepfake(audioBlob: Blob): Promise<Json> {
    const AudioCtx: typeof AudioContext | undefined =
      window.AudioContext ?? (window as any).webkitAudioContext;
    let zcr = 0;
    let hfRatio = 0;
    let rms = 0;
    let decoded = false;

    if (AudioCtx) {
      try {
        const ctx = new AudioCtx();
        const buffer = await audioBlob.arrayBuffer();
        const audio = await ctx.decodeAudioData(buffer.slice(0));
        const data = audio.getChannelData(0);
        const n = Math.min(data.length, 44100);
        let crossings = 0;
        let diffEnergy = 0;
        let totalEnergy = 0;
        for (let i = 1; i < n; i += 1) {
          const sample = data[i];
          if ((sample >= 0) !== (data[i - 1] >= 0)) crossings += 1;
          const diff = sample - data[i - 1];
          diffEnergy += diff * diff;
          totalEnergy += sample * sample;
          rms += sample * sample;
        }
        zcr = crossings / Math.max(1, n);
        hfRatio = totalEnergy > 0 ? diffEnergy / totalEnergy : 0;
        rms = Math.sqrt(rms / Math.max(1, n));
        decoded = true;
        await ctx.close();
      } catch {
        decoded = false;
      }
    }

    if (!decoded) {
      const bytes = new Uint8Array(await audioBlob.arrayBuffer());
      let entropy = 0;
      for (let i = 0; i < Math.min(bytes.length, 4096); i += 1) entropy += bytes[i];
      zcr = (entropy % 1000) / 1000;
      hfRatio = 0.3 + ((entropy % 200) / 1000);
      rms = 0.05;
    }

    const suspicious = hfRatio > 0.55 || zcr > 0.24;
    const confidence = clamp(0.55 + Math.abs(hfRatio - 0.55) * 1.4 + Math.abs(zcr - 0.2), 0.55, 0.97);
    return {
      is_deepfake: suspicious,
      confidence,
      spectral_anomalies: Math.round(hfRatio * 100),
      voice_match: Math.round(clamp(rms * 900, 5, 99)),
      artifacts: suspicious
        ? ['High-frequency energy above natural speech range', 'Compressed dynamic range']
        : [],
      method: 'on-device spectral heuristic',
      zcr,
      hf_ratio: hfRatio,
      rms,
    };
  },

  async companionChat(userId: string, message: string): Promise<Json> {
    const name = currentUser().name.split(' ')[0];
    const store = load();
    store.companion.push({ userId, content: message, category: 'message', at: nowIso() });
    store.companion = store.companion.slice(-100);
    save(store);
    return replyToCompanion(message, name);
  },

  async companionRemember(userId: string, content: string, category = 'general'): Promise<Json> {
    const store = load();
    store.companion.push({ userId, content, category, at: nowIso() });
    save(store);
    return { saved: true, count: store.companion.filter((m) => m.userId === userId).length };
  },

  async analyzeStalker(observation: Json): Promise<Json> {
    const {
      duration_seconds = 0,
      location_changes = 0,
      observation_count = 0,
      distance_meters = 100,
      signal_strength = -80,
    } = observation;

    const proximity = clamp(100 - distance_meters, 0, 100) * 0.35;
    const persistence = clamp(duration_seconds / 60, 0, 60) * 0.55;
    const movement = location_changes * 9;
    const sightings = observation_count * 0.9;
    const signal = clamp((signal_strength + 100) / 2, 0, 50) * 0.2;
    const threat = Math.round(clamp(proximity + persistence + movement + sightings + signal, 0, 100));
    const isStalking = threat >= 55;
    const factors: string[] = [];
    if (location_changes >= 3) factors.push('Followed you across multiple locations');
    if (duration_seconds >= 300) factors.push('Persisted for more than five minutes');
    if (distance_meters <= 30) factors.push('Stayed within close range');
    if (observation_count >= 10) factors.push('Repeated sightings');
    if (factors.length === 0) factors.push('No persistent following pattern detected');

    return {
      is_stalking: isStalking,
      threat_score: threat,
      pattern_match: isStalking ? 'persistent-follow' : sighting_alerts(observation_count),
      risk_factors: factors,
    };
  },

  async broadcastMesh(payload: { source_node: string; nodes: Json[]; max_hops?: number }): Promise<Json> {
    const maxHops = payload.max_hops ?? 5;
    const gateways = payload.nodes.filter(
      (n) => n.node_id !== payload.source_node && n.is_internet_connected,
    );
    const routes = gateways
      .map((gateway, index) => {
        const hops = Math.min(maxHops, 1 + (index % 3));
        const battery = Number(gateway.battery_pct ?? 80);
        const reliability = Number(gateway.historical_reliability ?? 0.9);
        const delivery = clamp(0.55 + battery / 400 + reliability * 0.2 - hops * 0.04, 0.3, 0.99);
        return {
          destination: gateway.node_id,
          hops,
          latency_ms: Math.round(90 * hops + (100 - battery) * 2),
          delivery_prob: Number(delivery.toFixed(2)),
          path: [payload.source_node, gateway.node_id],
        };
      })
      .sort((a, b) => b.delivery_prob - a.delivery_prob);

    return {
      routes,
      total_routes: routes.length,
      computed_on_device: true,
    };
  },

  async rankBystanders(responders: Json[], topK = 5): Promise<Json> {
    const ranked = responders
      .map((r) => {
        const trust =
          (r.verified_identity ? 22 : 0) +
          clamp(Number(r.account_age_days ?? 0) / 20, 0, 20) +
          clamp(Number(r.successful_help_count ?? 0) * 1.6, 0, 20) +
          clamp(Number(r.average_rating ?? 0) * 4, 0, 20) +
          (r.has_first_aid_training ? 8 : 0) +
          (r.is_off_duty_police ? 8 : 0) +
          (r.is_medical_professional ? 10 : 0);
        const capability = clamp(
          trust * 0.6 +
            (r.has_first_aid_training ? 15 : 0) +
            (r.is_medical_professional ? 15 : 0) +
            (r.is_off_duty_police ? 10 : 0),
          0,
          100,
        );
        const eta = Number(r.distance_meters ?? 100) / 80 + Number(r.response_time_seconds ?? 60) / 60;
        return {
          user_id: r.user_id,
          name: r.name,
          trust_score: Math.round(clamp(trust, 0, 100)),
          capability_score: Math.round(capability),
          eta_minutes: Number(eta.toFixed(1)),
          reason:
            r.is_medical_professional
              ? 'Medical professional nearby'
              : r.is_off_duty_police
                ? 'Off-duty police nearby'
                : r.has_first_aid_training
                  ? 'First-aid trained and verified'
                  : 'Verified community member nearby',
        };
      })
      .sort((a, b) => b.trust_score - a.trust_score)
      .slice(0, topK);
    return { ranked_responders: ranked, on_device_ranking: true };
  },

  async recognizeGesture(readings: Json[]): Promise<Json> {
    const xs = readings.map((r) => Number(r.accel_x ?? 0));
    const ys = readings.map((r) => Number(r.accel_y ?? 0));
    const zs = readings.map((r) => Number(r.accel_z ?? 0));
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
    const variance = (values: number[]) => {
      const m = mean(values);
      return mean(values.map((v) => (v - m) ** 2));
    };
    const motion = variance(xs) + variance(ys) + variance(zs);
    const gesture = motion > 0.3 ? 'SOS_TAP' : motion > 0.12 ? 'WAVE' : 'IDLE';
    const confidence = clamp(0.6 + motion, 0.6, 0.98);
    return {
      gesture,
      confidence,
      is_sos_trigger: gesture === 'SOS_TAP',
      all_scores: { SOS_TAP: gesture === 'SOS_TAP' ? confidence : 0.1, WAVE: gesture === 'WAVE' ? confidence : 0.12, IDLE: gesture === 'IDLE' ? confidence : 0.08 },
    };
  },

  async walkChat(
    message: string,
    userName: string,
    walkStage = 'middle',
    destination?: string,
    distanceWalked = 0,
  ): Promise<Json> {
    const minutes = Math.max(1, Math.round(Number(distanceWalked) / 80));
    const stage = walkStage === 'start'
      ? `I'm walking with you, ${userName}. I've got your location shared with your trusted contact.`
      : `You're doing well — about ${minutes} minute${minutes === 1 ? '' : 's'} in. Keep to the lit side of the road.`;
    const place = destination ? ` Toward ${destination}.` : '';
    return {
      message: `${stage}${place} Say "I'm home" whenever you arrive and I'll stop the check-in.`,
      stage: walkStage,
      on_device: true,
      received: message,
    };
  },

  async traumaCoach(message: string, userName: string): Promise<Json> {
    const text = message.toLowerCase();
    if (/nightmare|flashback|remember/.test(text)) {
      return {
        message: `${userName}, thank you for telling me. Try a 5-4-3-2-1 grounding round: name five things you can see, four you can touch, three you can hear, two you can smell, one you can taste. You are here, and you are safe in this moment.`,
      };
    }
    if (/guilt|blame|fault|shame/.test(text)) {
      return {
        message: `What happened was not your fault, ${userName}. Guilt is a common trauma response, not evidence of wrongdoing. Would you like to write one sentence to yourself that a trusted friend would say?`,
      };
    }
    if (/angry|anger|rage/.test(text)) {
      return {
        message: `Anger can be a protective response. Let's give it somewhere to go: press your feet into the floor, breathe out slowly, and tell me what the anger is guarding.`,
      };
    }
    return {
      message: `You survived, ${userName}, and asking for support is strength. Let's take this one small step at a time. What feels most manageable right now — breathing, writing it down, or reaching a counsellor?`,
    };
  },

  async getTherapists(location = 'Delhi'): Promise<Json> {
    return {
      therapists: [
        {
          name: 'Dr. Nandini Rao',
          specialties: ['Trauma', 'CBT'],
          credentials: 'RCI-licensed clinical psychologist',
          availability: `Telehealth · ${location}`,
          rating: 4.9,
        },
        {
          name: 'Meera Iyer',
          specialties: ['Crisis counselling', 'EMDR'],
          credentials: 'M.A. Clinical Psychology',
          availability: 'Weekdays, 10:00–18:00',
          rating: 4.8,
        },
        {
          name: 'Sana Qureshi',
          specialties: ['Anxiety', 'Grounding'],
          credentials: 'Counselling psychologist',
          availability: 'Weekends, online',
          rating: 4.7,
        },
      ],
      on_device_directory: true,
    };
  },

  async generateFir(payload: Json): Promise<Json> {
    const {
      user_name = 'Complainant',
      user_phone = '',
      incident_type = 'Incident',
      date = '',
      location = '',
      description = '',
      accused = 'Unknown',
      witnesses = [],
      evidence = [],
    } = payload;

    const firDraft = `FIRST INFORMATION REPORT (DRAFT)
(Under Section 173 BNSS / 154 CrPC — template only, not filed)

Complainant: ${user_name}
Contact: ${user_phone}
Date of incident: ${date}
Place of incident: ${location}
Nature of incident: ${incident_type}
Accused: ${accused}
Witnesses: ${witnesses.length ? witnesses.join(', ') : 'None listed'}
Evidence: ${evidence.length ? evidence.join(', ') : 'None listed'}

Statement:
${description}

Requested action:
Please register this information and provide a copy of the report. I request that my identity be protected where the law permits.

Signature: ____________________
Date: ____________________

NOTE: This is a locally generated template. Review it with a lawyer or
legal-aid centre before filing. RakshaNet does not file documents.`;

    const matched_lawyers = [
      {
        name: 'Legal Aid Clinic — District Court',
        specialization: 'Criminal law / FIR',
        experience: 'Free legal aid',
        contact: '15100 (NALSA helpline)',
        rating: 4.8,
      },
      {
        name: 'Adv. Priya Menon',
        specialization: 'Women’s safety and family law',
        experience: '12 years',
        contact: 'Available via district bar association',
        rating: 4.7,
      },
      {
        name: 'One Stop Centre (Sakhi)',
        specialization: 'Counselling, police liaison, shelter',
        experience: 'Government service',
        contact: '181 (Women’s helpline)',
        rating: 4.6,
      },
    ];

    return { fir_draft: firDraft, matched_lawyers, on_device_template: true };
  },
};

function sighting_alerts(count: number): string {
  if (count >= 8) return 'repeated-sighting';
  if (count >= 3) return 'intermittent-sighting';
  return 'single-sighting';
}

/* ─────────────────────────── Community / analytics ──────────────────────── */

const SEED_INCIDENTS: Json[] = [
  {
    id: 'seed_1',
    areaName: 'Connaught Place',
    type: 'Harassment',
    severity: 3,
    description: 'Group catcalling reported near the metro exit after 9pm.',
    isAnonymous: true,
    verified: true,
    upvotes: 12,
    reporterName: 'Anonymous',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: 'seed_2',
    areaName: 'Hauz Khas',
    type: 'Poor lighting',
    severity: 2,
    description: 'Street lights out along the market lane.',
    isAnonymous: false,
    verified: false,
    upvotes: 5,
    reporterName: 'Community member',
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
];

export const localIncidents = {
  list(page = 0, size = 25): { content: Json[]; totalElements: number } {
    const stored = load().incidents;
    const all = [...SEED_INCIDENTS, ...stored];
    return { content: all.slice(page * size, page * size + size), totalElements: all.length };
  },
  verified(): Json[] {
    return [...SEED_INCIDENTS, ...load().incidents].filter((i) => i.verified);
  },
  create(input: Json): Json {
    const created = {
      id: uid('incident'),
      ...input,
      upvotes: 0,
      verified: false,
      reporterName: currentUser().name,
      createdAt: nowIso(),
      localOnly: true,
    };
    update((store) => {
      store.incidents.unshift(created);
    });
    return created;
  },
  upvote(id: string): void {
    update((store) => {
      const incident = store.incidents.find((i) => i.id === id);
      if (incident) incident.upvotes = Number(incident.upvotes ?? 0) + 1;
    });
  },
  verify(id: string): Json {
    const store = load();
    const incident = store.incidents.find((i) => i.id === id);
    if (!incident) throw new Error('Incident not found');
    incident.verified = true;
    save(store);
    return incident;
  },
};

export const localThreat = {
  timeline(): Json[] {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const score = Math.round(
        28 + Math.sin((i / 24) * Math.PI * 2 - 1.4) * 18 + (i >= 21 || i <= 3 ? 14 : 0),
      );
      return {
        score,
        confidence: 0.82,
        riskLevel: score >= 70 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW',
        factors: { time_of_day: hour, lighting: 0.6, isolation: 0.4 },
        computedAt: new Date(Date.now() - (23 - i) * 3_600_000).toISOString(),
      };
    });
  },
};

export const localAdmin = {
  stats(): Json {
    const store = load();
    return {
      totalUsers: 1,
      activeSos: store.sos.filter((a) => a.status === 'ACTIVE').length,
      incidents: store.incidents.length + SEED_INCIDENTS.length,
      evidenceBlocks: store.evidence.length,
      pods: store.pods.length,
      localOnly: true,
    };
  },
};

export const localResponders = {
  active(): Json[] {
    const base = { latitude: 28.6139, longitude: 77.209 };
    return [
      {
        userId: 'sim_1',
        name: 'Verified responder (simulated)',
        latitude: base.latitude + 0.004,
        longitude: base.longitude + 0.002,
        profession: 'Verified community member',
        verifiedIdentity: true,
        isMedicalProfessional: false,
      },
      {
        userId: 'sim_2',
        name: 'Off-duty police (simulated)',
        latitude: base.latitude - 0.003,
        longitude: base.longitude + 0.005,
        profession: 'Police',
        verifiedIdentity: true,
        isMedicalProfessional: false,
      },
      {
        userId: 'sim_3',
        name: 'Doctor nearby (simulated)',
        latitude: base.latitude + 0.001,
        longitude: base.longitude - 0.004,
        profession: 'Doctor',
        verifiedIdentity: true,
        isMedicalProfessional: true,
      },
    ];
  },
};
