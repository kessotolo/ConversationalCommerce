import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, TextField, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
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
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Violation | null>(null);
    const [resolveNotes, setResolveNotes] = useState('');
    const [filters, setFilters] = useState({ status: '', action: '', severity: '' });

    useEffect(() => {
        fetchViolations();
        fetchStats();
        fetchTrends();
    }, [filters]);

    const fetchViolations = async () => {
        setLoading(true);
        const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
        const res = await axios.get('/api/v1/violation/violations', { params });
        setViolations(res.data);
        setLoading(false);
    };

    const fetchStats = async () => {
        const res = await axios.get('/api/v1/violation/violations/stats');
        setStats(res.data);
    };

    const fetchTrends = async () => {
        const res = await axios.get('/api/v1/violation/violations/trends');
        setTrends(res.data);
    };

    const handleResolve = async () => {
        if (!selected) return;
        await axios.put(`/api/v1/violation/violations/${selected.id}/resolve`, { notes: resolveNotes });
        setSelected(null);
        setResolveNotes('');
        fetchViolations();
        fetchStats();
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Violation Dashboard</Typography>
            {stats && (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6">Statistics</Typography>
                    <Box sx={{ display: 'flex', gap: 4 }}>
                        <Box>Total: {stats.total}</Box>
                        <Box>Active: {stats.by_status?.active || 0}</Box>
                        <Box>Resolved: {stats.by_status?.resolved || 0}</Box>
                        <Box>By Severity: {Object.entries(stats.by_severity).map(([k, v]) => `${k}: ${v}`).join(', ')}</Box>
                    </Box>
                </Paper>
            )}
            {trends.length > 0 && (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6">Trends (last 30 days)</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {trends.map(t => (
                            <Box key={t.date} sx={{ textAlign: 'center' }}>
                                <div>{t.date}</div>
                                <div>{t.count}</div>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}
            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} displayEmpty>
                        <MenuItem value=''>All Status</MenuItem>
                        <MenuItem value='active'>Active</MenuItem>
                        <MenuItem value='resolved'>Resolved</MenuItem>
                    </Select>
                    <Select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} displayEmpty>
                        <MenuItem value=''>All Actions</MenuItem>
                        <MenuItem value='warning'>Warning</MenuItem>
                        <MenuItem value='temp_ban'>Temp Ban</MenuItem>
                        <MenuItem value='perm_ban'>Perm Ban</MenuItem>
                    </Select>
                    <Select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))} displayEmpty>
                        <MenuItem value=''>All Severity</MenuItem>
                        <MenuItem value='low'>Low</MenuItem>
                        <MenuItem value='medium'>Medium</MenuItem>
                        <MenuItem value='high'>High</MenuItem>
                        <MenuItem value='critical'>Critical</MenuItem>
                    </Select>
                </Box>
                {loading ? <CircularProgress /> : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Severity</TableCell>
                                <TableCell>Action</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Start</TableCell>
                                <TableCell>End</TableCell>
                                <TableCell>Details</TableCell>
                                <TableCell>Resolve</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {violations.map(v => (
                                <TableRow key={v.id}>
                                    <TableCell>{v.id.slice(0, 8)}</TableCell>
                                    <TableCell>{v.user_id || '-'}</TableCell>
                                    <TableCell>{v.type}</TableCell>
                                    <TableCell>{v.severity}</TableCell>
                                    <TableCell>{v.action}</TableCell>
                                    <TableCell>{v.status}</TableCell>
                                    <TableCell>{v.start_at.slice(0, 10)}</TableCell>
                                    <TableCell>{v.end_at ? v.end_at.slice(0, 10) : '-'}</TableCell>
                                    <TableCell>
                                        <Button size="small" onClick={() => setSelected(v)}>View</Button>
                                    </TableCell>
                                    <TableCell>
                                        {v.status === 'active' && (
                                            <Button size="small" color="success" onClick={() => setSelected(v)}>Resolve</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>
            <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
                <DialogTitle>Violation Details</DialogTitle>
                <DialogContent>
                    {selected && (
                        <Box>
                            <Typography>ID: {selected.id}</Typography>
                            <Typography>User: {selected.user_id}</Typography>
                            <Typography>Type: {selected.type}</Typography>
                            <Typography>Severity: {selected.severity}</Typography>
                            <Typography>Action: {selected.action}</Typography>
                            <Typography>Status: {selected.status}</Typography>
                            <Typography>Reason: {selected.reason}</Typography>
                            <Typography>Start: {selected.start_at}</Typography>
                            <Typography>End: {selected.end_at || '-'}</Typography>
                            <Typography>Details:</Typography>
                            <pre style={{ background: '#eee', padding: 8 }}>{JSON.stringify(selected.details, null, 2)}</pre>
                            {selected.status === 'active' && (
                                <TextField
                                    label="Resolution Notes"
                                    value={resolveNotes}
                                    onChange={e => setResolveNotes(e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    sx={{ mt: 2 }}
                                />
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelected(null)}>Close</Button>
                    {selected && selected.status === 'active' && (
                        <Button onClick={handleResolve} color="success">Resolve</Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ViolationDashboard;