const BASE = '/api';

export interface CycleDef {
  cycle_id: number; session: string; phase: string;
  start_time: string; label: string;
}

export interface SearchParams {
  asset: string; cycle_id: number;
  cycle_bias?: string; daily_bias?: string;
  w_to?: string; d_to?: string; s_to?: string;
  bias_logic: string;
  date_from?: string; date_to?: string;
}

export interface SearchResult {
  trading_date: string; cycle_bias: string; daily_bias: string;
  w_to_pos: string | null; d_to_pos: string | null; s_to_pos: string | null;
  day_open: number; day_close: number; day_high: number; day_low: number;
  day_range: number; day_pct: number; day_direction: string;
  cycle_open: number; cycle_high: number; cycle_low: number; cycle_close: number;
}

export interface DayCandle {
  timestamp: string; open: number; high: number; low: number; close: number;
  cycle_id: number;
}

export interface CycleInfo {
  cycle_id: number; session: string; phase: string;
  cycle_open: number; cycle_high: number; cycle_low: number; cycle_close: number;
  cycle_bias: string;
  w_to_price: number | null; d_to_price: number | null; s_to_price: number | null;
}

export interface DayData {
  candles: DayCandle[];
  cycles: CycleInfo[];
  day: Record<string, any> | null;
}

export async function fetchCycles(): Promise<CycleDef[]> {
  const r = await fetch(`${BASE}/cycles`);
  return r.json();
}

export async function searchCycles(params: SearchParams): Promise<SearchResult[]> {
  const r = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return r.json();
}

export async function fetchDay(asset: string, date: string): Promise<DayData> {
  const r = await fetch(`${BASE}/day/${asset}/${date}`);
  return r.json();
}
