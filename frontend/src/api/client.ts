const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export interface Cycle {
  cycle_id: number;
  session: string;
  phase: string;
  start_hour: number;
  start_min: number;
  end_hour: number;
  end_min: number;
  label: string;
}

export interface SearchResult {
  date: string;
  cycle_id: number;
  cycle_bias: string;
  daily_bias: string;
  w_to_pos: string;
  d_to_pos: string;
  s_to_pos: string;
  cycle_open: number | null;
  cycle_high: number | null;
  cycle_low: number | null;
  cycle_close: number | null;
  day_open?: number;
  day_close?: number;
  day_high?: number;
  day_low?: number;
  day_pct?: number;
}

export interface DayData {
  asset: string;
  date: string;
  bars: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    cycle_id: number;
  }>;
  cycles: Array<{
    cycle_id: number;
    session: string;
    phase: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    cycle_bias: string;
    daily_bias: string;
    w_to_pos: string;
    d_to_pos: string;
    s_to_pos: string;
  }>;
  true_opens: {
    w_to: number | null;
    d_to: number | null;
    s_to_asia: number | null;
    s_to_london: number | null;
    s_to_ny: number | null;
    s_to_pm: number | null;
  };
}

export async function fetchAssets(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/assets`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function fetchCycles(): Promise<Cycle[]> {
  const res = await fetch(`${API_BASE}/cycles`);
  if (!res.ok) throw new Error('Failed to fetch cycles');
  return res.json();
}

export interface SearchParams {
  asset: string;
  cycle_id: number;
  cycle_bias?: string;
  daily_bias?: string;
  w_to?: string;
  d_to?: string;
  s_to?: string;
  bias_logic?: 'and' | 'or' | 'single';
  date_from?: string;
  date_to?: string;
}

export async function searchCycles(params: SearchParams): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchDayData(asset: string, date: string): Promise<DayData> {
  const res = await fetch(`${API_BASE}/day/${encodeURIComponent(asset)}/${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error('Failed to fetch day data');
  return res.json();
}
