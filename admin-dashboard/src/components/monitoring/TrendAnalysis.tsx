import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

interface TrendPoint {
  timestamp: string;
  value: number;
}

interface TrendData {
  metric: string;
  data: TrendPoint[];
  threshold?: {
    warning: number;
    critical: number;
  };
  unit: string;
}

interface TrendAnalysisProps {
  trendData: TrendData;
  timeRange: string; // '1h' | '6h' | '24h' | '7d' | '30d'
  onTimeRangeChange: (range: string) => void;
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ 
  trendData, 
  timeRange, 
  onTimeRangeChange 
}) => {
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [showTrend, setShowTrend] = useState(true);

  // Calculate basic statistics
  const values = trendData.data.map(point => point.value);
  const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  const max = Math.max(...values, 0);
  const min = Math.min(...values);
  
  // Calculate standard deviation
  const variance = values.length > 0 
    ? values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length 
    : 0;
  const stdDev = Math.sqrt(variance);

  // Define upper and lower bounds for anomaly detection (2 standard deviations from mean)
  const upperBound = average + 2 * stdDev;
  const lowerBound = Math.max(0, average - 2 * stdDev);

  // Find anomalies
  const anomalies = trendData.data.filter(
    point => point.value > upperBound || point.value < lowerBound
  );

  // Format X-axis labels based on time range
  const formatXAxis = (timestamp: string) => {
    const date = parseISO(timestamp);
    
    switch(timeRange) {
      case '1h':
      case '6h':
        return format(date, 'HH:mm');
      case '24h':
        return format(date, 'HH:mm');
      case '7d':
        return format(date, 'MMM dd');
      case '30d':
        return format(date, 'MMM dd');
      default:
        return format(date, 'HH:mm');
    }
  };

  // Calculate simple linear regression for trend line
  const calculateTrend = () => {
    const n = trendData.data.length;
    if (n <= 1) return { slope: 0, intercept: 0 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    trendData.data.forEach((point, i) => {
      sumX += i;
      sumY += point.value;
      sumXY += i * point.value;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  const trend = calculateTrend();
  
  // Generate trend line data
  const trendLineData = trendData.data.map((point, i) => ({
    timestamp: point.timestamp,
    trend: trend.intercept + trend.slope * i
  }));

  // Determine trend direction for displaying status
  const trendDirection = trend.slope > 0.05 ? 'increasing' : 
                         trend.slope < -0.05 ? 'decreasing' : 'stable';
  
  // Determine if trend is concerning based on thresholds and direction
  const isTrendConcerning = () => {
    if (!trendData.threshold) return false;
    
    const lastValue = values[values.length - 1] || 0;
    const projectedValue = lastValue + (trend.slope * 10); // Project 10 time units ahead
    
    return (trend.slope > 0 && projectedValue > trendData.threshold.warning) || 
           (trend.slope < 0 && trendData.metric === 'cache_hit_rate' && projectedValue < trendData.threshold.warning);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {trendData.metric.charAt(0).toUpperCase() + trendData.metric.slice(1).replace(/_/g, ' ')} Trend
          </h2>
          <div className="flex items-center mt-1">
            <div className={`h-2 w-2 rounded-full mr-2 ${
              trendDirection === 'increasing' 
                ? (trendData.metric === 'error_rate' ? 'bg-red-500' : 'bg-green-500')
                : trendDirection === 'decreasing' 
                  ? (trendData.metric === 'error_rate' ? 'bg-green-500' : 'bg-yellow-500')
                  : 'bg-blue-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1)}
              {isTrendConcerning() && 
                <span className="ml-2 text-red-500 font-medium">• Concerning trend detected</span>
              }
            </span>
          </div>
        </div>
        <div className="flex space-x-1">
          <button 
            onClick={() => onTimeRangeChange('1h')} 
            className={`px-2 py-1 text-xs rounded ${
              timeRange === '1h' 
                ? 'bg-blue-100 text-blue-800 font-medium' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            1h
          </button>
          <button 
            onClick={() => onTimeRangeChange('6h')} 
            className={`px-2 py-1 text-xs rounded ${
              timeRange === '6h' 
                ? 'bg-blue-100 text-blue-800 font-medium' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            6h
          </button>
          <button 
            onClick={() => onTimeRangeChange('24h')} 
            className={`px-2 py-1 text-xs rounded ${
              timeRange === '24h' 
                ? 'bg-blue-100 text-blue-800 font-medium' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            24h
          </button>
          <button 
            onClick={() => onTimeRangeChange('7d')} 
            className={`px-2 py-1 text-xs rounded ${
              timeRange === '7d' 
                ? 'bg-blue-100 text-blue-800 font-medium' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            7d
          </button>
          <button 
            onClick={() => onTimeRangeChange('30d')} 
            className={`px-2 py-1 text-xs rounded ${
              timeRange === '30d' 
                ? 'bg-blue-100 text-blue-800 font-medium' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            30d
          </button>
        </div>
      </div>
      
      <div className="mb-4 flex items-center space-x-4">
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="show-anomalies" 
            checked={showAnomalies} 
            onChange={() => setShowAnomalies(!showAnomalies)} 
            className="mr-2"
          />
          <label htmlFor="show-anomalies" className="text-sm text-gray-600">
            Show anomalies
          </label>
        </div>
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="show-trend" 
            checked={showTrend} 
            onChange={() => setShowTrend(!showTrend)} 
            className="mr-2"
          />
          <label htmlFor="show-trend" className="text-sm text-gray-600">
            Show trend line
          </label>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis} 
              minTickGap={30}
            />
            <YAxis 
              domain={[
                dataMin => Math.max(0, dataMin * 0.9), 
                dataMax => dataMax * 1.1
              ]} 
              label={{ 
                value: trendData.unit, 
                angle: -90, 
                position: 'insideLeft' 
              }} 
            />
            <Tooltip 
              formatter={(value: number) => [`${value} ${trendData.unit}`, trendData.metric.replace(/_/g, ' ')]} 
              labelFormatter={(label) => format(parseISO(label), 'MMM dd, yyyy HH:mm:ss')}
            />
            <Legend />
            
            {/* Reference areas for thresholds */}
            {trendData.threshold && (
              <>
                <ReferenceLine 
                  y={trendData.threshold.warning} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3"
                  label={{ 
                    position: 'right',
                    value: 'Warning',
                    fill: '#f59e0b',
                    fontSize: 12
                  }}
                />
                <ReferenceLine 
                  y={trendData.threshold.critical} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3"
                  label={{ 
                    position: 'right',
                    value: 'Critical',
                    fill: '#ef4444',
                    fontSize: 12
                  }}
                />
              </>
            )}
            
            {/* Main data line */}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              name={trendData.metric.replace(/_/g, ' ')} 
              activeDot={{ r: 6 }}
            />
            
            {/* Trend line */}
            {showTrend && (
              <Line 
                data={trendLineData}
                type="monotone" 
                dataKey="trend" 
                stroke="#6366f1" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                dot={false}
                activeDot={false}
                name="trend"
              />
            )}
            
            {/* Reference areas for anomalies */}
            {showAnomalies && anomalies.map((point, index) => (
              <ReferenceArea
                key={`anomaly-${index}`}
                x1={point.timestamp}
                x2={point.timestamp}
                y1={0}
                y2={point.value}
                fill="#f87171"
                fillOpacity={0.3}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Average</div>
          <div className="text-xl font-semibold text-gray-800">
            {average.toFixed(2)} {trendData.unit}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Maximum</div>
          <div className="text-xl font-semibold text-gray-800">
            {max.toFixed(2)} {trendData.unit}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Minimum</div>
          <div className="text-xl font-semibold text-gray-800">
            {min.toFixed(2)} {trendData.unit}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Anomalies</div>
          <div className="text-xl font-semibold text-gray-800">
            {anomalies.length}
          </div>
        </div>
      </div>
      
      {anomalies.length > 0 && showAnomalies && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Detected Anomalies</h3>
          <div className="max-h-40 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deviation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {anomalies.map((point, index) => (
                  <tr key={`anomaly-row-${index}`}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                      {format(parseISO(point.timestamp), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                      {point.value.toFixed(2)} {trendData.unit}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        point.value > average ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {point.value > average ? '+' : ''}
                        {((point.value - average) / average * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendAnalysis;
