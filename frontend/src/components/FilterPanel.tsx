import { useState, useEffect } from 'react';
import type { Cycle } from '../api/client';

interface FilterPanelProps {
  assets: string[];
  cycles: Cycle[];
  onSearch: (params: SearchParams) => void;
}

interface SearchParams {
  asset: string;
  cycle_id: number;
  cycle_bias?: string;
  daily_bias?: string;
  w_to?: string;
  d_to?: string;
  s_to?: string;
  bias_logic: 'and' | 'or' | 'single';
  date_from?: string;
  date_to?: string;
}

const BIAS_OPTIONS = ['Bullish', 'Bearish', 'No Bias', 'Any'];
const TO_OPTIONS = ['Above', 'Below', 'Any'];

const STORAGE_KEY = 'ict-filters';

function loadSaved() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function saveFilters(f: Record<string, unknown>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); } catch {}
}

export default function FilterPanel({ assets, cycles, onSearch }: FilterPanelProps) {
  const saved = loadSaved();
  const [asset, setAsset] = useState<string>(saved?.asset || assets[0] || '');
  const [cycleId, setCycleId] = useState<number>(saved?.cycleId ?? 1);
  const [cycleBias, setCycleBias] = useState<string>(saved?.cycleBias || 'Any');
  const [dailyBias, setDailyBias] = useState<string>(saved?.dailyBias || 'Any');
  const [wTo, setWTo] = useState<string>(saved?.wTo || 'Any');
  const [dTo, setDTo] = useState<string>(saved?.dTo || 'Any');
  const [sTo, setSTo] = useState<string>(saved?.sTo || 'Any');
  const [biasLogic, setBiasLogic] = useState<'and' | 'or' | 'single'>(saved?.biasLogic || 'and');
  const [dateFrom, setDateFrom] = useState<string>(saved?.dateFrom || '');
  const [dateTo, setDateTo] = useState<string>(saved?.dateTo || '');

  // Persist filters on change
  useEffect(() => {
    saveFilters({ asset, cycleId, cycleBias, dailyBias, wTo, dTo, sTo, biasLogic, dateFrom, dateTo });
  }, [asset, cycleId, cycleBias, dailyBias, wTo, dTo, sTo, biasLogic, dateFrom, dateTo]);

  useEffect(() => {
    const params: SearchParams = {
      asset,
      cycle_id: cycleId,
      bias_logic: biasLogic,
    };

    if (cycleBias !== 'Any') params.cycle_bias = cycleBias;
    if (dailyBias !== 'Any') params.daily_bias = dailyBias;
    if (wTo !== 'Any') params.w_to = wTo;
    if (dTo !== 'Any') params.d_to = dTo;
    if (sTo !== 'Any') params.s_to = sTo;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    const timer = setTimeout(() => {
      onSearch(params);
    }, 300);

    return () => clearTimeout(timer);
  }, [asset, cycleId, cycleBias, dailyBias, wTo, dTo, sTo, biasLogic, dateFrom, dateTo, onSearch]);

  const cycleOptions = cycles.map((c) => (
    <option key={c.cycle_id} value={c.cycle_id}>
      {c.label} ({c.session} {c.phase})
    </option>
  ));

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Asset */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Asset</label>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {assets.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Cycle */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">90m Cycle</label>
          <select
            value={cycleId}
            onChange={(e) => setCycleId(Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {cycleOptions}
          </select>
        </div>

        {/* Bias Logic */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Filter Mode</label>
          <div className="flex gap-2">
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="radio"
                name="biasLogic"
                value="and"
                checked={biasLogic === 'and'}
                onChange={(e) => setBiasLogic(e.target.value as 'and' | 'or' | 'single')}
                className="mr-1"
              />
              AND
            </label>
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="radio"
                name="biasLogic"
                value="or"
                checked={biasLogic === 'or'}
                onChange={(e) => setBiasLogic(e.target.value as 'and' | 'or' | 'single')}
                className="mr-1"
              />
              OR
            </label>
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="radio"
                name="biasLogic"
                value="single"
                checked={biasLogic === 'single'}
                onChange={(e) => setBiasLogic(e.target.value as 'and' | 'or' | 'single')}
                className="mr-1"
              />
              Single
            </label>
          </div>
        </div>

        {/* Cycle Bias */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Cycle Bias</label>
          <select
            value={cycleBias}
            onChange={(e) => setCycleBias(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {BIAS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Daily Bias */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Daily Bias</label>
          <select
            value={dailyBias}
            onChange={(e) => setDailyBias(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {BIAS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* W-TO */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">vs W-TO</label>
          <select
            value={wTo}
            onChange={(e) => setWTo(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {TO_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* D-TO */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">vs D-TO</label>
          <select
            value={dTo}
            onChange={(e) => setDTo(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {TO_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* S-TO */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">vs S-TO</label>
          <select
            value={sTo}
            onChange={(e) => setSTo(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {TO_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
      </div>
    </div>
  );
}
