import { MessageSquare, Globe, ShoppingBag } from 'lucide-react';

import { CardHeader, CardTitle, CardContent, Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface ChannelData {
  name: string;
  orders: number;
  revenue: number;
  conversion: number;
}

interface ChannelPerformanceProps {
  data: ChannelData[];
  isLoading?: boolean;
}

export function ChannelPerformance({ data, isLoading = false }: ChannelPerformanceProps) {
  const channelIcons = {
    WhatsApp: <MessageSquare className="h-4 w-4 text-green-500" />,
    Web: <Globe className="h-4 w-4 text-blue-500" />,
    'In-store': <ShoppingBag className="h-4 w-4 text-purple-500" />,
  };

  const getChannelIcon = (name: string) => {
    return (
      channelIcons[name as keyof typeof channelIcons] || (
        <ShoppingBag className="h-4 w-4 text-gray-500" />
      )
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                </div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No channel data</p>
        ) : (
          <div className="space-y-4">
            {data.map((channel) => (
              <div key={channel.name} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2 col-span-2">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                    {getChannelIcon(channel.name)}
                  </div>
                  <span className="font-medium">{channel.name}</span>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Orders</p>
                  <p className="font-medium">{channel.orders}</p>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-medium">{formatCurrency(channel.revenue)}</p>
                </div>

                <div className="text-sm col-span-2">
                  <p className="text-muted-foreground">Conversion</p>
                  <p className="font-medium">{channel.conversion}%</p>
                </div>

                <div className="col-span-2 sm:col-span-4 mt-1">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${Math.min(channel.conversion, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
