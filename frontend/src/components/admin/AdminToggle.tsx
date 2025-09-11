import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { AdminDashboard } from './AdminDashboard';

export const AdminToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Only show admin toggle in development mode
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (!isDevelopment) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Admin Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col">
        <DialogHeader className="shrink-0 border-b pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center space-x-2">
            <span className="text-2xl">🔍</span>
            <span>Admin Dashboard</span>
            <span className="text-sm bg-green-600 text-white px-2 py-1 rounded-full font-medium">
              LIVE
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden pt-4">
          <AdminDashboard />
        </div>
      </DialogContent>
    </Dialog>
  );
};