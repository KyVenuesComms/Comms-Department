// Server-only Trello reader. Read-only: this file never writes to Trello.
// Credentials come from env vars and never reach the browser.
import "server-only";
import type { Move, RawCard } from "../queue/types";

const BASE = "https://api.trello.com/1";

function creds() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const boardId = process.env.TRELLO_BOARD_ID;
  if (!key || !token || !boardId) {
    throw new Error(
      "Missing Trello credentials. Set TRELLO_API_KEY, TRELLO_TOKEN, and " +
        "TRELLO_BOARD_ID in .env.local (see .env.example).",
    );
  }
  return { key, token, boardId };
}

interface TrelloList {
  id: string;
  name: string;
}
interface TrelloMember {
  id: string;
  fullName: string;
}
interface TrelloCard {
  id: string;
  name: string;
  idList: string;
  labels?: { name: string }[];
  url: string;
  desc?: string;
  due?: string | null;
  dueComplete?: boolean;
  idMembers?: string[];
}

async function get<T>(path: string): Promise<T> {
  const { key, token } = creds();
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}key=${key}&token=${token}`;
  // We control refresh timing ourselves (see snapshot.ts), so don't let the
  // framework cache the raw response.
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Trello responded ${res.status} on ${path.split("?")[0]}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch every visible card on the board, each tagged with its list name. */
export async function fetchBoardCards(): Promise<RawCard[]> {
  const { boardId } = creds();
  const [lists, members, cards] = await Promise.all([
    get<TrelloList[]>(`/boards/${boardId}/lists?fields=name&filter=open`),
    get<TrelloMember[]>(`/boards/${boardId}/members?fields=fullName`),
    get<TrelloCard[]>(
      `/boards/${boardId}/cards?fields=name,idList,labels,url,desc,due,dueComplete,idMembers&filter=visible`,
    ),
  ]);
  const nameByListId = new Map(lists.map((l) => [l.id, l.name]));
  const nameByMemberId = new Map(members.map((m) => [m.id, m.fullName]));
  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    listName: nameByListId.get(c.idList) ?? "",
    labels: (c.labels ?? []).map((l) => ({ name: l.name ?? "" })),
    url: c.url,
    desc: c.desc,
    due: c.due ?? null,
    dueComplete: c.dueComplete ?? false,
    assignee: c.idMembers?.length
      ? (nameByMemberId.get(c.idMembers[0]) ?? null)
      : null,
  }));
}

/** Names of every open list on the board — feeds the mapping editor. */
export async function fetchBoardLists(): Promise<string[]> {
  const { boardId } = creds();
  const lists = await get<TrelloList[]>(`/boards/${boardId}/lists?fields=name&filter=open`);
  return lists.map((l) => l.name).filter(Boolean);
}

/** Distinct label texts on the board — feeds the mapping editor's flag/type pickers. */
export async function fetchBoardLabels(): Promise<string[]> {
  const { boardId } = creds();
  const labels = await get<{ name: string }[]>(`/boards/${boardId}/labels?fields=name&limit=1000`);
  return [...new Set(labels.map((l) => l.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/**
 * Creation timestamps of ARCHIVED cards (creation time is encoded in the card
 * id, so we fetch ids only). Paginated defensively; the archive is small today
 * (~170 cards) but this stays correct if it grows.
 */
export async function fetchArchivedCreatedMs(): Promise<number[]> {
  const { boardId } = creds();
  const out: number[] = [];
  let before = "";
  for (let page = 0; page < 10; page++) {
    const cards = await get<{ id: string }[]>(
      `/boards/${boardId}/cards?filter=closed&fields=none&limit=1000${before ? `&before=${before}` : ""}`,
    );
    if (cards.length === 0) break;
    for (const c of cards) out.push(parseInt(c.id.slice(0, 8), 16) * 1000);
    if (cards.length < 1000) break;
    before = cards[cards.length - 1].id;
  }
  return out;
}

interface TrelloMoveAction {
  date: string;
  data?: {
    card?: { id: string; name: string };
    listAfter?: { name: string };
  };
}

/**
 * Fetch recent list-move history (one bounded call — the last 1,000 moves).
 * Used to derive turnaround, "as of" stage dates, and recently-completed.
 * Depth is capped by design; documented in OPERATIONS.md.
 */
export async function fetchListMoves(): Promise<Move[]> {
  const { boardId } = creds();
  const actions = await get<TrelloMoveAction[]>(
    `/boards/${boardId}/actions?filter=updateCard:idList&limit=1000`,
  );
  return actions
    .filter((a) => a.data?.card?.id && a.data.listAfter?.name)
    .map((a) => ({
      cardId: a.data!.card!.id,
      cardName: a.data!.card!.name,
      toList: a.data!.listAfter!.name,
      at: a.date,
    }));
}
