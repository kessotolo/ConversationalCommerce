'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Search,
    Clock,
    X,
    Building2,
    Users,
    ShoppingCart,
    Package,
    Activity,
    ExternalLink,
    AlertTriangle
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
    metadata?: Record<string, unknown>;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModule, setSelectedModule] = useState('all');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
        setError(null);

        try {
            const params = new URLSearchParams({
                query: searchQuery,
                ...(selectedModule !== 'all' && { modules: selectedModule })
            });

            const response = await fetch(`/api/admin/search?${params}`);
            if (response.ok) {
                const data: { results: SearchResult[] } = await response.json();
                setResults(data.results || []);

                // Add to search history
                if (!searchHistory.includes(searchQuery)) {
                    setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
                }
            } else {
                throw new Error(`Search failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Search error:', error);
            setError(error instanceof Error ? error.message : 'Search failed. Please try again.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    const getModuleIcon = (module: string) => {
        switch (module) {
            case 'tenants':
                return <Building2 className="h-4 w-4" aria-hidden="true" />;
            case 'users':
                return <Users className="h-4 w-4" aria-hidden="true" />;
            case 'orders':
                return <ShoppingCart className="h-4 w-4" aria-hidden="true" />;
            case 'products':
                return <Package className="h-4 w-4" aria-hidden="true" />;
            case 'audit_logs':
                return <Activity className="h-4 w-4" aria-hidden="true" />;
            default:
                return <Search className="h-4 w-4" aria-hidden="true" />;
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
        setError(null);
    };

    const handleHistoryClick = (query: string) => {
        setSearchQuery(query);
        handleSearch();
    };

    const handleResultClick = (result: SearchResult) => {
        // Open result in new tab or navigate
        window.open(result.url, '_blank');
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
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <Input
                                placeholder="Search across all modules..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="pl-9 pr-8"
                                aria-label="Search query"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearSearch}
                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                    aria-label="Clear search"
                                >
                                    <X className="h-3 w-3" aria-hidden="true" />
                                </Button>
                            )}
                        </div>

                        <Select value={selectedModule} onValueChange={setSelectedModule}>
                            <SelectTrigger className="w-40" aria-label="Select module">
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

                        <Button
                            onClick={handleSearch}
                            disabled={loading || !searchQuery.trim()}
                            aria-label="Search"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

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
                                        aria-label={`Search for ${query}`}
                                    >
                                        <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                                        {query}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {results.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                                Results ({results.length})
                            </h4>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {results.map((result) => (
                                    <div
                                        key={result.id}
                                        className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => handleResultClick(result)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleResultClick(result);
                                            }
                                        }}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`Open ${result.title}`}
                                    >
                                        <div className="flex-shrink-0">
                                            {getModuleIcon(result.module)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                                    {result.title}
                                                </h4>
                                                <div className="flex items-center space-x-2">
                                                    <Badge className={`text-xs ${getTypeColor(result.type)}`}>
                                                        {result.type}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {result.score.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {result.description}
                                            </p>
                                            {result.tenant_id && (
                                                <div className="flex items-center space-x-1 mt-2">
                                                    <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                                                    <span className="text-xs text-muted-foreground">
                                                        Tenant: {result.tenant_id}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {searchQuery && !loading && results.length === 0 && !error && (
                        <div className="text-center py-8">
                            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                            <p className="text-muted-foreground">
                                Try adjusting your search terms or module filter
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}