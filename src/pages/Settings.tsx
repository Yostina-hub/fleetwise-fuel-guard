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
  Globe
} from "lucide-react";

const Settings = () => {
  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your fleet management system</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="fuel" className="gap-2">
              <Fuel className="w-4 h-4" />
              Fuel
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <User className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

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
