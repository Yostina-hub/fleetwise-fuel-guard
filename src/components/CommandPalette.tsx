import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Map, 
  AlertTriangle, 
  Fuel, 
  Wrench,
  Route,
  Shield,
  Settings,
  LogOut,
  Moon,
  Sun,
  Gauge,
  Calendar,
  FileText,
  HardDrive,
  Bell,
  Search,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
  group: 'navigation' | 'actions' | 'settings';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { theme, cycleTheme } = useTheme();

  const handleCycleTheme = useCallback(() => {
    cycleTheme();
    toast({
      title: "Theme changed",
      description: `Switched to next theme`,
    });
  }, [cycleTheme, toast]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/auth');
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully',
    });
  }, [signOut, navigate, toast]);

  const commands: CommandItem[] = [
    // Navigation
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('/'), keywords: ['home', 'overview', 'main'], group: 'navigation' },
    { id: 'fleet', label: 'Fleet Management', icon: Truck, action: () => navigate('/fleet'), keywords: ['vehicles', 'cars', 'trucks'], group: 'navigation' },
    { id: 'drivers', label: 'Drivers', icon: Users, action: () => navigate('/drivers'), keywords: ['staff', 'employees', 'personnel'], group: 'navigation' },
    { id: 'map', label: 'Live Map', icon: Map, action: () => navigate('/map'), keywords: ['tracking', 'gps', 'location'], group: 'navigation' },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, action: () => navigate('/alerts'), keywords: ['warnings', 'notifications', 'issues'], group: 'navigation' },
    { id: 'fuel', label: 'Fuel Monitoring', icon: Fuel, action: () => navigate('/fuel-monitoring'), keywords: ['consumption', 'gas', 'diesel'], group: 'navigation' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, action: () => navigate('/maintenance'), keywords: ['service', 'repair', 'work orders'], group: 'navigation' },
    { id: 'routes', label: 'Routes', icon: Route, action: () => navigate('/routes'), keywords: ['trips', 'journeys', 'paths'], group: 'navigation' },
    { id: 'scheduling', label: 'Trip Scheduling', icon: Calendar, action: () => navigate('/scheduling'), keywords: ['calendar', 'bookings', 'assignments'], group: 'navigation' },
    { id: 'speed-governor', label: 'Speed Governor', icon: Gauge, action: () => navigate('/speed-governor'), keywords: ['limits', 'violations', 'speeding'], group: 'navigation' },
    { id: 'incidents', label: 'Incidents', icon: Shield, action: () => navigate('/incidents'), keywords: ['accidents', 'events', 'safety'], group: 'navigation' },
    { id: 'reports', label: 'Reports', icon: FileText, action: () => navigate('/reports'), keywords: ['analytics', 'statistics', 'export'], group: 'navigation' },
    { id: 'devices', label: 'Device Integration', icon: HardDrive, action: () => navigate('/device-integration'), keywords: ['trackers', 'hardware', 'gps units'], group: 'navigation' },
    
    // Actions
    { id: 'refresh', label: 'Refresh Data', icon: Zap, action: () => { window.location.reload(); }, keywords: ['reload', 'update', 'sync'], group: 'actions' },
    { id: 'notifications', label: 'View Notifications', icon: Bell, action: () => navigate('/alerts'), keywords: ['alerts', 'messages'], group: 'actions' },
    
    // Settings
    { id: 'settings', label: 'Settings', icon: Settings, action: () => navigate('/settings'), keywords: ['preferences', 'config', 'options'], group: 'settings' },
    { id: 'security', label: 'Security Dashboard', icon: Shield, action: () => navigate('/security-dashboard'), keywords: ['auth', 'mfa', 'password'], group: 'settings' },
    { id: 'theme', label: `Cycle Theme (${theme})`, icon: theme === 'light' ? Sun : Moon, action: handleCycleTheme, keywords: ['dark', 'light', 'cyber', 'appearance', 'theme'], group: 'settings' },
    { id: 'logout', label: 'Sign Out', icon: LogOut, action: handleLogout, keywords: ['exit', 'leave', 'logout'], group: 'settings' },
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const navigationItems = commands.filter(c => c.group === 'navigation');
  const actionItems = commands.filter(c => c.group === 'actions');
  const settingsItems = commands.filter(c => c.group === 'settings');

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={() => runCommand(item.action)}
              className="gap-3 cursor-pointer"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Quick Actions">
          {actionItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={() => runCommand(item.action)}
              className="gap-3 cursor-pointer"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Settings">
          {settingsItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={() => runCommand(item.action)}
              className="gap-3 cursor-pointer"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
