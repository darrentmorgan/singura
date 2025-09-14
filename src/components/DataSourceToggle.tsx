import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DataProvider } from '@/services/data-provider';
import { Badge } from '@/components/ui/badge';

export const DataSourceToggle: React.FC = () => {
  const dataProvider = DataProvider.getInstance();
  const currentMode = dataProvider.getCurrentMode();

  const handleToggle = () => {
    dataProvider.toggleDataSource();
    // Force re-render or trigger global state update
    window.location.reload();
  };

  const modeColorMap = {
    demo: 'bg-yellow-500',
    live: 'bg-green-500'
  };

  return (
    <div className="flex items-center space-x-4 p-2 border rounded-md">
      <Label htmlFor="data-source-toggle">
        Data Source Mode:
        <Badge
          variant="outline"
          className={`ml-2 ${modeColorMap[currentMode]}`}
        >
          {currentMode.toUpperCase()}
        </Badge>
      </Label>
      <Switch
        id="data-source-toggle"
        checked={currentMode === 'live'}
        onCheckedChange={handleToggle}
        disabled={process.env.NODE_ENV === 'production'}
      />
    </div>
  );
};