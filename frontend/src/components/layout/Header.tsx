/**
 * Header Component
 * Main application header with navigation, user menu, and global actions
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { useUser, useClerk, OrganizationSwitcher } from '@clerk/clerk-react';

import { Button } from '@/components/ui/button';
import { useUIActions, useTheme, useNotifications, useSidebarState } from '@/stores/ui';
import { useConnectionsActions } from '@/stores/connections';
import { AdminToggle } from '@/components/admin/AdminToggle';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const navigate = useNavigate();

  // Clerk auth
  const { user } = useUser();
  const { signOut } = useClerk();

  // UI state
  const theme = useTheme();
  const notifications = useNotifications();
  const { isOpen: sidebarOpen } = useSidebarState();
  const {
    toggleTheme,
    toggleSidebar,
    openGlobalSearch,
    showSuccess,
    showError
  } = useUIActions();

  // Store actions
  const { fetchConnections, fetchConnectionStats } = useConnectionsActions();

  const unreadNotifications = notifications.filter(n => n.type === 'error' || n.type === 'warning').length;

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess('Logged out successfully', 'Goodbye!');
      navigate('/login', { replace: true });
    } catch (error) {
      showError('Failed to logout properly', 'Logout Error');
      // Force navigation even if logout API fails
      navigate('/login', { replace: true });
    }
  };

  const handleRefresh = async () => {
    try {
      showSuccess('Refreshing data...', 'Sync');
      await Promise.all([
        fetchConnections(),
        fetchConnectionStats(),
      ]);
      showSuccess('Data refreshed successfully', 'Sync Complete');
    } catch (error) {
      showError('Failed to refresh data', 'Sync Error');
    }
  };

  const handleSearch = () => {
    openGlobalSearch();
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="flex h-16 items-center px-4">
        {/* Left side - Logo and Mobile Menu */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Logo */}
          <Link 
            to="/dashboard" 
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl text-foreground hidden sm:block">
              SaaS X-Ray
            </span>
          </Link>
        </div>

        {/* Center - Search */}
        <div className="flex-1 flex justify-center px-4">
          <Button
            variant="outline"
            className="max-w-md w-full justify-start text-muted-foreground hover:text-foreground border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Search platforms, automations...</span>
            <span className="sm:hidden">Search...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto hidden md:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Right side - Actions and User Menu */}
        <div className="flex items-center space-x-2">
          {/* Organization Switcher */}
          <OrganizationSwitcher
            hidePersonal={false}
            afterCreateOrganizationUrl="/connections"
            afterSelectOrganizationUrl="/connections"
            appearance={{
              elements: {
                rootBox: "flex items-center",
                organizationSwitcherTrigger: "px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800",
              },
            }}
          />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="hidden sm:inline-flex hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme.mode === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              // TODO: Implement notifications panel
              showError('Notifications panel coming soon');
            }}
            aria-label="Notifications"
            data-testid="notifications-button"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Button>

          {/* Refresh/Sync */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            aria-label="Refresh data"
            className="hidden sm:inline-flex hover:bg-gray-100 dark:hover:bg-gray-800"
            data-testid="refresh-button"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </Button>

          {/* Admin Panel (Development Only) */}
          <AdminToggle />

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
            className="hidden md:inline-flex hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu Dropdown */}
          <div className="relative group">
            <Button
              variant="ghost"
              className="flex items-center space-x-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="User menu"
              data-testid="user-menu"
            >
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                {user?.firstName?.[0]?.toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-foreground">
                  {user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress || 'No email'}
                </p>
              </div>
            </Button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-56 bg-popover border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-2 border-b">
                <p className="font-medium text-sm text-foreground">
                  {user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress || 'No email'}
                </p>
              </div>
              
              <div className="p-1">
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center w-full px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </button>
                
                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center w-full px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </button>

                {/* Mobile-only theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center w-full px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors sm:hidden"
                >
                  {theme.mode === 'dark' ? (
                    <>
                      <Sun className="h-4 w-4 mr-2" />
                      Light mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 mr-2" />
                      Dark mode
                    </>
                  )}
                </button>

                <div className="border-t my-1" />
                
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-sm text-destructive hover:bg-accent hover:text-destructive rounded-sm transition-colors"
                  data-testid="logout-button"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;