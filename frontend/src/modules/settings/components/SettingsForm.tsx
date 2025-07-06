import React, { useState } from 'react';
import { SettingsService } from '../services/SettingsService';
import { Setting, SettingComponentType, SettingValidationResult } from '../models/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsFormProps {
  domainName: string;
  settings: Setting[];
  title?: string;
  description?: string;
  submitLabel?: string;
  onSaved?: () => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  domainName,
  settings,
  title = 'Settings',
  description,
  submitLabel = 'Save Settings',
  onSaved,
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    // Initialize form values from settings
    const initialValues: Record<string, any> = {};
    settings.forEach((setting) => {
      initialValues[setting.key] = setting.value !== null ? setting.value : setting.defaultValue;
    });
    return initialValues;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { toast } = useToast();
  const settingsService = new SettingsService();

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Clear error for this field when it changes
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateForm = async (): Promise<boolean> => {
    // Client-side validation
    const newErrors: Record<string, string> = {};

    settings.forEach((setting) => {
      const value = formValues[setting.key];

      // Check required fields
      if (setting.isRequired && (value === null || value === undefined || value === '')) {
        newErrors[setting.key] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    // Server-side validation using JSON Schema
    try {
      const validationResult: SettingValidationResult = await settingsService.validateSettings(
        formValues,
        domainName
      );

      if (!validationResult.valid) {
        const serverErrors: Record<string, string> = {};
        validationResult.errors.forEach((error) => {
          serverErrors[error.key] = error.error;
        });
        setErrors(serverErrors);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      setServerError('Failed to validate settings. Please try again.');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setServerError(null);

    try {
      const isValid = await validateForm();
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }

      // Save settings using bulk update
      await settingsService.bulkUpdateSettings(formValues, domainName);

      toast({
        title: 'Settings saved',
        description: 'Your settings have been saved successfully.',
      });

      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setServerError('Failed to save settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormControl = (setting: Setting) => {
    const { key, description, uiComponent, valueType, isRequired } = setting;
    const value = formValues[key] ?? '';
    const error = errors[key];

    let inputElement;

    switch (uiComponent) {
      case SettingComponentType.TEXTAREA:
        inputElement = (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={description}
            className={cn(error && "border-red-500")}
          />
        );
        break;

      case SettingComponentType.NUMBER:
        inputElement = (
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const currentValue = Number(value) || 0;
                const minValue = setting.schema?.minimum ?? -Infinity;
                handleChange(key, Math.max(currentValue - 1, minValue));
              }}
              disabled={setting.schema?.minimum !== undefined && Number(value) <= setting.schema.minimum}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={value ?? 0}
              onChange={(e) => handleChange(key, parseFloat(e.target.value) || 0)}
              min={setting.schema?.minimum}
              max={setting.schema?.maximum}
              className={cn("text-center", error && "border-red-500")}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const currentValue = Number(value) || 0;
                const maxValue = setting.schema?.maximum ?? Infinity;
                handleChange(key, Math.min(currentValue + 1, maxValue));
              }}
              disabled={setting.schema?.maximum !== undefined && Number(value) >= setting.schema.maximum}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        );
        break;

      case SettingComponentType.TOGGLE:
        inputElement = (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => handleChange(key, checked)}
          />
        );
        break;

      case SettingComponentType.SELECT:
        if (setting.schema?.enum) {
          inputElement = (
            <Select value={value || ''} onValueChange={(selectedValue) => handleChange(key, selectedValue)}>
              <SelectTrigger className={cn(error && "border-red-500")}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {setting.schema.enum.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        } else {
          inputElement = <Input value="Invalid select options" readOnly className="bg-gray-100" />;
        }
        break;

      case SettingComponentType.PASSWORD:
        inputElement = (
          <Input
            type="password"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={description}
            className={cn(error && "border-red-500")}
          />
        );
        break;

      // Default to text input
      default:
        inputElement = (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={description}
            className={cn(error && "border-red-500")}
          />
        );
    }

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key} className={cn(isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
          {setting.description || setting.key}
        </Label>
        {inputElement}
        {error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : (
          description && <p className="text-gray-500 text-sm">{description}</p>
        )}
      </div>
    );
  };

  // Group settings by UI order for better organization
  const sortedSettings = [...settings].sort((a, b) => a.uiOrder - b.uiOrder);

  return (
    <Card className="border">
      {title && (
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <p className="text-gray-600 mt-2">{description}</p>}
        </CardHeader>
      )}

      <CardContent>
        <form onSubmit={handleSubmit}>
          {serverError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {sortedSettings.map(renderFormControl)}
          </div>

          <Separator className="my-6" />

          <div className="flex space-x-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Reset form to initial values
                const initialValues: Record<string, any> = {};
                settings.forEach((setting) => {
                  initialValues[setting.key] = setting.value !== null ? setting.value : setting.defaultValue;
                });
                setFormValues(initialValues);
                setErrors({});
              }}
              disabled={isSubmitting}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SettingsForm;
