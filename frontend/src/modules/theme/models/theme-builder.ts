import type { UUID } from '@/modules/core/models/base';

// Color and Typography Interfaces
export interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text_primary: string;
    text_secondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
}

export interface TypographySettings {
    font_family_primary: string;
    font_family_secondary: string;
    font_size_base: string;
    font_size_h1: string;
    font_size_h2: string;
    font_size_h3: string;
    font_size_h4: string;
    font_size_h5: string;
    font_size_h6: string;
    font_weight_normal: number;
    font_weight_medium: number;
    font_weight_bold: number;
    line_height_base: number;
    letter_spacing_base: string;
}

export interface SpacingConfig {
    spacing_xs: string;
    spacing_sm: string;
    spacing_md: string;
    spacing_lg: string;
    spacing_xl: string;
    spacing_2xl: string;
    spacing_3xl: string;
}

export interface BreakpointConfig {
    mobile: string;
    tablet: string;
    desktop: string;
    wide: string;
}

export interface ThemeSection {
    id: string;
    type: string;
    title?: string;
    visible: boolean;
    order: number;
    config: Record<string, string | number | boolean | string[]>;
}

export interface ThemeLayoutSchema {
    sections: ThemeSection[];
    colors: ColorPalette;
    typography: TypographySettings;
    spacing: SpacingConfig;
    breakpoints: BreakpointConfig;
}

// Theme Version Interfaces
export interface ThemeVersionCreate {
    theme_id: UUID;
    version_number: string;
    name: string;
    description?: string;
    layout: ThemeLayoutSchema;
    is_published: boolean;
    created_by: UUID;
}

export interface ThemeVersionUpdate {
    name?: string;
    description?: string;
    layout?: ThemeLayoutSchema;
    is_published?: boolean;
}

export interface ThemeVersionResponse {
    id: UUID;
    theme_id: UUID;
    version_number: string;
    name: string;
    description?: string;
    layout: ThemeLayoutSchema;
    is_published: boolean;
    created_by: UUID;
    created_at: string;
    updated_at?: string;
}

// Theme Builder Interfaces
export interface ThemeBuilderCreateRequest {
    name: string;
    description?: string;
    template_id?: string;
    layout?: ThemeLayoutSchema;
}

export interface ThemeBuilderUpdateRequest {
    name?: string;
    description?: string;
    layout?: ThemeLayoutSchema;
}

export interface ThemeBuilderResponse {
    id: UUID;
    name: string;
    description?: string;
    layout: ThemeLayoutSchema;
    current_version?: ThemeVersionResponse;
    versions: ThemeVersionResponse[];
    created_at: string;
    updated_at?: string;
}

// WhatsApp Integration Interfaces
export interface WhatsAppThemeCommand {
    command: string;
    theme_name?: string;
    version_name?: string;
}

export interface WhatsAppThemeResponse {
    success: boolean;
    message: string;
    data?: Record<string, string | string[]>;
}

// Theme Builder State Interfaces
export interface ThemeBuilderState {
    layout: ThemeLayoutSchema;
    selected_section?: string;
    preview_device: 'mobile' | 'tablet' | 'desktop';
    is_dirty: boolean;
}

export interface ThemeBuilderAction {
    action_type: string;
    payload: Record<string, string | number | boolean | string[]>;
}

// Preset Templates
export interface ThemeTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    preview_image: string;
    layout: ThemeLayoutSchema;
    tags: string[];
}

// Device Preview Types
export type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

// Color Picker Types
export interface ColorPreset {
    name: string;
    colors: ColorPalette;
}

// Typography Types
export interface FontOption {
    value: string;
    label: string;
    category: string;
}

// Section Types
export interface SectionType {
    id: string;
    name: string;
    description: string;
    icon: string;
    default_config: Record<string, string | number | boolean | string[]>;
}