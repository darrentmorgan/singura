/**
 * Sidebar Component
 * Navigation sidebar with platform connections and menu items
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  Link2,
  Bot,
  Shield,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronRight,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSidebarState, useConnectionStatus, useUIActions } from '@/stores/ui';
import { useConnections, useActiveConnections } from '@/stores/connections';
import { cn } from '@/lib/utils';

// Platform icons mapping
const platformIcons = {
  slack: '💬',
  google: '🌐',
  microsoft: '💼',
  hubspot: '🎯',
  salesforce: '☁️',
  notion: '📝',
  asana: '✅',
  jira: '🔧',
};

interface SidebarProps {
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  isActive?: boolean;
  permissions?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();
  const { isSignedIn } = useAuth();

  // UI state
  const { isOpen, isCollapsed } = useSidebarState();
  const { isOnline, websocketConnected } = useConnectionStatus();
  const { setSidebarOpen, showError } = useUIActions();
  
  // Connection state
  const connections = useConnections();
  const activeConnections = useActiveConnections();

  // Don't render if not authenticated
  if (!isSignedIn) {
    return null;
  }

  // Main navigation items
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      isActive: location.pathname === '/dashboard',
    },
    {
      id: 'connections',
      label: 'Connections',
      href: '/connections',
      icon: <Link2 className="h-5 w-5" />,
      badge: connections.length,
      isActive: location.pathname.startsWith('/connections'),
    },
    {
      id: 'automations',
      label: 'Automations',
      href: '/automations',
      icon: <Bot className="h-5 w-5" />,
      isActive: location.pathname.startsWith('/automations'),
    },
    {
      id: 'security',
      label: 'Security',
      href: '/security',
      icon: <Shield className="h-5 w-5" />,
      isActive: location.pathname.startsWith('/security'),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: '/analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      isActive: location.pathname.startsWith('/analytics'),
    },
  ];

  const bottomNavItems: NavItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
      isActive: location.pathname.startsWith('/settings'),
    },
    {
      id: 'help',
      label: 'Help & Support',
      href: '/help',
      icon: <HelpCircle className="h-5 w-5" />,
      isActive: location.pathname.startsWith('/help'),
    },
  ];

  const handleConnectionClick = (connectionId: string) => {
    // Navigate to connection details
    window.location.href = `/connections/${connectionId}`;
  };

  const handleCloseSidebar = () => {
    if (window.innerWidth < 1024) { // lg breakpoint
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-50 flex h-[calc(100vh-4rem)] w-64 flex-col border-r bg-background transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed && "w-16",
          className
        )}
        data-testid="sidebar"
      >
        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 p-3" data-testid="sidebar-menu">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                onClick={handleCloseSidebar}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  item.isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
                data-testid={`${item.id}-nav-link`}
              >
                {item.icon}
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            ))}
          </div>

          {/* Platform Connections Section */}
          {!isCollapsed && connections.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 px-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Connected Platforms
                </h3>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {connections.slice(0, 8).map((connection) => (
                  <button
                    key={connection.id}
                    onClick={() => handleConnectionClick(connection.id)}
                    className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-left"
                  >
                    <div className="flex-shrink-0">
                      <span className="text-lg">
                        {platformIcons[connection.platform_type] || '🔗'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {connection.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {connection.platform_type}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {connection.status === 'active' ? (
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      ) : connection.status === 'error' ? (
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                
                {connections.length > 8 && (
                  <Link
                    to="/connections"
                    onClick={handleCloseSidebar}
                    className="flex w-full items-center justify-center space-x-2 rounded-lg px-3 py-2 text-xs text-primary hover:bg-accent transition-colors"
                  >
                    <span>View all {connections.length} connections</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Connection Status */}
        <div className="border-t p-3">
          {!isCollapsed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <span className={isOnline ? "text-green-600" : "text-red-600"}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Real-time</span>
                <div className="flex items-center space-x-2">
                  <Activity 
                    className={cn(
                      "h-3 w-3",
                      websocketConnected ? "text-green-500" : "text-red-500"
                    )}
                  />
                  <span className={websocketConnected ? "text-green-600" : "text-red-600"}>
                    {websocketConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>

              {activeConnections.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active</span>
                  <span className="text-green-600">
                    {activeConnections.length} platform{activeConnections.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <nav className="border-t p-3">
          <div className="space-y-1">
            {bottomNavItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                onClick={handleCloseSidebar}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  item.isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;