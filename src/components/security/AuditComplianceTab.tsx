import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Lock, 
  Users, 
  Server,
  FileWarning,
  ExternalLink
} from "lucide-react";

interface AuditFinding {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  status: 'resolved' | 'mitigated' | 'pending' | 'external';
  description: string;
  recommendation: string;
  implementedSolution?: string;
}

const AuditComplianceTab = () => {
  const findings: AuditFinding[] = [
    {
      id: 'VULN-001',
      title: 'User & Password Enumeration',
      severity: 'high',
      status: 'resolved',
      description: 'The login mechanism revealed whether a user exists through different error messages.',
      recommendation: 'Implement generic error messages for all authentication failures.',
      implementedSolution: 'Generic error messages implemented in Auth.tsx - all auth failures now return "Invalid email or password"'
    },
    {
      id: 'VULN-002',
      title: 'No Rate Limiting on Login',
      severity: 'medium',
      status: 'resolved',
      description: 'The login endpoint lacked rate limiting, allowing brute force attacks.',
      recommendation: 'Implement rate limiting with exponential backoff.',
      implementedSolution: 'Rate limiting implemented via rateLimiting.ts with configurable thresholds for auth, API, and export operations'
    },
    {
      id: 'VULN-003',
      title: 'Outdated OpenSSH Version',
      severity: 'medium',
      status: 'external',
      description: 'Server running OpenSSH version with known vulnerabilities.',
      recommendation: 'Update OpenSSH to latest stable version.',
      implementedSolution: 'Infrastructure-level issue - requires VPS/server administrator action'
    },
    {
      id: 'VULN-004',
      title: 'TLS 1.1 Deprecated Protocol',
      severity: 'medium',
      status: 'external',
      description: 'Server supports deprecated TLS 1.1 protocol.',
      recommendation: 'Disable TLS 1.0 and 1.1, enforce TLS 1.2+ only.',
      implementedSolution: 'Infrastructure-level issue - requires web server configuration update'
    },
    {
      id: 'REC-001',
      title: 'Input Validation & Sanitization',
      severity: 'info',
      status: 'resolved',
      description: 'Ensure all user inputs are properly validated and sanitized.',
      recommendation: 'Use DOMPurify or similar for HTML sanitization, implement input validation.',
      implementedSolution: 'Implemented via sanitization.ts with HTML escaping, URL validation, filename sanitization, and SQL injection prevention'
    },
    {
      id: 'REC-002',
      title: 'CAPTCHA Bot Protection',
      severity: 'info',
      status: 'resolved',
      description: 'Implement CAPTCHA to prevent automated attacks.',
      recommendation: 'Add CAPTCHA on login, signup, and password reset forms.',
      implementedSolution: 'Implemented via captcha.ts with math CAPTCHA, honeypot fields, timing analysis, and user behavior analysis'
    },
    {
      id: 'REC-003',
      title: 'Security Headers',
      severity: 'info',
      status: 'resolved',
      description: 'Implement HTTP security headers.',
      recommendation: 'Add CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers.',
      implementedSolution: 'Implemented via securityHeaders.ts with CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy'
    },
    {
      id: 'REC-004',
      title: 'Multi-Factor Authentication',
      severity: 'info',
      status: 'resolved',
      description: 'Implement MFA for additional security layer.',
      recommendation: 'Support TOTP authenticator apps, SMS, and backup codes.',
      implementedSolution: 'Implemented via MfaManagement.tsx component with TOTP, SMS, email, and backup code support'
    },
    {
      id: 'REC-005',
      title: 'Account Lockout Protection',
      severity: 'info',
      status: 'resolved',
      description: 'Implement account lockout after failed attempts.',
      recommendation: 'Lock accounts after configurable number of failed attempts.',
      implementedSolution: 'Implemented via AccountLockoutPanel.tsx with configurable policies and admin unlock capability'
    }
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Low</Badge>;
      case 'info':
        return <Badge variant="outline">Info</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'mitigated':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Shield className="h-3 w-3 mr-1" />Mitigated</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'external':
        return <Badge variant="outline"><ExternalLink className="h-3 w-3 mr-1" />External</Badge>;
      default:
        return null;
    }
  };

  const resolvedCount = findings.filter(f => f.status === 'resolved').length;
  const mitigatedCount = findings.filter(f => f.status === 'mitigated').length;
  const pendingCount = findings.filter(f => f.status === 'pending').length;
  const externalCount = findings.filter(f => f.status === 'external').length;
  const totalFindings = findings.length;
  const complianceScore = Math.round(((resolvedCount + mitigatedCount) / totalFindings) * 100);

  const vulnerabilities = findings.filter(f => f.id.startsWith('VULN'));
  const recommendations = findings.filter(f => f.id.startsWith('REC'));

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-primary">{complianceScore}%</div>
              <Progress value={complianceScore} className="flex-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{resolvedCount}</p>
            <p className="text-sm text-muted-foreground">of {totalFindings} findings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              External
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground">{externalCount}</p>
            <p className="text-sm text-muted-foreground">infrastructure level</p>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerabilities Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-destructive" />
            Identified Vulnerabilities
          </CardTitle>
          <CardDescription>
            Security vulnerabilities identified during penetration testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vulnerabilities.map((finding) => (
            <div
              key={finding.id}
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{finding.id}</code>
                  <h4 className="font-medium">{finding.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {getSeverityBadge(finding.severity)}
                  {getStatusBadge(finding.status)}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">{finding.description}</p>
              
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Recommendation:</div>
                <p className="text-sm">{finding.recommendation}</p>
              </div>
              
              {finding.implementedSolution && (
                <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg space-y-2">
                  <div className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Implementation:
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">{finding.implementedSolution}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Recommendations
          </CardTitle>
          <CardDescription>
            Best practices and security enhancements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((finding) => (
            <div
              key={finding.id}
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{finding.id}</code>
                  <h4 className="font-medium">{finding.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {getSeverityBadge(finding.severity)}
                  {getStatusBadge(finding.status)}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">{finding.description}</p>
              
              {finding.implementedSolution && (
                <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg space-y-2">
                  <div className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Implementation:
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">{finding.implementedSolution}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditComplianceTab;