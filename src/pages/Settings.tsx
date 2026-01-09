import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Database,
  MapPin,
  Fuel,
  Globe,
  Key,
  Wrench
} from "lucide-react";
import PushNotificationSettings from "@/components/settings/PushNotificationSettings";
import { FuelAlertSettings } from "@/components/alerts/FuelAlertSettings";
import { MaintenanceAlertSettings } from "@/components/alerts/MaintenanceAlertSettings";

const Settings = () => {
  const [apiKeys, setApiKeys] = useState({
    mapbox: localStorage.getItem('mapbox_token') || '',
    googleMaps: localStorage.getItem('google_maps_token') || '',
    openWeather: localStorage.getItem('openweather_token') || '',
    twilio: localStorage.getItem('twilio_token') || '',
    sendgrid: localStorage.getItem('sendgrid_token') || '',
    openai: localStorage.getItem('openai_token') || '',
    gemini: localStorage.getItem('gemini_token') || '',
    anthropic: localStorage.getItem('anthropic_token') || '',
  });
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});

  const handleSaveApiKey = (key: string, value: string) => {
    localStorage.setItem(`${key}_token`, value);
    setSavedKeys({ ...savedKeys, [key]: true });
    setTimeout(() => {
      setSavedKeys(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your fleet management system</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="w-4 h-4" aria-hidden="true" />
              General
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="w-4 h-4" aria-hidden="true" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" aria-hidden="true" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="fuel" className="gap-2">
              <Fuel className="w-4 h-4" aria-hidden="true" />
              Fuel
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="w-4 h-4" aria-hidden="true" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <User className="w-4 h-4" aria-hidden="true" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* API Keys Settings */}
          <TabsContent value="api" className="space-y-6">
            {/* Mapping Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                  Mapping Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
                  <Input 
                    id="mapbox-token" 
                    type="password"
                    placeholder="pk.eyJ..." 
                    value={apiKeys.mapbox}
                    onChange={(e) => setApiKeys({ ...apiKeys, mapbox: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for Map View, Geofencing, and Route History features. 
                    Get your token at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a>
                  </p>
                  <Button size="sm" onClick={() => handleSaveApiKey('mapbox', apiKeys.mapbox)}>
                    {savedKeys.mapbox ? '✓ Saved' : 'Save'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google-maps-token">Google Maps API Key</Label>
                  <Input 
                    id="google-maps-token" 
                    type="password"
                    placeholder="AIza..." 
                    value={apiKeys.googleMaps}
                    onChange={(e) => setApiKeys({ ...apiKeys, googleMaps: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alternative mapping service. Get your key at <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a>
                  </p>
                  <Button size="sm" onClick={() => handleSaveApiKey('google_maps', apiKeys.googleMaps)}>
                    {savedKeys.google_maps ? '✓ Saved' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weather Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" aria-hidden="true" />
                  Weather Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openweather-token">OpenWeatherMap API Key</Label>
                  <Input 
                    id="openweather-token" 
                    type="password"
                    placeholder="Enter API key..." 
                    value={apiKeys.openWeather}
                    onChange={(e) => setApiKeys({ ...apiKeys, openWeather: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    For weather-based route planning and alerts. Get your key at <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openweathermap.org</a>
                  </p>
                  <Button size="sm" onClick={() => handleSaveApiKey('openweather', apiKeys.openWeather)}>
                    {savedKeys.openweather ? '✓ Saved' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Communication Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" aria-hidden="true" />
                  Communication Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="twilio-token">Twilio API Key</Label>
                  <Input 
                    id="twilio-token" 
                    type="password"
                    placeholder="SK..." 
                    value={apiKeys.twilio}
                    onChange={(e) => setApiKeys({ ...apiKeys, twilio: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    For SMS and WhatsApp notifications. Get your key at <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com</a>
                  </p>
                  <Button size="sm" onClick={() => handleSaveApiKey('twilio', apiKeys.twilio)}>
                    {savedKeys.twilio ? '✓ Saved' : 'Save'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sendgrid-token">SendGrid API Key</Label>
                  <Input 
                    id="sendgrid-token" 
                    type="password"
                    placeholder="SG..." 
                    value={apiKeys.sendgrid}
                    onChange={(e) => setApiKeys({ ...apiKeys, sendgrid: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    For email notifications and reports. Get your key at <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">sendgrid.com</a>
                  </p>
                  <Button size="sm" onClick={() => handleSaveApiKey('sendgrid', apiKeys.sendgrid)}>
                    {savedKeys.sendgrid ? '✓ Saved' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" aria-hidden="true" />
                  AI Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="gemini-token">Google Gemini API Key</Label>
                  <Input 
                    id="gemini-token" 
                    type="password"
                    placeholder="AIza..." 
                    value={apiKeys.gemini}
                    onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    For Google Gemini AI models. Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>
                  </p>
                  <Button size="sm" onClick={() => handleSaveApiKey('gemini', apiKeys.gemini)}>
                    {savedKeys.gemini ? '✓ Saved' : 'Save'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-token">OpenAI API Key</Label>
                  <Input 
                    id="openai-token" 
                    type="password"
                    placeholder="sk-..." 
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    For GPT models and AI-powered features. Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a>
                  </p>
                  <Button size="sm" onClick={() => handleSaveApiKey('openai', apiKeys.openai)}>
                    {savedKeys.openai ? '✓ Saved' : 'Save'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anthropic-token">Anthropic Claude API Key</Label>
                  <Input 
                    id="anthropic-token" 
                    type="password"
                    placeholder="sk-ant-..." 
                    value={apiKeys.anthropic}
                    onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    For Claude AI models. Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.anthropic.com</a>
                  </p>
                  <Button size="sm" onClick={() => handleSaveApiKey('anthropic', apiKeys.anthropic)}>
                    {savedKeys.anthropic ? '✓ Saved' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <PushNotificationSettings />
          </TabsContent>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" placeholder="Your Company Name" defaultValue="FleetTrack Demo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Time Zone</Label>
                    <Input id="timezone" placeholder="Select timezone" defaultValue="Africa/Addis_Ababa" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="Business address" defaultValue="Addis Ababa, Ethiopia" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Input id="language" placeholder="Select language" defaultValue="English" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input id="currency" placeholder="Select currency" defaultValue="ETB (Ethiopian Birr)" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distance">Distance Unit</Label>
                    <Input id="distance" placeholder="km or miles" defaultValue="Kilometers" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel-unit">Fuel Unit</Label>
                    <Input id="fuel-unit" placeholder="L or gal" defaultValue="Liters" />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <div className="text-sm text-muted-foreground">Enable dark theme</div>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-refresh Map</Label>
                    <div className="text-sm text-muted-foreground">Update live map every 30 seconds</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Offline Vehicles</Label>
                    <div className="text-sm text-muted-foreground">Display vehicles without GPS signal</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert Settings */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuel-theft">Fuel Theft Threshold (%)</Label>
                    <Input id="fuel-theft" type="number" defaultValue="5" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="low-fuel">Low Fuel Alert (%)</Label>
                    <Input id="low-fuel" type="number" defaultValue="20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idle-time">Max Idle Time (minutes)</Label>
                    <Input id="idle-time" type="number" defaultValue="30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="speed-limit">Speeding Threshold (km/h over)</Label>
                    <Input id="speed-limit" type="number" defaultValue="10" />
                  </div>
                </div>
                <Button>Save Thresholds</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <div className="text-sm text-muted-foreground">Receive alerts via email</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <div className="text-sm text-muted-foreground">Receive critical alerts via SMS</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>WhatsApp Notifications</Label>
                    <div className="text-sm text-muted-foreground">Receive alerts via WhatsApp</div>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>In-App Notifications</Label>
                    <div className="text-sm text-muted-foreground">Browser notifications</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Recipients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="critical-alerts">Critical Alerts Email</Label>
                  <Input id="critical-alerts" type="email" placeholder="ops-team@fleet.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel-alerts">Fuel Alerts Email</Label>
                  <Input id="fuel-alerts" type="email" placeholder="fuel-controller@fleet.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-alerts">Maintenance Alerts Email</Label>
                  <Input id="maintenance-alerts" type="email" placeholder="maintenance@fleet.com" />
                </div>
                <Button>Save Recipients</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fuel Settings */}
          <TabsContent value="fuel" className="space-y-6">
            {/* New Fuel Alert Settings */}
            <FuelAlertSettings />
            
            <Card>
              <CardHeader>
                <CardTitle>Fuel Detection Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="refuel-threshold">Refuel Detection Threshold (%)</Label>
                    <Input id="refuel-threshold" type="number" defaultValue="8" />
                    <div className="text-xs text-muted-foreground">Minimum increase to detect refuel</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="theft-threshold">Theft Detection Threshold (%)</Label>
                    <Input id="theft-threshold" type="number" defaultValue="5" />
                    <div className="text-xs text-muted-foreground">Minimum drop to flag theft</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="detection-window">Detection Time Window (minutes)</Label>
                    <Input id="detection-window" type="number" defaultValue="5" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-speed">Minimum Speed for Events (km/h)</Label>
                    <Input id="min-speed" type="number" defaultValue="5" />
                  </div>
                </div>
                <Button>Save Detection Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fuel Price Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel-price">Default Fuel Price (per liter)</Label>
                  <Input id="fuel-price" type="number" step="0.01" defaultValue="45.50" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-update Fuel Prices</Label>
                    <div className="text-sm text-muted-foreground">Fetch prices from fuel card providers</div>
                  </div>
                  <Switch />
                </div>
                <Button>Save Price Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sensor Calibration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Configure sensor calibration curves for accurate fuel readings
                </div>
                <Button variant="outline">Manage Calibration Curves</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Settings */}
          <TabsContent value="maintenance" className="space-y-6">
            <MaintenanceAlertSettings />
            
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Scheduling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Block Vehicles for Dispatch</Label>
                    <div className="text-sm text-muted-foreground">
                      Prevent assignment of vehicles with scheduled maintenance
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-create Work Orders</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically create work orders when maintenance is due
                    </div>
                  </div>
                  <Switch />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maint-block-days">Block Dispatch Days Before Due</Label>
                  <Input id="maint-block-days" type="number" defaultValue="3" />
                  <div className="text-xs text-muted-foreground">
                    Block vehicle from dispatch this many days before maintenance
                  </div>
                </div>
                <Button>Save Scheduling Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Button className="gap-2">
                    <User className="w-4 h-4" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Admin User", email: "admin@fleet.com", role: "Administrator", status: "Active" },
                    { name: "Operations Manager", email: "ops@fleet.com", role: "Manager", status: "Active" },
                    { name: "Fuel Controller", email: "fuel@fleet.com", role: "Controller", status: "Active" },
                    { name: "Dispatcher", email: "dispatch@fleet.com", role: "Dispatcher", status: "Active" },
                  ].map((user) => (
                    <div
                      key={user.email}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <div className="text-muted-foreground">Role</div>
                          <div className="font-medium">{user.role}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="outline">Remove</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Configure permissions for each user role
                </div>
                <Button variant="outline">Manage Permissions</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
