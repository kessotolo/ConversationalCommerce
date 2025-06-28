import React from 'react';
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Custom render function that can include providers, context, etc.
 * Extend this as needed when the app grows with more providers
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { ...options });
};

/**
 * Helper to find and interact with form fields by label text
 */
const fillFormField = async (labelText: string | RegExp, value: string) => {
  const input = screen.getByLabelText(labelText);
  userEvent.clear(input);
  userEvent.type(input, value);
  return input;
};

/**
 * Helper to submit a form safely with proper error handling
 */
const submitForm = async () => {
  // First try to find by role with name
  let submitButton = screen.queryByRole('button', { name: /submit|next|continue|save/i });
  
  // If not found, try by type="submit"
  if (!submitButton) {
    const form = document.querySelector('form');
    if (!form) throw new Error('Form not found');
    
    submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) throw new Error('Submit button not found');
  }
  
  userEvent.click(submitButton);
};

/**
 * Helper to wait for text with customizable timeout
 */
const waitForText = async (text: string | RegExp, options = { timeout: 3000 }) => {
  return waitFor(() => {
    // First try exact match
    const exactMatch = screen.queryByText(text);
    if (exactMatch) return exactMatch;
    
    // Then try to find by content matcher if regex
    if (text instanceof RegExp) {
      const allTexts = screen.queryAllByText(text);
      if (allTexts.length > 0) return allTexts[0];
    }
    
    throw new Error(`Text not found: ${text}`);
  }, options);
};

/**
 * Helper to test steps in a multi-step form or wizard
 */
const testWizardStep = async ({
  stepName,
  fillData,
  verifyBeforeSubmit,
  verifyAfterSubmit,
}: {
  stepName: string;
  fillData: Record<string, string>;
  verifyBeforeSubmit?: () => void | Promise<void>;
  verifyAfterSubmit?: () => void | Promise<void>;
}) => {
  console.log(`Testing wizard step: ${stepName}`);
  
  // Fill in all form fields
  for (const [label, value] of Object.entries(fillData)) {
    await fillFormField(new RegExp(label, 'i'), value);
  }
  
  // Run verification before submission if provided
  if (verifyBeforeSubmit) {
    await verifyBeforeSubmit();
  }
  
  // Submit the form
  await submitForm();
  
  // Run verification after submission if provided
  if (verifyAfterSubmit) {
    await verifyAfterSubmit();
  }
};

/**
 * Helper to handle file uploads in tests
 */
const uploadFile = async (labelText: string | RegExp, file: File) => {
  const input = screen.getByLabelText(labelText) as HTMLInputElement;
  const dataTransfer = {
    files: [file],
  };
  
  userEvent.upload(input, file);
  return input;
};

/**
 * Helper to create a mock file for testing
 */
const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['dummy content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export {
  customRender as render,
  fillFormField,
  submitForm,
  waitForText,
  testWizardStep,
  uploadFile,
  createMockFile,
};

// Re-export everything from testing-library
export * from '@testing-library/react';
