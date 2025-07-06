import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';

import type { Rule } from '@/modules/monitoring/models/rule';
import { RuleSeverity } from '@/modules/monitoring/models/rule';

interface RulesManagerProps {
  tenantId: string;
}

const RulesManager: React.FC<RulesManagerProps> = ({ tenantId }) => {
  const [rules, setRules] = useState<Rule<unknown>[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule<unknown> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
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

  const handleDeleteClick = (ruleId: string) => {
    setRuleToDelete(ruleId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    try {
      const response = await fetch(`/api/v1/monitoring/rules/${ruleToDelete}?tenant_id=${tenantId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    } finally {
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const getSeverityVariant = (severity: RuleSeverity): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case RuleSeverity.LOW:
        return 'outline';
      case RuleSeverity.MEDIUM:
        return 'secondary';
      case RuleSeverity.HIGH:
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Alert Rules</h1>
        </div>
        <Button onClick={() => handleOpenDialog()} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Rule</span>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rules configured</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first alert rule.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                      <Badge variant={getSeverityVariant(rule.severity)}>
                        {rule.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(rule)}
                      className="flex items-center space-x-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(rule.id)}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter rule name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter rule description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value as RuleSeverity })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RuleSeverity.LOW}>Low</SelectItem>
                  <SelectItem value={RuleSeverity.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={RuleSeverity.HIGH}>High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the alert rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RulesManager;
