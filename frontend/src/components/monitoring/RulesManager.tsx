import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';

import type { Rule } from '@/modules/monitoring/models/rule';
import { RuleSeverity } from '@/modules/monitoring/models/rule';

interface RulesManagerProps {
  tenantId: string;
}

const RulesManager: React.FC<RulesManagerProps> = ({ tenantId }) => {
  const [rules, setRules] = useState<Rule<unknown>[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule<unknown> | null>(null);
  const [formData, setFormData] = useState<Partial<Rule<unknown>>>({
    name: '',
    description: '',
    severity: RuleSeverity.MEDIUM,
    conditions: [],
  });

  useEffect(() => {
    fetchRules();
    // tenantId is referenced in fetchRules but since it's not going to change
    // and is part of the component scope, we don't need it as a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch(`/api/v1/monitoring/rules?tenant_id=${tenantId}`);
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  const handleOpenDialog = (rule?: Rule<unknown>) => {
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
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
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(rule.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText primary={rule.name} secondary={rule.description} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
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
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value as RuleSeverity })
                }
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
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RulesManager;
