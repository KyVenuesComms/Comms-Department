// Durable store for the snapshot + daily trend. Uses Vercel KV (Upstash) when
// its env vars are present; otherwise falls back to in-memory (so local dev and
// pre-KV deploys keep working, just without cross-instance persistence).
import "server-only";
import { Redis } from "@upstash/redis";
import type { QueueSnapshot } from "../trello/snapshot-types";
import type { DepartmentConfig, TrendPoint, TrelloMapping, Targets, Tuning } from "../queue/types";
import type { ShowConfig } from "../queue/shows";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

export function storeMode(): "kv" | "memory" {
  return redis ? "kv" : "memory";
}

const SNAP_KEY = "wos:snapshot";
const TREND_KEY = "wos:trend"; // hash: date -> TrendPoint
const SYNC_KEY = "wos:lastsync";

export interface LastSync {
  at: string;
  ok: boolean;
  ms: number;
  counts?: { requested: number; inProgress: number; outForApproval: number; closed: number };
  error?: string;
}

// In-memory fallbacks (per instance).
let memSnapshot: QueueSnapshot | null = null;
const memTrend = new Map<string, TrendPoint>();
let memSync: LastSync | null = null;

export async function readSnapshot(): Promise<QueueSnapshot | null> {
  if (!redis) return memSnapshot;
  return (await redis.get<QueueSnapshot>(SNAP_KEY)) ?? null;
}

export async function writeSnapshot(snapshot: QueueSnapshot): Promise<void> {
  if (!redis) {
    memSnapshot = snapshot;
    return;
  }
  await redis.set(SNAP_KEY, snapshot);
}

export async function appendTrendPoint(point: TrendPoint): Promise<void> {
  if (!redis) {
    memTrend.set(point.date, point);
    return;
  }
  await redis.hset(TREND_KEY, { [point.date]: point });
}

export async function readTrend(): Promise<TrendPoint[]> {
  if (!redis) return [...memTrend.values()];
  const all = (await redis.hgetall<Record<string, TrendPoint>>(TREND_KEY)) ?? {};
  return Object.values(all);
}

export async function writeLastSync(sync: LastSync): Promise<void> {
  if (!redis) {
    memSync = sync;
    return;
  }
  await redis.set(SYNC_KEY, sync);
}

export async function readLastSync(): Promise<LastSync | null> {
  if (!redis) return memSync;
  return (await redis.get<LastSync>(SYNC_KEY)) ?? null;
}

// Show/event config, editable via /manager. `null` = never written (callers
// fall back to the built-in default seed); `[]` = explicitly emptied.
const SHOWS_KEY = "wos:shows";
let memShows: ShowConfig[] | null = null;

export async function readShowsRaw(): Promise<ShowConfig[] | null> {
  if (!redis) return memShows;
  return (await redis.get<ShowConfig[]>(SHOWS_KEY)) ?? null;
}

export async function writeShowsRaw(shows: ShowConfig[]): Promise<void> {
  if (!redis) {
    memShows = shows;
    return;
  }
  await redis.set(SHOWS_KEY, shows);
}

// Trello→board mapping, editable via /manager. `null` = never written
// (callers fall back to the built-in default).
const MAPPING_KEY = "wos:mapping";
let memMapping: TrelloMapping | null = null;

export async function readMappingRaw(): Promise<TrelloMapping | null> {
  if (!redis) return memMapping;
  return (await redis.get<TrelloMapping>(MAPPING_KEY)) ?? null;
}

export async function writeMappingRaw(mapping: TrelloMapping): Promise<void> {
  if (!redis) {
    memMapping = mapping;
    return;
  }
  await redis.set(MAPPING_KEY, mapping);
}

// Leadership targets, editable via /manager. `null` = never written.
const TARGETS_KEY = "wos:targets";
let memTargets: Targets | null = null;

export async function readTargetsRaw(): Promise<Targets | null> {
  if (!redis) return memTargets;
  return (await redis.get<Targets>(TARGETS_KEY)) ?? null;
}

export async function writeTargetsRaw(targets: Targets): Promise<void> {
  if (!redis) {
    memTargets = targets;
    return;
  }
  await redis.set(TARGETS_KEY, targets);
}

// Canonical departments + aliases, editable via /manager. `null` = never written.
const DEPTS_KEY = "wos:departments";
let memDepts: DepartmentConfig[] | null = null;

export async function readDepartmentsRaw(): Promise<DepartmentConfig[] | null> {
  if (!redis) return memDepts;
  return (await redis.get<DepartmentConfig[]>(DEPTS_KEY)) ?? null;
}

export async function writeDepartmentsRaw(depts: DepartmentConfig[]): Promise<void> {
  if (!redis) {
    memDepts = depts;
    return;
  }
  await redis.set(DEPTS_KEY, depts);
}

// Refresh + metric tuning, editable via /manager. `null` = never written.
const TUNING_KEY = "wos:tuning";
let memTuning: Tuning | null = null;

export async function readTuningRaw(): Promise<Tuning | null> {
  if (!redis) return memTuning;
  return (await redis.get<Tuning>(TUNING_KEY)) ?? null;
}

export async function writeTuningRaw(tuning: Tuning): Promise<void> {
  if (!redis) {
    memTuning = tuning;
    return;
  }
  await redis.set(TUNING_KEY, tuning);
}

// Last alert set we notified about (dedupes webhook pings across cron runs).
const ALERT_KEY = "wos:lastalerts";
let memAlerts: string | null = null;

export async function readLastAlerts(): Promise<string | null> {
  if (!redis) return memAlerts;
  return (await redis.get<string>(ALERT_KEY)) ?? null;
}

export async function writeLastAlerts(sig: string): Promise<void> {
  if (!redis) {
    memAlerts = sig;
    return;
  }
  await redis.set(ALERT_KEY, sig);
}
