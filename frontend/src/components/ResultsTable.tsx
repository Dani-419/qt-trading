import type { SearchResult } from '../api/client';

interface ResultsTableProps {
  results: SearchResult[];
  cycles: import('../api/client').Cycle[];
  onRowClick: (date: string) => void;
}

export default function ResultsTable({ results, cycles, onRowClick }: ResultsTableProps) {
  const getCycleLabel = (cycleId: number) => {
    const cycle = cycles.find((c) => c.cycle_id === cycleId);
    return cycle ? cycle.label : `${cycleId}`;
  };

  const formatBias = (bias: string) => {
    if (bias === 'Bullish') return 'Bull';
    if (bias === 'Bearish') return 'Bear';
    return bias;
  };

  const formatDayPct = (pct?: number) => {
    if (pct === undefined || pct === null) return 'N/A';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${(pct * 100).toFixed(2)}%`;
  };

  const getDayColor = (pct?: number) => {
    if (pct === undefined || pct === null) return 'text-gray-400';
    return pct >= 0 ? 'text-green-400' : 'text-red-400';
  };

  if (results.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
        No matching cycles found. Adjust your filters.
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-700 border-b border-gray-600">
        <h3 className="text-lg font-semibold text-white">
          Results — {results.length} match{results.length !== 1 ? 'es' : ''}
        </h3>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-700 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Date</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Cycle</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">C.Bias</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">D.Bias</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">W/D/S-TO</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Day Outcome</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row, idx) => (
              <tr
                key={`${row.date}-${row.cycle_id}-${idx}`}
                onClick={() => onRowClick(row.date)}
                className="border-t border-gray-700 hover:bg-gray-700 cursor-pointer"
              >
                <td className="px-4 py-2 text-white">{row.date}</td>
                <td className="px-4 py-2 text-gray-300">{getCycleLabel(row.cycle_id)}</td>
                <td className="px-4 py-2 text-gray-300">{formatBias(row.cycle_bias)}</td>
                <td className="px-4 py-2 text-gray-300">{formatBias(row.daily_bias)}</td>
                <td className="px-4 py-2 text-gray-300 text-sm">
                  {row.w_to_pos?.[0] || '-'}{row.d_to_pos?.[0] || '-'}{row.s_to_pos?.[0] || '-'}
                </td>
                <td className={`px-4 py-2 ${getDayColor(row.day_pct)}`}>
                  {formatDayPct(row.day_pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
