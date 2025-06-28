/**
 * Core Event Types
 *
 * This file contains type definitions for common DOM events used throughout the application.
 * Centralized here to ensure consistency across components.
 */

import type React from 'react';

// Form Event Types
export type InputChangeEvent = React.ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>;
export type ButtonClickEvent = React.MouseEvent<HTMLButtonElement>;
export type LinkClickEvent = React.MouseEvent<HTMLAnchorElement>;
export type FocusEvent = React.FocusEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;
export type BlurEvent = React.FocusEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;
export type KeyboardEvent = React.KeyboardEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLDivElement
>;

// File Input Event Types
export type FileInputChangeEvent = React.ChangeEvent<HTMLInputElement>;

// Drag and Drop Event Types
export type DragEvent = React.DragEvent<HTMLDivElement>;
export type DropEvent = React.DragEvent<HTMLDivElement>;

// Custom Events for Application-specific actions
export interface CustomChangeEventHandler<T = unknown> {
  (value: T): void;
}
