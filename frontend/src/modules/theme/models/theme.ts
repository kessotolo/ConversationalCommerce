import type { Entity, UUID } from '@/modules/core/models/base';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  error: string;
  success: string;
  warning: string;
}

export interface ThemeTypography {
  fontFamily: {
    heading: string;
    body: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeight: {
    none: string;
    tight: string;
    normal: string;
    relaxed: string;
    loose: string;
  };
}

export interface ThemeLayout {
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  maxWidth: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
}

export interface ThemeComponentStyles {
  button: {
    primary: {
      background: string;
      text: string;
      border: string;
      hoverBackground: string;
      hoverText: string;
      hoverBorder: string;
      borderRadius: string;
      padding: string;
    };
    secondary: {
      background: string;
      text: string;
      border: string;
      hoverBackground: string;
      hoverText: string;
      hoverBorder: string;
      borderRadius: string;
      padding: string;
    };
  };
  card: {
    background: string;
    text: string;
    border: string;
    borderRadius: string;
    shadow: string;
    padding: string;
  };
  form: {
    input: {
      background: string;
      text: string;
      border: string;
      borderRadius: string;
      padding: string;
      focusBorder: string;
    };
    label: {
      text: string;
      fontSize: string;
      marginBottom: string;
    };
  };
  navigation: {
    background: string;
    text: string;
    activeText: string;
    hoverText: string;
    borderBottom: string;
  };
}

export interface Theme extends Entity {
  name: string;
  description?: string;
  subdomain?: string;
  tenant_id?: UUID; // Optional for global themes
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  componentStyles: ThemeComponentStyles;
}
