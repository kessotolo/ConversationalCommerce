import { FC } from 'react';// Removed invalid Record importimport * as React from 'react';
import { TextField } from '@mui/material';import { Violation, ViolationStats, ViolationTrend } from '@/components/monitoring/ViolationDashboard';
import { Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Select, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';import { User } from 'lucide-react';
import { 
    Box, 
    Typography, 
    Paper, 
    Table, 
    TableHead, 
    TableRow, 
    TableCell, 
    TableBody, 
    Button, 
    TextField, 
    Select, 
    MenuItem, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    CircularProgress,
    Chip
} from '@mui/material';
import axios from 'axios';

interface Violation {
    id: string;
    type: string;
    severity: string;
    action: string;
    status: string;
    reason?: string;
    details?: any;
    start_at: string;
    end_at?: string;
    user_id?: string;
    detection_id?: string;
    created_at: string;
    updated_at: string;
}

interface ViolationStats {
    total: number;
    by_type: Record<string, number>;
    by_severity: Record<string, number>;
    by_action: Record<string, number>;
    by_status: Record<string, number>;
}

interface ViolationTrend {
    date: string;
    count: number;
}

const ViolationDashboard: React.FC = () => {
    const [violations, setViolations] = useState<Violation[]>([]);
    const [stats, setStats] = useState<ViolationStats | null>(null);
    const [trends, setTrends] = useState<ViolationTrend[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        action: '',
        severity: '',
        type: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const tenantId = localStorage.getItem('tenant_id') || '';
                const query = new URLSearchParams(filters as Record<string, string>).toString();
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
                
                const [violationsRes, statsRes, trendsRes] = await Promise.all([
                    fetch(`${baseUrl}/api/v1/monitoring/violations?tenant_id=${tenantId}&${query}`).then(res => res.json()),
                    fetch(`${baseUrl}/api/v1/monitoring/violations/stats?tenant_id=${tenantId}`).then(res => res.json()),
                    fetch(`${baseUrl}/api/v1/monitoring/violations/trends?tenant_id=${tenantId}`).then(res => res.json())
                ]);

                setViolations(violationsRes);
                setStats(statsRes);
                setTrends(trendsRes);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        // Only run in browser environment
        if (typeof window !== 'undefined') {
            fetchData();
        }
    }, [filters]);

    const handleViewDetails = (violation: Violation) => {
        setSelectedViolation(violation);
        setDetailDialogOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailDialogOpen(false);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'critical': return 'error';
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'default';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': return 'error';
            case 'resolved': return 'success';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Security Violations Dashboard</Typography>
            
            {stats && (
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Paper sx={{ p: 2, flexGrow: 1 }}>
                        <Typography variant="subtitle1">Total Violations</Typography>
                        <Typography variant="h4">{stats.total}</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, flexGrow: 1 }}>
                        <Typography variant="subtitle1">Active</Typography>
                        <Typography variant="h4">{stats.by_status.active || 0}</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, flexGrow: 1 }}>
                        <Typography variant="subtitle1">Critical</Typography>
                        <Typography variant="h4">{stats.by_severity.critical || 0}</Typography>
                    </Paper>
                </Box>
            )}
            
            {trends.length > 0 && (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6">Trends (last 30 days)</Typography>
                    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', py: 2 }}>
                        {trends.map(t => (
                            <Box key={t.date} sx={{ textAlign: 'center', minWidth: '60px' }}>
                                <Typography variant="caption">{t.date}</Typography>
                                <Typography>{t.count}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}
            
            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Select 
                        value={filters.status} 
                        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} 
                        displayEmpty
                        size="small"
                    >
                        <MenuItem value=''>All Status</MenuItem>
                        <MenuItem value='active'>Active</MenuItem>
                        <MenuItem value='resolved'>Resolved</MenuItem>
                    </Select>
                    
                    <Select 
                        value={filters.action} 
                        onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} 
                        displayEmpty
                        size="small"
                    >
                        <MenuItem value=''>All Actions</MenuItem>
                        <MenuItem value='warning'>Warning</MenuItem>
                        <MenuItem value='temp_ban'>Temp Ban</MenuItem>
                        <MenuItem value='perm_ban'>Perm Ban</MenuItem>
                    </Select>
                    
                    <Select 
                        value={filters.severity} 
                        onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))} 
                        displayEmpty
                        size="small"
                    >
                        <MenuItem value=''>All Severity</MenuItem>
                        <MenuItem value='low'>Low</MenuItem>
                        <MenuItem value='medium'>Medium</MenuItem>
                        <MenuItem value='high'>High</MenuItem>
                        <MenuItem value='critical'>Critical</MenuItem>
                    </Select>
                    
                    <Select 
                        value={filters.type} 
                        onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} 
                        displayEmpty
                        size="small"
                    >
                        <MenuItem value=''>All Types</MenuItem>
                        <MenuItem value='rate_limit'>Rate Limit</MenuItem>
                        <MenuItem value='suspicious_access'>Suspicious Access</MenuItem>
                        <MenuItem value='data_leak'>Data Leak</MenuItem>
                    </Select>
                </Box>
                
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Severity</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {violations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">No violations found</TableCell>
                            </TableRow>
                        ) : (
                            violations.map(v => (
                                <TableRow key={v.id}>
                                    <TableCell>{v.id.substring(0, 8)}</TableCell>
                                    <TableCell>{v.type}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={v.severity} 
                                            size="small" 
                                            color={getSeverityColor(v.severity) as any}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={v.status} 
                                            size="small" 
                                            color={getStatusColor(v.status) as any}
                                        />
                                    </TableCell>
                                    <TableCell>{v.user_id || 'N/A'}</TableCell>
                                    <TableCell>{new Date(v.created_at).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            onClick={() => handleViewDetails(v)}
                                        >
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Paper>
            
            <Dialog open={detailDialogOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
                <DialogTitle>Violation Details</DialogTitle>
                <DialogContent>
                    {selectedViolation && (
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="subtitle1">ID: {selectedViolation.id}</Typography>
                            <Typography variant="subtitle1">Type: {selectedViolation.type}</Typography>
                            <Typography variant="subtitle1">Severity: {selectedViolation.severity}</Typography>
                            <Typography variant="subtitle1">Status: {selectedViolation.status}</Typography>
                            <Typography variant="subtitle1">Action: {selectedViolation.action}</Typography>
                            {selectedViolation.reason && (
                                <Typography variant="subtitle1">Reason: {selectedViolation.reason}</Typography>
                            )}
                            <Typography variant="subtitle1">Start: {new Date(selectedViolation.start_at).toLocaleString()}</Typography>
                            {selectedViolation.end_at && (
                                <Typography variant="subtitle1">End: {new Date(selectedViolation.end_at).toLocaleString()}</Typography>
                            )}
                            {selectedViolation.details && (
                                <>
                                    <Typography variant="subtitle1" sx={{ mt: 2 }}>Details:</Typography>
                                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                            {JSON.stringify(selectedViolation.details, null, 2)}
                                        </pre>
                                    </Paper>
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetails}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ViolationDashboard;
