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
import { Terminal } from 'lucide-react';

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
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full">
        <DialogHeader>
          <DialogTitle>Admin Dashboard</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto">
          <AdminDashboard />
        </div>
      </DialogContent>
    </Dialog>
  );
};