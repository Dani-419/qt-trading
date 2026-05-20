import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import type { DayData } from '../api/client';

interface DayChartModalProps {
  asset: string;
  date: string;
  dayData: DayData | null;
  selectedCycleId?: number;
  onClose: () => void;
  showCycles: boolean;
  showTrueOpens: boolean;
}

export default function DayChartModal({
  asset,
  date,
  dayData,
  selectedCycleId,
  onClose,
  showCycles,
  showTrueOpens,
}: DayChartModalProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [showCyclesState, setShowCyclesState] = useState(showCycles);
  const [showTrueOpensState, setShowTrueOpensState] = useState(showTrueOpens);
  const [loading, setLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !dayData) return;

    setLoading(true);
    setChartError(null);

    try {
      // Cleanup previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }

      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
        layout: {
          background: { color: '#1f2937' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;

      const candleData: CandlestickData[] = dayData.bars.map((bar) => ({
        time: bar.time as Time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));

      candleSeries.setData(candleData);

      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);
      setLoading(false);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chart) {
          chart.remove();
        }
        chartRef.current = null;
        candleSeriesRef.current = null;
      };
    } catch (err) {
      setChartError(err instanceof Error ? err.message : 'Failed to create chart');
      setLoading(false);
    }
  }, [dayData]);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !dayData) return;

    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    // Clear existing markers
    candleSeries.setMarkers([]);

    // Add markers for cycle boundaries
    if (showCyclesState) {
      const markers = dayData.cycles.map((cycle) => {
        const firstBar = dayData.bars.find((b) => b.cycle_id === cycle.cycle_id);
        if (!firstBar) return null;

        const colors: Record<string, string> = {
          A: '#3b82f6',
          M: '#8b5cf6',
          D: '#f59e0b',
          X: '#6b7280',
        };

        return {
          time: firstBar.time as Time,
          position: 'aboveBar',
          color: colors[cycle.phase] || '#9ca3af',
          shape: 'text',
          text: `${cycle.phase}`,
        };
      }).filter(Boolean) as any[];

      candleSeries.setMarkers(markers);
    }

    // Remove existing price lines by recreating the series
    // lightweight-charts doesn't have a direct way to remove price lines
    // So we'll just add new ones without removing old ones (they'll be replaced on next render)

    if (showTrueOpensState && dayData.true_opens) {
      const trueOpens = [
        { price: dayData.true_opens.w_to, title: 'W-TO', color: '#f59e0b' },
        { price: dayData.true_opens.d_to, title: 'D-TO', color: '#22c55e' },
        { price: dayData.true_opens.s_to_asia, title: 'S-TO Asia', color: '#3b82f6' },
        { price: dayData.true_opens.s_to_london, title: 'S-TO London', color: '#8b5cf6' },
        { price: dayData.true_opens.s_to_ny, title: 'S-TO NY', color: '#ef4444' },
        { price: dayData.true_opens.s_to_pm, title: 'S-TO PM', color: '#6b7280' },
      ].filter((to) => to.price !== null && to.price !== undefined);

      trueOpens.forEach((to) => {
        candleSeries.createPriceLine({
          price: to.price!,
          color: to.color,
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: to.title,
        });
      });
    }

    // Fit content
    chart.timeScale().fitContent();
  }, [dayData, showCyclesState, showTrueOpensState]);

  // Show loading state while fetching data
  if (!dayData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 text-white">
          Loading chart data...
        </div>
      </div>
    );
  }

  // Show error state if chart failed to load
  if (chartError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 text-white max-w-md">
          <h3 className="text-lg font-bold mb-2">Chart Error</h3>
          <p className="text-red-400 mb-4">{chartError}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              {asset} — {date}
            </h2>
            <p className="text-sm text-gray-400">
              {loading ? (
                <span className="text-yellow-400">Loading chart...</span>
              ) : (
                `${dayData.bars.length} bars | ${dayData.cycles.length} cycles`
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showCyclesState}
                onChange={(e) => setShowCyclesState(e.target.checked)}
                className="mr-2"
              />
              Show Cycles
            </label>
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showTrueOpensState}
                onChange={(e) => setShowTrueOpensState(e.target.checked)}
                className="mr-2"
              />
              Show True Opens
            </label>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
            >
              Close
            </button>
          </div>
        </div>
        <div ref={chartContainerRef} className="w-full" style={{ minHeight: '500px' }} />
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Cycle Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {dayData.cycles.map((cycle) => (
              <div
                key={cycle.cycle_id}
                className={`p-2 rounded text-sm ${
                  cycle.cycle_id === selectedCycleId
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                <div className="font-medium">#{cycle.cycle_id}</div>
                <div className="text-xs">{cycle.session} {cycle.phase}</div>
                <div className="text-xs">{cycle.cycle_bias?.substring(0, 4)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
