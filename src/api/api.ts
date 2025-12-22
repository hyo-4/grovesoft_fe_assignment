import axios from "axios";
import type { EventResponse } from "../types/event";
import type { EntryPayload } from "../types/entries";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 8000,
});

export async function fetchEvent(): Promise<EventResponse> {
  const { data } = await api.get("/event");
  //현재는 이벤트 1개만 display해주기 때문에 하나만 사용했습니다.
  return data[0];
}

export async function submitEntry(payload: EntryPayload) {
  const { data } = await api.post("/entries", payload);
  return data;
}
