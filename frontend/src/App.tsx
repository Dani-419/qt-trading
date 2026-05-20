import { useState, useEffect, useCallback } from 'react';
import FilterPanel from './components/FilterPanel';
import ResultsTable from './components/ResultsTable';
import DayChartModal from './components/DayChartModal';
import {
  fetchAssets,
  fetchCycles,
  searchCycles,
  fetchDayData,
  type Cycle,
  type SearchResult,
  type DayData,
  type SearchParams,
} from './api/client';

export default function App() {
  const [assets, setAssets] = useState<string[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(undefined);
  const [selectedAsset, setSelectedAsset] = useState<string>('NQ');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assetsData, cyclesData] = await Promise.all([
          fetchAssets(),
          fetchCycles(),
        ]);
        setAssets(assetsData);
        setCycles(cyclesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    };
    loadData();
  }, []);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setSelectedCycleId(params.cycle_id);
    setSelectedAsset(params.asset);
    try {
      const searchResults = await searchCycles(params);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(async (date: string) => {
    setSelectedDate(date);
    setDayData(null);
    try {
      const data = await fetchDayData(selectedAsset, date);
      setDayData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    }
  }, [selectedAsset]);

  const handleCloseModal = useCallback(() => {
    setSelectedDate(null);
    setDayData(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-white">
            ICT Quarterly Cycles Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Historical 90-minute cycle analysis for NQ, ES, YM futures
          </p>
        </header>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {assets.length > 0 && cycles.length > 0 && (
          <FilterPanel
            assets={assets}
            cycles={cycles}
            onSearch={handleSearch}
          />
        )}

        {loading && (
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            Searching...
          </div>
        )}

        {!loading && (
          <ResultsTable
            results={results}
            cycles={cycles}
            onRowClick={handleRowClick}
          />
        )}
      </div>

      {selectedDate && (
        <DayChartModal
          asset={selectedAsset}
          date={selectedDate}
          dayData={dayData}
          selectedCycleId={selectedCycleId}
          onClose={handleCloseModal}
          showCycles={true}
          showTrueOpens={true}
        />
      )}
    </div>
  );
}
