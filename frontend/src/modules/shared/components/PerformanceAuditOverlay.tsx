import React, { useState, useEffect } from 'react';
import { BarChart2, X, RefreshCw } from 'lucide-react';
import performanceMonitoring from '../../../utils/PerformanceMonitoring';
import mobileOptimizationService from '../../../services/MobileOptimizationService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface PerformanceAuditOverlayProps {
  enabled?: boolean;
}

/**
 * Performance Audit Overlay
 *
 * A development tool that displays real-time performance metrics
 * for auditing and debugging, especially useful for mobile testing.
 *
 * NOTE: This should only be used during development/testing and
 * disabled in production builds.
 */
const PerformanceAuditOverlay: React.FC<PerformanceAuditOverlayProps> = ({
  enabled = process.env.NODE_ENV !== 'production',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isRecording, setIsRecording] = useState<boolean>(true);

  // Early return if not enabled
  if (!enabled) return null;

  useEffect(() => {
    // Get device info
    setDeviceInfo(mobileOptimizationService.getDeviceInfo());

    // Set up metrics listener
    const handleMetricsUpdate = (updatedMetrics: any[]) => {
      if (isRecording) {
        setMetrics(updatedMetrics);
      }
    };

    performanceMonitoring.addListener(handleMetricsUpdate);

    return () => {
      performanceMonitoring.removeListener(handleMetricsUpdate);
    };
  }, [isRecording]);

  // Get color based on rating
  const getRatingVariant = (rating: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (rating) {
      case 'good': return 'default';
      case 'needs-improvement': return 'secondary';
      case 'poor': return 'destructive';
      default: return 'outline';
    }
  };

  // Format metric value for display
  const formatMetricValue = (name: string, value: number) => {
    if (name === 'CLS') return value.toFixed(3);
    return `${Math.round(value)}ms`;
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-[9999] bg-gray-800 text-white rounded-tl-md shadow-lg opacity-90 transition-all duration-200",
        isOpen ? "w-[350px]" : "w-auto"
      )}
    >
      <div className="flex items-center justify-between p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-white hover:bg-gray-700"
        >
          {isOpen ? <X className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
        </Button>

        {!isOpen && (
          <Badge variant="secondary" className="bg-purple-600 text-white">
            Perf
          </Badge>
        )}

        {isOpen && (
          <>
            <span className="font-bold text-sm">Performance Audit</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => performanceMonitoring.clearMetrics()}
                className="text-white hover:bg-gray-700 p-1"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Switch
                checked={isRecording}
                onCheckedChange={setIsRecording}
                className="scale-75"
              />
            </div>
          </>
        )}
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="p-3 max-h-[500px] overflow-y-auto">
          {/* Core Web Vitals */}
          <div className="mb-4">
            <h4 className="font-bold mb-2">Core Web Vitals</h4>
            <div className="rounded-md border border-gray-600">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-300 p-1">Metric</TableHead>
                    <TableHead className="text-gray-300 p-1 text-right">Value</TableHead>
                    <TableHead className="text-gray-300 p-1">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['LCP', 'FID', 'CLS'].map(name => {
                    const metric = metrics.find(m => m.name === name);
                    return (
                      <TableRow key={name} className="border-gray-600">
                        <TableCell className="p-1">{name}</TableCell>
                        <TableCell className="p-1 text-right">
                          {metric ? formatMetricValue(name, metric.value) : '-'}
                        </TableCell>
                        <TableCell className="p-1">
                          {metric && (
                            <Badge
                              variant={getRatingVariant(metric.rating)}
                              className="text-xs"
                            >
                              {metric.rating}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator className="my-3 bg-gray-600" />

          {/* Custom Performance Metrics */}
          <div className="mb-4">
            <h4 className="font-bold mb-2">Custom Metrics</h4>
            <div className="rounded-md border border-gray-600">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-300 p-1">Metric</TableHead>
                    <TableHead className="text-gray-300 p-1 text-right">Value</TableHead>
                    <TableHead className="text-gray-300 p-1">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics
                    .filter(m => !['LCP', 'FID', 'CLS'].includes(m.name))
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 5)
                    .map(metric => (
                      <TableRow key={metric.name} className="border-gray-600">
                        <TableCell className="p-1 text-xs">{metric.name}</TableCell>
                        <TableCell className="p-1 text-xs text-right">
                          {formatMetricValue(metric.name, metric.value)}
                        </TableCell>
                        <TableCell className="p-1">
                          <Badge
                            variant={getRatingVariant(metric.rating)}
                            className="text-xs"
                          >
                            {metric.rating}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator className="my-3 bg-gray-600" />

          {/* Device Info */}
          <div>
            <h4 className="font-bold mb-2">Device Info</h4>
            {deviceInfo && (
              <div className="space-y-1">
                <p className="text-xs">
                  Device: {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'}
                </p>
                <p className="text-xs flex items-center">
                  Performance: {deviceInfo.performanceClass}
                  {deviceInfo.isLowEndDevice && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      Low-End
                    </Badge>
                  )}
                </p>
                <p className="text-xs">
                  Screen: {deviceInfo.viewport.width}x{deviceInfo.viewport.height} ({deviceInfo.pixelRatio}x)
                </p>
                <p className="text-xs">
                  Network: {mobileOptimizationService.getNetworkStatus().online ? 'Online' : 'Offline'}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default PerformanceAuditOverlay;
