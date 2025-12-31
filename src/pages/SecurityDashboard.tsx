import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Lock,
  Key,
  Fingerprint,
  Globe,
  AlertTriangle,
  Activity,
  FileCheck,
  Clock,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import MfaManagement from "@/components/security/MfaManagement";
import AccountLockoutPanel from "@/components/security/AccountLockoutPanel";
import AuditComplianceTab from "@/components/security/AuditComplianceTab";

interface SecurityFeature {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'warning';
  category: string;
  icon: React.ReactNode;
}

const SecurityDashboard = () => {
  const [securityScore] = useState(78);
  
  const securityFeatures: SecurityFeature[] = [
    { id: '1', name: 'Password Validation', description: 'Strength checking & policy enforcement', status: 'active', category: 'auth', icon: <Key className="h-4 w-4" /> },
    { id: '2', name: 'Password History', description: 'Prevents password reuse', status: 'active', category: 'auth', icon: <Clock className="h-4 w-4" /> },
    { id: '3', name: 'MFA Authentication', description: 'Multi-factor authentication', status: 'warning', category: 'auth', icon: <Smartphone className="h-4 w-4" /> },
    { id: '4', name: 'Session Fingerprinting', description: 'Device/browser identification', status: 'active', category: 'session', icon: <Fingerprint className="h-4 w-4" /> },
    { id: '5', name: 'Session Timeout', description: 'Auto-logout on inactivity', status: 'active', category: 'session', icon: <Clock className="h-4 w-4" /> },
    { id: '6', name: 'Device Trust', description: 'Trusted device management', status: 'active', category: 'session', icon: <Smartphone className="h-4 w-4" /> },
    { id: '7', name: 'Threat Detection', description: 'Real-time threat monitoring', status: 'active', category: 'threat', icon: <AlertTriangle className="h-4 w-4" /> },
    { id: '8', name: 'Anomaly Detection', description: 'Unusual behavior detection', status: 'active', category: 'threat', icon: <Activity className="h-4 w-4" /> },
    { id: '9', name: 'Rate Limiting', description: 'Request throttling', status: 'active', category: 'threat', icon: <RefreshCw className="h-4 w-4" /> },
    { id: '10', name: 'Geo-Blocking', description: 'Country-based access control', status: 'inactive', category: 'access', icon: <Globe className="h-4 w-4" /> },
    { id: '11', name: 'VPN Detection', description: 'VPN/proxy identification', status: 'warning', category: 'access', icon: <Globe className="h-4 w-4" /> },
    { id: '12', name: 'IP Reputation', description: 'IP risk assessment', status: 'active', category: 'access', icon: <Shield className="h-4 w-4" /> },
    { id: '13', name: 'File Upload Validation', description: 'Type/size verification', status: 'active', category: 'data', icon: <FileCheck className="h-4 w-4" /> },
    { id: '14', name: 'Input Sanitization', description: 'XSS/injection prevention', status: 'active', category: 'data', icon: <Shield className="h-4 w-4" /> },
    { id: '15', name: 'CAPTCHA Protection', description: 'Bot prevention', status: 'active', category: 'bot', icon: <Shield className="h-4 w-4" /> },
    { id: '16', name: 'Security Headers', description: 'CSP/HSTS configuration', status: 'active', category: 'headers', icon: <Lock className="h-4 w-4" /> },
    { id: '17', name: 'Audit Logging', description: 'Activity tracking', status: 'active', category: 'audit', icon: <Activity className="h-4 w-4" /> },
    { id: '18', name: 'Account Lockout', description: 'Brute force protection', status: 'active', category: 'auth', icon: <Lock className="h-4 w-4" /> },
    { id: '19', name: 'Generic Auth Errors', description: 'Prevents user enumeration', status: 'active', category: 'auth', icon: <Shield className="h-4 w-4" /> },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />Needs Attention</Badge>;
      default:
        return null;
    }
  };

  const activeCount = securityFeatures.filter(f => f.status === 'active').length;
  const warningCount = securityFeatures.filter(f => f.status === 'warning').length;
  const inactiveCount = securityFeatures.filter(f => f.status === 'inactive').length;

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Security Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor and manage all security features
              </p>
            </div>
          </div>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Security Scan
          </Button>
        </div>

        {/* Security Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Security Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${securityScore * 2.51} 251`}
                      className="text-primary"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                    {securityScore}%
                  </span>
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Features</span>
                    <span className="font-medium text-green-600">{activeCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Needs Attention</span>
                    <span className="font-medium text-yellow-600">{warningCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inactive</span>
                    <span className="font-medium text-muted-foreground">{inactiveCount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Threats Blocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">1,247</p>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-4 w-4 text-destructive" />
                Failed Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">89</p>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audit">Audit Compliance</TabsTrigger>
            <TabsTrigger value="mfa">MFA Settings</TabsTrigger>
            <TabsTrigger value="lockout">Account Lockout</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Features by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {['Authentication & Access', 'Session Management', 'Threat Detection', 'Data Protection'].map((category, idx) => {
                const categoryKey = ['auth', 'session', 'threat', 'data'][idx];
                const categoryFeatures = securityFeatures.filter(f => 
                  categoryKey === 'auth' ? ['auth', 'access'].includes(f.category) :
                  categoryKey === 'threat' ? ['threat', 'bot'].includes(f.category) :
                  categoryKey === 'data' ? ['data', 'headers', 'audit'].includes(f.category) :
                  f.category === categoryKey
                );

                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-lg">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categoryFeatures.map((feature) => (
                        <div
                          key={feature.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-background rounded">
                              {feature.icon}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{feature.name}</p>
                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                            </div>
                          </div>
                          {getStatusBadge(feature.status)}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <AuditComplianceTab />
          </TabsContent>

          <TabsContent value="mfa">
            <MfaManagement />
          </TabsContent>

          <TabsContent value="lockout">
            <AccountLockoutPanel />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SecurityDashboard;
