/**
 * Data Source Toggle Component
 * Allows switching between demo mode (mock data) and live mode (real OAuth discovery)
 * Only available in development environment
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Database, TestTube, AlertTriangle } from 'lucide-react';
import { DataProvider } from '@/services/data-provider';
import { DataSourceMode } from '@/types/data-source';

interface DataSourceToggleProps {
  className?: string;
  compact?: boolean;
}

export const DataSourceToggle: React.FC<DataSourceToggleProps> = ({ 
  className = '',
  compact = false 
}) => {
  const dataProvider = DataProvider.getInstance();
  const [currentMode, setCurrentMode] = React.useState<DataSourceMode>(dataProvider.getCurrentMode());
  const [isToggling, setIsToggling] = React.useState(false);

  // Only show in development mode
  const isDevelopment = import.meta.env.MODE === 'development';
  
  // Sync with backend on mount
  React.useEffect(() => {
    if (isDevelopment) {
      dataProvider.syncWithBackend().then(() => {
        setCurrentMode(dataProvider.getCurrentMode());
      });
    }
  }, [dataProvider, isDevelopment]);
  
  if (!isDevelopment) {
    return null;
  }

  const handleToggle = async () => {
    setIsToggling(true);
    
    try {
      await dataProvider.toggleDataSource();
      const newMode = dataProvider.getCurrentMode();
      setCurrentMode(newMode);
      
      // Brief delay to show the toggle animation
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Failed to toggle data source:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const getModeInfo = (mode: DataSourceMode) => {
    if (mode === 'demo') {
      return {
        icon: <TestTube className="h-3 w-3" />,
        label: 'Demo',
        description: 'Using mock automation data for demos',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        switchColor: 'bg-blue-600'
      };
    } else {
      return {
        icon: <Database className="h-3 w-3" />,
        label: 'Live',
        description: 'Using real OAuth discovery results',
        color: 'bg-green-100 text-green-800 border-green-200',
        switchColor: 'bg-green-600'
      };
    }
  };

  const modeInfo = getModeInfo(currentMode);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center space-x-2 ${className}`}>
              <Badge 
                variant="outline" 
                className={`${modeInfo.color} text-xs font-medium px-2 py-1 flex items-center space-x-1`}
              >
                {modeInfo.icon}
                <span>{modeInfo.label}</span>
              </Badge>
              <Switch
                checked={currentMode === 'live'}
                onCheckedChange={handleToggle}
                disabled={isToggling}
                className="data-[state=checked]:bg-green-600"
                aria-label={`Switch to ${currentMode === 'demo' ? 'live' : 'demo'} mode`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">{modeInfo.label} Mode</p>
              <p className="text-xs text-muted-foreground">{modeInfo.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click switch to toggle
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center space-x-3 p-2 rounded-md border bg-card ${className}`}>
      {/* Mode Indicator */}
      <div className="flex items-center space-x-2">
        <Badge 
          variant="outline" 
          className={`${modeInfo.color} font-medium px-2 py-1 flex items-center space-x-1`}
        >
          {modeInfo.icon}
          <span>{modeInfo.label} Mode</span>
        </Badge>
      </div>

      {/* Toggle Switch */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Demo</span>
        <Switch
          checked={currentMode === 'live'}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          className="data-[state=checked]:bg-green-600"
          aria-label={`Switch to ${currentMode === 'demo' ? 'live' : 'demo'} mode`}
        />
        <span className="text-sm text-muted-foreground">Live</span>
      </div>

      {/* Description */}
      <div className="text-xs text-muted-foreground max-w-xs">
        {modeInfo.description}
      </div>

      {/* Warning for Demo Mode */}
      {currentMode === 'demo' && (
        <div className="flex items-center space-x-1 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Demo data only</span>
        </div>
      )}
    </div>
  );
};