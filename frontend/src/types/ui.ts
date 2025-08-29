/**
 * UI-specific types for SaaS X-Ray Frontend
 */

import { PlatformType, ConnectionStatus, RiskLevel } from './api';

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: string;
  code?: string;
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Component Props Types
export interface PlatformCardProps {
  platform: PlatformType;
  status: ConnectionStatus;
  displayName?: string;
  lastSync?: string;
  error?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export interface AutomationCardProps {
  automation: {
    id: string;
    name: string;
    type: string;
    status: string;
    riskLevel: RiskLevel;
    description?: string;
    lastTriggered?: string;
    permissions?: string[];
  };
  onViewDetails?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export interface StatusBadgeProps {
  status: ConnectionStatus | 'discovering' | 'validating';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  badge?: number;
  isActive?: boolean;
  permissions?: string[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Modal Types
export interface ModalState {
  isOpen: boolean;
  type?: 'confirm' | 'info' | 'error' | 'custom';
  title?: string;
  content?: string;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'destructive';
  }>;
}

// Table Types
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    onSort: (column: string) => void;
  };
  selection?: {
    selected: string[];
    onSelect: (ids: string[]) => void;
  };
}

// Chart Types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

// Layout Types
export interface LayoutProps {
  children: React.ReactNode;
  sidebar?: boolean;
  header?: boolean;
  footer?: boolean;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  children?: SidebarItem[];
}

// Theme Types
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
}

// Search and Filter Types
export interface SearchState {
  query: string;
  filters: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterGroup {
  label: string;
  key: string;
  type: 'select' | 'multiselect' | 'range' | 'date';
  options?: FilterOption[];
  value?: any;
}

// Animation Types
export interface AnimationProps {
  duration?: number;
  delay?: number;
  easing?: string;
}

// Accessibility Types
export interface A11yProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  role?: string;
  tabIndex?: number;
}

// Responsive Types
export interface ResponsiveProps {
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

// Virtual List Types (for large datasets)
export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  overscan?: number;
}

// Context Types
export interface UIContext {
  theme: Theme;
  sidebarOpen: boolean;
  notifications: NotificationState[];
  modal: ModalState;
  loading: Record<string, LoadingState>;
  errors: Record<string, ErrorState>;
}

// Hook Return Types
export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

export interface UseLocalStorage<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
}

export interface UsePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

// Event Types
export interface CustomEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
}

export interface KeyboardEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}