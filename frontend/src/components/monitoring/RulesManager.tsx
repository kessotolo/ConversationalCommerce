import React, { FC, Partial } from 'react';
import * as React from 'react';
import { Alert } from '@mui/material';import { RulesManagerProps } from '@/components/monitoring/RulesManager';

import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, List, ListItem, ListItemText, MenuItem, Paper, Select, TextField, Typography } from '@mui/material';
import { AddIcon, DeleteIcon, EditIcon } from '@mui/icons-material';import { Save } from 'lucide-react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Chip,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { Rule, RuleSeverity } from '../../types/monitoring';

interface RulesManagerProps {
    tenantId: string;
}

const RulesManager: React.FC<RulesManagerProps> = ({ tenantId }) => {
    const [rules, setRules] = useState<Rule[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRule, setEditingRule] = useState<Rule | null>(null);
    const [formData, setFormData] = useState<Partial<Rule>>({
        name: '',
        description: '',
        severity: RuleSeverity.MEDIUM,
        conditions: [],
    });

    useEffect(() => {
        fetchRules();
    }, [tenantId]);

    const fetchRules = async () => {
        try {
            const response = await fetch(`/api/v1/monitoring/rules?tenant_id=${tenantId}`);
            const data = await response.json();
            setRules(data);
        } catch (error) {
            console.error('Error fetching rules:', error);
        }
    };

    const handleOpenDialog = (rule?: Rule) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({ ...rule });
        } else {
            setEditingRule(null);
            setFormData({
                name: '',
                description: '',
                severity: RuleSeverity.MEDIUM,
                conditions: [],
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleSave = async () => {
        try {
            const method = editingRule ? 'PUT' : 'POST';
            const url = editingRule
                ? `/api/v1/monitoring/rules/${editingRule.id}?tenant_id=${tenantId}`
                : `/api/v1/monitoring/rules?tenant_id=${tenantId}`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    tenant_id: tenantId,
                }),
            });

            if (response.ok) {
                fetchRules();
                handleCloseDialog();
            }
        } catch (error) {
            console.error('Error saving rule:', error);
        }
    };

    const handleDelete = async (ruleId: string) => {
        if (window.confirm('Are you sure you want to delete this rule?')) {
            try {
                const response = await fetch(`/api/v1/monitoring/rules/${ruleId}?tenant_id=${tenantId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    fetchRules();
                }
            } catch (error) {
                console.error('Error deleting rule:', error);
            }
        }
    };

    const getSeverityColor = (severity: RuleSeverity) => {
        switch (severity) {
            case RuleSeverity.LOW:
                return 'info';
            case RuleSeverity.MEDIUM:
                return 'warning';
            case RuleSeverity.HIGH:
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5">Alert Rules</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Rule
                </Button>
            </Box>

            <Paper>
                <List>
                    {rules.map((rule) => (
                        <ListItem
                            key={rule.id}
                            secondaryAction={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Chip
                                        label={rule.severity}
                                        color={getSeverityColor(rule.severity)}
                                        size="small"
                                        sx={{ mr: 1 }}
                                    />
                                    <IconButton
                                        edge="end"
                                        aria-label="edit"
                                        onClick={() => handleOpenDialog(rule)}
                                        sx={{ mr: 1 }}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={() => handleDelete(rule.id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            }
                        >
                            <ListItemText
                                primary={rule.name}
                                secondary={rule.description}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingRule ? 'Edit Rule' : 'Create Rule'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <TextField
                            label="Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Severity</InputLabel>
                            <Select
                                value={formData.severity}
                                label="Severity"
                                onChange={(e) => setFormData({ ...formData, severity: e.target.value as RuleSeverity })}
                            >
                                <MenuItem value={RuleSeverity.LOW}>Low</MenuItem>
                                <MenuItem value={RuleSeverity.MEDIUM}>Medium</MenuItem>
                                <MenuItem value={RuleSeverity.HIGH}>High</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RulesManager;
