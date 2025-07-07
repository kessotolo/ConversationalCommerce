'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Search,
    /* Filter, */
    Clock,
    /* Star, */
    X,
    Building2,
    Users,
    ShoppingCart,
    Package,
    Activity,
    ExternalLink
} from 'lucide-react';

interface GlobalSearchProps {
    open: boolean;
    onClose: () => void;
}

interface SearchResult {
    id: string;
    type: string;
    title: string;
    description: string;
    url: string;
    tenant_id?: string;
    module: string;
    score: number;
    metadata?: Record<string, any>;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModule, setSelectedModule] = useState('all');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState([
        'security violations',
        'tenant analytics',
        'user permissions',
        'order reports'
    ]);

    const modules = [
        { value: 'all', label: 'All Modules' },
        { value: 'tenants', label: 'Tenants' },
        { value: 'users', label: 'Users' },
        { value: 'orders', label: 'Orders' },
        { value: 'products', label: 'Products' },
        { value: 'audit_logs', label: 'Audit Logs' }
    ];

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                query: searchQuery,
                ...(selectedModule !== 'all' && { modules: selectedModule })
            });

            const response = await fetch(`/api/admin/search?${params}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data.results || []);

                // Add to search history
                if (!searchHistory.includes(searchQuery)) {
                    setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
                }
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const getModuleIcon = (module: string) => {
        switch (module) {
            case 'tenants':
                return <Building2 className="h-4 w-4" />;
            case 'users':
                return <Users className="h-4 w-4" />;
            case 'orders':
                return <ShoppingCart className="h-4 w-4" />;
            case 'products':
                return <Package className="h-4 w-4" />;
            case 'audit_logs':
                return <Activity className="h-4 w-4" />;
            default:
                return <Search className="h-4 w-4" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'tenant':
                return 'bg-blue-500';
            case 'user':
                return 'bg-green-500';
            case 'order':
                return 'bg-purple-500';
            case 'product':
                return 'bg-orange-500';
            case 'audit_log':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setResults([]);
    };

    const handleHistoryClick = (query: string) => {
        setSearchQuery(query);
        handleSearch();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Global Search</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="flex space-x-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search across all modules..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="pl-9 pr-8"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearSearch}
                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>

                        <Select value={selectedModule} onValueChange={setSelectedModule}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent>
                                {modules.map((module) => (
                                    <SelectItem key={module.value} value={module.value}>
                                        {module.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </div>

                    {/* Search History */}
                    {!searchQuery && searchHistory.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Recent Searches</h4>
                            <div className="flex flex-wrap gap-2">
                                {searchHistory.map((query, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleHistoryClick(query)}
                                        className="text-xs"
                                    >
                                        <Clock className="h-3 w-3 mr-1" />
                                        {query}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {results.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">
                                Search Results ({results.length})
                            </h4>
                            <div className="max-h-96 overflow-auto space-y-2">
                                {results.map((result) => (
                                    <div
                                        key={result.id}
                                        className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="p-2 rounded-full bg-muted">
                                            {getModuleIcon(result.module)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-sm font-medium">{result.title}</h5>
                                                <div className="flex items-center space-x-2">
                                                    <Badge className={getTypeColor(result.type)}>
                                                        {result.type}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {result.module}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <p className="text-sm text-muted-foreground mt-1">
                                                {result.description}
                                            </p>

                                            {result.metadata && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {Object.entries(result.metadata).slice(0, 3).map(([key, value]) => (
                                                        <Badge key={key} variant="outline" className="text-xs">
                                                            {key}: {String(value)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(result.url, '_blank')}
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {searchQuery && !loading && results.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Search className="h-8 w-8 mx-auto mb-2" />
                            <p>No results found for "{searchQuery}"</p>
                            <p className="text-sm">Try different keywords or check your filters</p>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}