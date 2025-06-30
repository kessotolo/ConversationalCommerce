import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Textarea,
  Switch,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  HStack,
  useToast,
  Divider,
  Heading,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
} from '@chakra-ui/react';
import { SettingsService } from '../services/SettingsService';
import { Setting, SettingComponentType, SettingValidationResult } from '../models/settings';

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
  const toast = useToast();
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
        status: 'success',
        duration: 5000,
        isClosable: true,
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
          />
        );
        break;
        
      case SettingComponentType.NUMBER:
        inputElement = (
          <NumberInput
            value={value ?? 0}
            onChange={(valueString) => handleChange(key, parseFloat(valueString))}
            min={setting.schema?.minimum}
            max={setting.schema?.maximum}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        );
        break;
        
      case SettingComponentType.TOGGLE:
        inputElement = (
          <Switch
            isChecked={Boolean(value)}
            onChange={(e) => handleChange(key, e.target.checked)}
          />
        );
        break;
        
      case SettingComponentType.SELECT:
        if (setting.schema?.enum) {
          inputElement = (
            <Select
              value={value || ''}
              onChange={(e) => handleChange(key, e.target.value)}
            >
              {setting.schema.enum.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          );
        } else {
          inputElement = <Input value="Invalid select options" isReadOnly />;
        }
        break;
        
      case SettingComponentType.PASSWORD:
        inputElement = (
          <Input
            type="password"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={description}
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
          />
        );
    }
    
    return (
      <FormControl key={key} isInvalid={Boolean(error)} isRequired={isRequired} mb={4}>
        <FormLabel>{setting.description || setting.key}</FormLabel>
        {inputElement}
        {error ? (
          <FormErrorMessage>{error}</FormErrorMessage>
        ) : (
          description && <FormHelperText>{description}</FormHelperText>
        )}
      </FormControl>
    );
  };
  
  // Group settings by UI order for better organization
  const sortedSettings = [...settings].sort((a, b) => a.uiOrder - b.uiOrder);
  
  return (
    <Card variant="outline">
      {title && (
        <CardHeader>
          <Heading size="md">{title}</Heading>
          {description && <Box mt={2}>{description}</Box>}
        </CardHeader>
      )}
      
      <CardBody>
        <form onSubmit={handleSubmit}>
          {serverError && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          
          <VStack spacing={4} align="stretch">
            {sortedSettings.map(renderFormControl)}
          </VStack>
          
          <Box mt={6}>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={isSubmitting}
              loadingText="Saving..."
              mr={4}
            >
              {submitLabel}
            </Button>
            <Button
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
              isDisabled={isSubmitting}
            >
              Reset
            </Button>
          </Box>
        </form>
      </CardBody>
    </Card>
  );
};

export default SettingsForm;
