// Durable store for the snapshot + daily trend. Uses Vercel KV (Upstash) when
// its env vars are present; otherwise falls back to in-memory (so local dev and
// pre-KV deploys keep working, just without cross-instance persistence).
import "server-only";
import { Redis } from "@upstash/redis";
import type { QueueSnapshot } from "../trello/snapshot-types";
import type { TrendPoint } from "../queue/types";

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
