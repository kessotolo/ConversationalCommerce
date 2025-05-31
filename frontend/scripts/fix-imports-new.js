#!/usr/bin/env node

/**
 * Import Fixer Script
 * Automatically adds missing imports to files in the codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better output formatting
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.cyan}Import Fixer Script${colors.reset}`);
console.log(`${colors.cyan}===================${colors.reset}`);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const pagesDir = path.join(rootDir, 'pages');
const appDir = path.join(srcDir, 'app');
let fixedFiles = 0;
let fixedImports = 0;

// Component import mapping
const componentImportMapping = {
  // Lucide React components
  'Activity': 'lucide-react',
  'AlertTriangle': 'lucide-react',
  'ArrowLeft': 'lucide-react',
  'ArrowRight': 'lucide-react',
  'ArrowUp': 'lucide-react',
  'ArrowDown': 'lucide-react',
  'ArrowUpRight': 'lucide-react',
  'Bell': 'lucide-react',
  'Calendar': 'lucide-react',
  'Camera': 'lucide-react',
  'Check': 'lucide-react',
  'CheckCheck': 'lucide-react',
  'CheckCircle': 'lucide-react',
  'Clock': 'lucide-react',
  'CreditCard': 'lucide-react',
  'DollarSign': 'lucide-react',
  'Download': 'lucide-react',
  'Eye': 'lucide-react',
  'Facebook': 'lucide-react',
  'Globe': 'lucide-react',
  'ImageIcon': 'lucide-react',
  'LogOut': 'lucide-react',
  'MapPin': 'lucide-react',
  'MessageCircle': 'lucide-react',
  'MessageSquare': 'lucide-react',
  'MoreVertical': 'lucide-react',
  'Package': 'lucide-react',
  'Phone': 'lucide-react',
  'Printer': 'lucide-react',
  'QrCode': 'lucide-react',
  'RefreshCw': 'lucide-react',
  'RefreshCcw': 'lucide-react',
  'Save': 'lucide-react',
  'Search': 'lucide-react',
  'Send': 'lucide-react',
  'Settings': 'lucide-react',
  'ShoppingBag': 'lucide-react',
  'Store': 'lucide-react',
  'Truck': 'lucide-react',
  'Twitter': 'lucide-react',
  'Upload': 'lucide-react',
  'User': 'lucide-react',
  'Users': 'lucide-react',
  'Video': 'lucide-react',
  'X': 'lucide-react',
  'Trash2': 'lucide-react',
  'Icon': 'lucide-react',
  'Wifi': 'lucide-react',
  'WifiOff': 'lucide-react',
  'Loader': 'lucide-react',
  'LoaderCircle': 'lucide-react',
  
  // HTML element types
  'HTMLInputElement': 'react',
  'HTMLButtonElement': 'react',
  'HTMLDivElement': 'react',
  'HTMLSpanElement': 'react',
  'HTMLImageElement': 'react',
  'HTMLAnchorElement': 'react',
  'HTMLFormElement': 'react',
  'HTMLHeadingElement': 'react',
  'HTMLParagraphElement': 'react',
  'HTMLTableElement': 'react',
  'HTMLUListElement': 'react',
  'HTMLLIElement': 'react',
  'HTMLSelectElement': 'react',
  'HTMLTextAreaElement': 'react',
  'FormEvent': 'react',
  'ChangeEvent': 'react',
  'MouseEvent': 'react',
  'KeyboardEvent': 'react',
  'FocusEvent': 'react',
  'ReactNode': 'react',
  'ReactElement': 'react',
  'JSX': 'react',
  'CSSProperties': 'react',
  'FC': 'react',
  'useCallback': 'react',
  'useRef': 'react',
  'useReducer': 'react',
  'useMemo': 'react',
  'useLayoutEffect': 'react',
  'useImperativeHandle': 'react',
  'useDebugValue': 'react',
  'useId': 'react',
  'useContext': 'react',
  'useEffect': 'react',
  'useState': 'react',
  
  // Next.js components
  'Link': 'next/link',
  'Image': 'next/image',
  'useRouter': 'next/router',
  'Head': 'next/head',
  'Script': 'next/script',
  
  // Toast and Network components
  'ToastProvider': '@/components/ui/ToastProvider',
  'Toast': '@/components/ui/Toast',
  'useToast': '@/components/ui/UseToast',
  'ToastType': '@/components/ui/UseToast',
  'ToastActionElement': '@/components/ui/UseToast',
  'ToastProps': '@/components/ui/Toast',
  'NetworkStatusIndicator': '@/components/ui/NetworkStatusIndicator',
  'NetworkStatusIndicatorProps': '@/components/ui/NetworkStatusIndicator',
  'useNetworkStatus': '@/contexts/NetworkStatusContext',
  'NetworkStatusProvider': '@/contexts/NetworkStatusContext',
  'NetworkStatusContext': '@/contexts/NetworkStatusContext',
  'NetworkStatusContextType': '@/contexts/NetworkStatusContext',
  'NetworkStatusProviderProps': '@/contexts/NetworkStatusContext',
  
  // Error handling and loading components
  'ErrorBoundary': '@/components/ErrorBoundary',
  'ErrorBoundaryProps': '@/components/ErrorBoundary',
  'ErrorBoundaryState': '@/components/ErrorBoundary',
  'useErrorBoundary': '@/components/ErrorBoundary',
  'ErrorFallback': '@/components/ErrorBoundary',
  'ErrorFallbackProps': '@/components/ErrorBoundary',
  'Skeleton': '@/components/ui/SkeletonLoader',
  'SkeletonProps': '@/components/ui/SkeletonLoader',
  'ProductCardSkeleton': '@/components/ui/SkeletonLoader',
  'OrderCardSkeleton': '@/components/ui/SkeletonLoader',
  'DataTableSkeleton': '@/components/ui/SkeletonLoader',
  'FormSkeleton': '@/components/ui/SkeletonLoader',
  
  // API and Utils
  'ApiClient': '@/utils/apiClient',
  'useApi': '@/utils/apiClient',
  'ApiClientOptions': '@/utils/apiClient',
  
  // UI components
  'Card': '@/components/ui/card',
  'CardHeader': '@/components/ui/card',
  'CardTitle': '@/components/ui/card',
  'CardDescription': '@/components/ui/card',
  'CardContent': '@/components/ui/card',
  'CardFooter': '@/components/ui/card',
  
  // Material UI components
  'Box': '@mui/material',
  'Grid': '@mui/material',
  'Paper': '@mui/material',
  'Typography': '@mui/material',
  'Button': '@mui/material',
  'ButtonGroup': '@mui/material',
  'IconButton': '@mui/material',
  'TextField': '@mui/material',
  'FormControl': '@mui/material',
  'InputLabel': '@mui/material',
  'Select': '@mui/material',
  'MenuItem': '@mui/material',
  'Chip': '@mui/material',
  'Divider': '@mui/material',
  'List': '@mui/material',
  'ListItem': '@mui/material',
  'ListItemIcon': '@mui/material',
  'ListItemText': '@mui/material',
  'Table': '@mui/material',
  'TableHead': '@mui/material',
  'TableBody': '@mui/material',
  'TableRow': '@mui/material',
  'TableCell': '@mui/material',
  'TableContainer': '@mui/material',
  'Dialog': '@mui/material',
  'DialogTitle': '@mui/material',
  'DialogContent': '@mui/material',
  'DialogActions': '@mui/material',
  'Drawer': '@mui/material',
  'Badge': '@mui/material',
  'CircularProgress': '@mui/material',
  'Alert': '@mui/material',
  'Snackbar': '@mui/material',
  
  // Type imports
  'Partial': 'react',
  'Record': 'react',
  
  // Domain types
  'Order': '@/types/Order',
  'Product': '@/types/Product',
  'File': '@/types/File',
  'NewProduct': '@/types/Product',
  'Notification': '@/types/Notification',
  'Violation': '@/components/monitoring/ViolationDashboard',
  'ViolationStats': '@/components/monitoring/ViolationDashboard',
  'ViolationTrend': '@/components/monitoring/ViolationDashboard',
  'Activity': '@/components/monitoring/ActivityDashboard',
  'ActivityStats': '@/components/monitoring/ActivityDashboard',
  'Store': '@/types/Store',
  
  // Custom components
  'StatCard': '@/components/dashboard/StatCard',
  'OnboardingChecklist': '@/components/dashboard/OnboardingChecklist',
  'ActivityEvent': '@/components/admin/ActivityEvent',
  'Navbar': '@/components/Navbar',
  'AddProductModal': '@/components/dashboard/AddProductModal',
  'ShareButtonsProps': '@/components/products/ShareButtons',
  'TikTokIcon': '@/components/icons/TikTokIcon',
  'NotificationCenter': '@/components/monitoring/NotificationCenter',
  'MainLayoutProps': '@/components/layout/MainLayout',
  'ThemeProviderProps': '@/components/ThemeProvider',
  'CustomThemeProvider': '@/components/ThemeProvider',
  'RulesManagerProps': '@/components/monitoring/RulesManager',
  'LayoutEditor': '@/components/StorefrontEditor/LayoutEditor',
  
  // Context types
  'AuthContextType': '@/contexts/AuthContext',
  'AuthUser': '@/contexts/AuthContext',
  'AuthContext': '@/contexts/AuthContext',
  'TenantContextType': '@/contexts/TenantContext',
  'TenantProviderProps': '@/contexts/TenantContext',
  'TenantContext': '@/contexts/TenantContext',
  'ThemeContextType': '@/contexts/ThemeContext',
  'ThemeContext': '@/contexts/ThemeContext',
  
  // Toast components and optimization components
  'ToastContextType': '@/components/ui/ToastProvider',
  'ToastContext': '@/components/ui/ToastProvider',
  'ToasterToast': '@/components/ui/UseToast',
  
  // Image optimization
  'OptimizedImage': '@/components/OptimizedImage',
  'OptimizedImageProps': '@/components/OptimizedImage',
  
  // StorefrontEditor Components
  'StorefrontEditorProps': '@/components/StorefrontEditor/StorefrontEditor',
  'AssetDetailsProps': '@/components/StorefrontEditor/AssetManagement/AssetDetails',
  'AssetFilterBarProps': '@/components/StorefrontEditor/AssetManagement/AssetFilterBar',
  'AssetGridProps': '@/components/StorefrontEditor/AssetManagement/AssetGrid',
  'AssetManagementProps': '@/components/StorefrontEditor/AssetManagement/AssetManagement',
  'AssetUploaderProps': '@/components/StorefrontEditor/AssetManagement/AssetUploader',
  'AssetFilterBar': '@/components/StorefrontEditor/AssetManagement/AssetFilterBar',
  'AssetGrid': '@/components/StorefrontEditor/AssetManagement/AssetGrid',
  'AssetDetails': '@/components/StorefrontEditor/AssetManagement/AssetDetails',
  'AssetUploader': '@/components/StorefrontEditor/AssetManagement/AssetUploader',
  'AssetManagement': '@/components/StorefrontEditor/AssetManagement/AssetManagement',
  'BannerDetailProps': '@/components/StorefrontEditor/BannerLogoManagement/BannerDetail',
  'BannerItemProps': '@/components/StorefrontEditor/BannerLogoManagement/BannerList',
  'BannerListProps': '@/components/StorefrontEditor/BannerLogoManagement/BannerList',
  'BannerLogoManagementProps': '@/components/StorefrontEditor/BannerLogoManagement/BannerLogoManagement',
  'BannerManagementProps': '@/components/StorefrontEditor/BannerLogoManagement/BannerManagement',
  'CreateBannerModalProps': '@/components/StorefrontEditor/BannerLogoManagement/CreateBannerModal',
  'CreateLogoModalProps': '@/components/StorefrontEditor/BannerLogoManagement/CreateLogoModal',
  'LogoDetailProps': '@/components/StorefrontEditor/BannerLogoManagement/LogoDetail',
  'LogoListProps': '@/components/StorefrontEditor/BannerLogoManagement/LogoList',
  'LogoManagementProps': '@/components/StorefrontEditor/BannerLogoManagement/LogoManagement',
  'BannerItem': '@/components/StorefrontEditor/BannerLogoManagement/BannerList',
  'BannerManagement': '@/components/StorefrontEditor/BannerLogoManagement/BannerManagement',
  'LogoManagement': '@/components/StorefrontEditor/BannerLogoManagement/LogoManagement',
  'BannerList': '@/components/StorefrontEditor/BannerLogoManagement/BannerList',
  'BannerDetail': '@/components/StorefrontEditor/BannerLogoManagement/BannerDetail',
  'CreateBannerModal': '@/components/StorefrontEditor/BannerLogoManagement/CreateBannerModal',
  'LogoList': '@/components/StorefrontEditor/BannerLogoManagement/LogoList',
  'LogoDetail': '@/components/StorefrontEditor/BannerLogoManagement/LogoDetail',
  'CreateLogoModal': '@/components/StorefrontEditor/BannerLogoManagement/CreateLogoModal',
  'BannerLogoManagement': '@/components/StorefrontEditor/BannerLogoManagement/BannerLogoManagement',
  'CreateDraftModalProps': '@/components/StorefrontEditor/DraftManagement/CreateDraftModal',
  'DraftDetailProps': '@/components/StorefrontEditor/DraftManagement/DraftDetail',
  'DraftListProps': '@/components/StorefrontEditor/DraftManagement/DraftList',
  'DraftManagementProps': '@/components/StorefrontEditor/DraftManagement/DraftManagement',
  'DraftList': '@/components/StorefrontEditor/DraftManagement/DraftList',
  'DraftDetail': '@/components/StorefrontEditor/DraftManagement/DraftDetail',
  'CreateDraftModal': '@/components/StorefrontEditor/DraftManagement/CreateDraftModal',
  'DraftManagement': '@/components/StorefrontEditor/DraftManagement/DraftManagement',
  'AddUserPermissionProps': '@/components/StorefrontEditor/Permissions/AddUserPermission',
  'PermissionDetailProps': '@/components/StorefrontEditor/Permissions/PermissionDetail',
  'PermissionListProps': '@/components/StorefrontEditor/Permissions/PermissionList',
  'PermissionsProps': '@/components/StorefrontEditor/Permissions/Permissions',
  'PermissionList': '@/components/StorefrontEditor/Permissions/PermissionList',
  'PermissionDetail': '@/components/StorefrontEditor/Permissions/PermissionDetail',
  'AddUserPermission': '@/components/StorefrontEditor/Permissions/AddUserPermission',
  'Permissions': '@/components/StorefrontEditor/Permissions/Permissions',
  'VersionCompareProps': '@/components/StorefrontEditor/VersionHistory/VersionCompare',
  'VersionDetailProps': '@/components/StorefrontEditor/VersionHistory/VersionDetail',
  'VersionHistoryProps': '@/components/StorefrontEditor/VersionHistory/VersionHistory',
  'VersionListProps': '@/components/StorefrontEditor/VersionHistory/VersionList',
  'VersionCompare': '@/components/StorefrontEditor/VersionHistory/VersionCompare',
  'VersionDetail': '@/components/StorefrontEditor/VersionHistory/VersionDetail',
  'VersionHistory': '@/components/StorefrontEditor/VersionHistory/VersionHistory',
  'VersionList': '@/components/StorefrontEditor/VersionHistory/VersionList',
  
  // HeroIcons
  'PhotoIcon': '@heroicons/react/24/outline',
  'FilmIcon': '@heroicons/react/24/outline',
  'DocumentTextIcon': '@heroicons/react/24/outline',
  'DocumentIcon': '@heroicons/react/24/outline',
  'MusicalNoteIcon': '@heroicons/react/24/outline',
  'DocumentPlusIcon': '@heroicons/react/24/outline',
  'XMarkIcon': '@heroicons/react/24/outline',
  'CheckCircleIcon': '@heroicons/react/24/outline',
  'BoltIcon': '@heroicons/react/24/outline',
  'PencilIcon': '@heroicons/react/24/outline',
  'ArrowTopRightOnSquareIcon': '@heroicons/react/24/outline',
  'TrashIcon': '@heroicons/react/24/outline',
  'MagnifyingGlassIcon': '@heroicons/react/24/outline',
  'FunnelIcon': '@heroicons/react/24/outline',
  'Bars3Icon': '@heroicons/react/24/outline',
  'CheckIcon': '@heroicons/react/24/outline',
  'ExclamationTriangleIcon': '@heroicons/react/24/outline',
  'LinkIcon': '@heroicons/react/24/outline',
  'CalendarIcon': '@heroicons/react/24/outline',
  'UserGroupIcon': '@heroicons/react/24/outline',
  'ClockIcon': '@heroicons/react/24/outline',
  'UserIcon': '@heroicons/react/24/outline',
  'TagIcon': '@heroicons/react/24/outline',
  'ClipboardDocumentIcon': '@heroicons/react/24/outline',
  'ArrowUturnLeftIcon': '@heroicons/react/24/outline',
  'ArrowUpTrayIcon': '@heroicons/react/24/outline',
  'ShieldCheckIcon': '@heroicons/react/24/outline',
  'MenuIcon': '@heroicons/react/24/outline',
  
  // Material UI icons
  'ErrorIcon': '@mui/icons-material',
  'WarningIcon': '@mui/icons-material',
  'InfoIcon': '@mui/icons-material',
  'SuccessIcon': '@mui/icons-material',
  'NotificationsIcon': '@mui/icons-material',
  'CloseIcon': '@mui/icons-material',
  'AddIcon': '@mui/icons-material',
  'EditIcon': '@mui/icons-material',
  'DeleteIcon': '@mui/icons-material',
  'RefreshIcon': '@mui/icons-material',
  'Permissions': '@/components/StorefrontEditor/Permissions/Permissions',
  'StorefrontEditorProps': '@/components/StorefrontEditor/StorefrontEditor',
  'VersionCompareProps': '@/components/StorefrontEditor/VersionHistory/VersionCompare',
  'VersionDetailProps': '@/components/StorefrontEditor/VersionHistory/VersionDetail',
  'VersionHistoryProps': '@/components/StorefrontEditor/VersionHistory/VersionHistory',
  'VersionListProps': '@/components/StorefrontEditor/VersionHistory/VersionList',
  'VersionCompare': '@/components/StorefrontEditor/VersionHistory/VersionCompare',
  'VersionDetail': '@/components/StorefrontEditor/VersionHistory/VersionDetail',
  'VersionHistory': '@/components/StorefrontEditor/VersionHistory/VersionHistory',
  'VersionList': '@/components/StorefrontEditor/VersionHistory/VersionList',
  'ThemeProviderProps': '@/components/ThemeProvider',
  'CustomThemeProvider': '@/components/ThemeProvider',
  'MainLayoutProps': '@/components/layout/MainLayout',
  'NotificationCenter': '@/components/monitoring/NotificationCenter',
  'ShareButtonsProps': '@/components/products/ShareButtons',
  'RulesManagerProps': '@/components/monitoring/RulesManager',
  'LayoutEditor': '@/components/StorefrontEditor/LayoutEditor',
  'Violation': '@/components/monitoring/ViolationDashboard',
  'ViolationStats': '@/components/monitoring/ViolationDashboard',
  'ViolationTrend': '@/components/monitoring/ViolationDashboard',
  'ActivityStats': '@/components/monitoring/ActivityDashboard',
  'NewProduct': '@/pages/dashboard/products/add',
  'Icon': '@/components/icons',
  
  // Model types
  'Product': '@/types/product',
  'Order': '@/types/order',
  'Notification': '@/types/notification',
  
  // Heroicons
  'XMarkIcon': '@heroicons/react/24/outline',
  'CheckIcon': '@heroicons/react/24/outline',
  'PencilIcon': '@heroicons/react/24/outline',
  'TrashIcon': '@heroicons/react/24/outline',
  'UserIcon': '@heroicons/react/24/outline',
  'PhoneIcon': '@heroicons/react/24/outline',
  'PhotoIcon': '@heroicons/react/24/outline',
  'FilmIcon': '@heroicons/react/24/outline',
  'DocumentTextIcon': '@heroicons/react/24/outline',
  'DocumentIcon': '@heroicons/react/24/outline',
  'MusicalNoteIcon': '@heroicons/react/24/outline',
  'DocumentPlusIcon': '@heroicons/react/24/outline',
  'ArrowUpTrayIcon': '@heroicons/react/24/outline',
  'ExclamationTriangleIcon': '@heroicons/react/24/outline',
  'LinkIcon': '@heroicons/react/24/outline',
  'CalendarIcon': '@heroicons/react/24/outline',
  'UserGroupIcon': '@heroicons/react/24/outline',
  'Bars3Icon': '@heroicons/react/24/outline',
  'MagnifyingGlassIcon': '@heroicons/react/24/outline',
  'FunnelIcon': '@heroicons/react/24/outline',
  'ClockIcon': '@heroicons/react/24/outline',
  'ShieldCheckIcon': '@heroicons/react/24/outline',
  'TagIcon': '@heroicons/react/24/outline',
  'ClipboardDocumentIcon': '@heroicons/react/24/outline',
  'ArrowUturnLeftIcon': '@heroicons/react/24/outline',
  'ArrowTopRightOnSquareIcon': '@heroicons/react/24/outline',
  'BoltIcon': '@heroicons/react/24/outline',
  'MenuIcon': '@heroicons/react/24/outline',
  'CheckCircleIcon': '@heroicons/react/24/outline',
  
  // MUI Icons
  'ImageIcon': '@mui/icons-material',
  'ErrorIcon': '@mui/icons-material',
  'WarningIcon': '@mui/icons-material',
  'InfoIcon': '@mui/icons-material',
  'SuccessIcon': '@mui/icons-material',
  'NotificationsIcon': '@mui/icons-material',
  'CloseIcon': '@mui/icons-material',
  'AddIcon': '@mui/icons-material',
  'EditIcon': '@mui/icons-material',
  'DeleteIcon': '@mui/icons-material',
  'RefreshIcon': '@mui/icons-material',
};

/**
 * Get all files in a directory recursively
 */
function getAllFiles(dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Extract components used in JSX
 */
function extractComponentsFromJSX(content) {
  // Match JSX opening tags
  const jsxMatches = content.match(/<([A-Z][A-Za-z0-9_]*)/g) || [];
  
  // Match component references in App Router client components
  const componentRefs = content.match(/\W([A-Z][A-Za-z0-9_]*)\s*\(/g) || [];
  const componentRefNames = componentRefs.map(match => match.trim().slice(0, -1).trim());
  
  // Match components referenced directly without JSX tags (common in App Router)
  const namedComponents = content.match(/\b([A-Z][A-Za-z0-9_]*)\b(?!\s*\()/g) || [];
  
  // Create set of unique component names from all sources
  const componentNames = new Set([
    ...jsxMatches.map(match => match.substring(1)), 
    ...componentRefNames,
    ...namedComponents
  ]);
  
  return Array.from(componentNames);
}

/**
 * Extract imports from a file
 */
function extractImports(content) {
  const importStatements = content.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || [];
  const imports = new Set();
  
  importStatements.forEach(statement => {
    // Extract named imports
    const namedImports = statement.match(/import\s+{([^}]+)}/);
    if (namedImports && namedImports[1]) {
      namedImports[1].split(',').forEach(imp => {
        const trimmedName = imp.trim().split(' as ')[0];
        imports.add(trimmedName);
      });
    }
    
    // Extract default imports
    const defaultImport = statement.match(/import\s+([A-Za-z0-9_]+)\s+from/);
    if (defaultImport && defaultImport[1]) {
      imports.add(defaultImport[1]);
    }
  });
  
  return imports;
}

/**
 * Group imports by source
 */
function groupImportsBySource(components) {
  const importGroups = {};
  
  components.forEach(component => {
    const source = componentImportMapping[component];
    if (source) {
      if (!importGroups[source]) {
        importGroups[source] = [];
      }
      importGroups[source].push(component);
    }
  });
  
  return importGroups;
}

/**
 * Generate import statements for missing components
 */
function generateImportStatements(importGroups) {
  const statements = [];
  
  Object.entries(importGroups).forEach(([source, components]) => {
    if (components.length > 0) {
      // Filter out HTML element types for regular imports
      const regularComponents = components.filter(c => !c.startsWith('HTML'));
      
      // If there are regular components, add them as named imports
      if (regularComponents.length > 0) {
        statements.push(`import { ${regularComponents.sort().join(', ')} } from '${source}';`);
      }
      
      // If this is React and there are HTML element types, add a React import
      if (source === 'react' && components.some(c => c.startsWith('HTML'))) {
        // Make sure we have a React import for HTML elements
        if (!importGroups['react']?.includes('React')) {
          statements.push(`import React from 'react';`);
        }
      }
    }
  });
  
  return statements;
}

/**
 * Find the appropriate position to insert import statements
 */
function findImportInsertPosition(content) {
  const lines = content.split('\n');
  let insertPosition = 0;
  
  // Check for 'use client' directive first
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === "'use client'" || line === '"use client"') {
      // Insert after 'use client'
      insertPosition = lines.slice(0, i + 1).join('\n').length + 1;
      return insertPosition;
    }
  }
  
  // If no 'use client', look for existing imports
  const importMatch = content.match(/import\s+.*?from\s+['"]/); 
  if (importMatch) {
    insertPosition = importMatch.index;
    return insertPosition;
  }
  
  // If no imports, insert at the beginning after any initial comments
  let i = 0;
  
  // Skip empty lines
  while (i < lines.length && lines[i].trim() === '') {
    i++;
  }
  
  // Skip single-line comments
  while (i < lines.length && lines[i].trim().startsWith('//')) {
    i++;
  }
  
  // Skip multi-line comments
  if (i < lines.length && lines[i].trim().startsWith('/*')) {
    i++;
    while (i < lines.length && !lines[i].includes('*/')) {
      i++;
    }
    if (i < lines.length) i++; // Skip the line with closing comment
  }
  
  insertPosition = lines.slice(0, i).join('\n').length;
  if (insertPosition > 0) insertPosition += 1; // Add newline
  
  return insertPosition;
}

/**
 * Fix imports in a file
 */
function fixImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip node_modules and any non-source files
    if (filePath.includes('node_modules')) {
      return;
    }
    
    // Extract used components and existing imports
    const components = extractComponentsFromJSX(content);
    const existingImports = extractImports(content);
    
    // Find missing components
    const missingComponents = [];
    for (const component of components) {
      if (!existingImports.has(component) && componentImportMapping[component]) {
        missingComponents.push(component);
      }
    }
    
    if (missingComponents.length === 0) {
      return;
    }
    
    // Group missing components by source
    const importGroups = groupImportsBySource(missingComponents);
    
    // Generate import statements
    const importStatements = generateImportStatements(importGroups);
    
    if (importStatements.length === 0) {
      return;
    }
    
    // Add the imports to the file
    let newContent = content;
    
    // Find the appropriate position to add imports
    const insertPosition = findImportInsertPosition(content);
    newContent = newContent.substring(0, insertPosition) + 
                 importStatements.join('\n') + 
                 (insertPosition > 0 ? '\n' : '') + 
                 newContent.substring(insertPosition);
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    // Log the fixed imports
    const relativePath = path.relative(rootDir, filePath);
    console.log(`${colors.green}Fixed imports in ${colors.white}${relativePath}${colors.green}:${colors.reset}`);
    importStatements.forEach(statement => {
      console.log(`  ${colors.blue}+ ${statement}${colors.reset}`);
    });
    
    fixedFiles++;
    fixedImports += missingComponents.length;
  } catch (error) {
    console.error(`${colors.red}Error fixing imports in ${filePath}: ${error.message}${colors.reset}`);
  }
}

/**
 * Main function to fix imports in all files
 */
function getAllTsxFiles() {
  const appFiles = getAllFiles(path.join(srcDir, 'app')).filter(file => file.endsWith('.tsx'));
  const componentFiles = getAllFiles(path.join(srcDir, 'components')).filter(file => file.endsWith('.tsx'));
  const pagesFiles = getAllFiles(path.join(srcDir, 'pages')).filter(file => file.endsWith('.tsx'));
  
  // We'll exclude type definition files that have been manually maintained
  const typeFiles = getAllFiles(path.join(srcDir, 'types'))
    .filter(file => file.endsWith('.ts'))
    .filter(file => {
      // Check if the file contains the DO NOT MODIFY comment
      const content = fs.readFileSync(file, 'utf8');
      return !content.includes('DO NOT MODIFY: This file is manually maintained');
    });
  
  return [...appFiles, ...componentFiles, ...pagesFiles, ...typeFiles];
}

function fixImportsInFiles() {
  // Get all typescript and javascript files in the src directory using our filtered function
  const srcFiles = getAllTsxFiles();
  const pagesFiles = getAllFiles(pagesDir).filter(file => /\.(tsx|jsx|js|ts)$/.test(file));
  const appFiles = getAllFiles(appDir).filter(file => /\.(tsx|jsx|js|ts)$/.test(file));
  
  const allFiles = [...srcFiles, ...pagesFiles, ...appFiles];
  
  let processedCount = 0;
  const totalCount = allFiles.length;
  
  for (const file of allFiles) {
    processedCount++;
    if (processedCount % 10 === 0) {
      console.log(`${colors.yellow}Processed ${processedCount}/${totalCount} files...${colors.reset}`);
    }
    
    try {
      fixImports(file);
    } catch (error) {
      console.error(`${colors.red}Error processing ${file}: ${error.message}${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.cyan}Import Fixer Summary${colors.reset}`);
  console.log(`${colors.cyan}===================${colors.reset}`);
  console.log(`${colors.green}Fixed ${fixedImports} imports in ${fixedFiles} files${colors.reset}`);
}
// Run the import fixer
fixImportsInFiles();
