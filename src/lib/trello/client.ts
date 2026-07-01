// Server-only Trello reader. Read-only: this file never writes to Trello.
// Credentials come from env vars and never reach the browser.
import "server-only";
import type { RawCard } from "../queue/types";

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
interface TrelloCard {
  id: string;
  name: string;
  idList: string;
  labels?: { name: string }[];
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
  const [lists, cards] = await Promise.all([
    get<TrelloList[]>(`/boards/${boardId}/lists?fields=name&filter=open`),
    get<TrelloCard[]>(
      `/boards/${boardId}/cards?fields=name,idList,labels&filter=visible`,
    ),
  ]);
  const nameByListId = new Map(lists.map((l) => [l.id, l.name]));
  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    listName: nameByListId.get(c.idList) ?? "",
    labels: (c.labels ?? []).map((l) => ({ name: l.name ?? "" })),
  }));
}
