import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Mail, Key, Shield, QrCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface MfaMethod {
  id: string;
  type: 'totp' | 'sms' | 'email' | 'backup_codes';
  name: string;
  enabled: boolean;
  verified: boolean;
  lastUsed?: string;
}

export const MfaManagement = () => {
  const [mfaMethods, setMfaMethods] = useState<MfaMethod[]>([
    { id: '1', type: 'totp', name: 'Authenticator App', enabled: false, verified: false },
    { id: '2', type: 'sms', name: 'SMS Verification', enabled: false, verified: false },
    { id: '3', type: 'email', name: 'Email Verification', enabled: true, verified: true, lastUsed: '2024-01-15' },
    { id: '4', type: 'backup_codes', name: 'Backup Codes', enabled: false, verified: false },
  ]);
  
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toggleMethod = (methodId: string) => {
    setMfaMethods(prev => prev.map(m => {
      if (m.id === methodId) {
        if (!m.enabled && m.type === 'totp') {
          setShowTotpSetup(true);
          return m;
        }
        if (!m.enabled && m.type === 'backup_codes') {
          generateBackupCodes();
          return { ...m, enabled: true, verified: true };
        }
        return { ...m, enabled: !m.enabled };
      }
      return m;
    }));
  };

  const generateBackupCodes = () => {
    const codes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    setBackupCodes(codes);
    toast.success("Backup codes generated. Save them securely!");
  };

  const verifyTotp = () => {
    if (totpCode.length === 6) {
      setMfaMethods(prev => prev.map(m => 
        m.type === 'totp' ? { ...m, enabled: true, verified: true } : m
      ));
      setShowTotpSetup(false);
      setTotpCode('');
      toast.success("Authenticator app verified successfully!");
    } else {
      toast.error("Please enter a valid 6-digit code");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'totp': return <Smartphone className="h-5 w-5" />;
      case 'sms': return <Smartphone className="h-5 w-5" />;
      case 'email': return <Mail className="h-5 w-5" />;
      case 'backup_codes': return <Key className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
            Multi-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add extra layers of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {getMethodIcon(method.type)}
                </div>
                <div>
                  <p className="font-medium">{method.name}</p>
                  <div className="flex items-center gap-2">
                    {method.verified ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not configured
                      </Badge>
                    )}
                    {method.lastUsed && (
                      <span className="text-xs text-muted-foreground">
                        Last used: {method.lastUsed}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Switch
                checked={method.enabled}
                onCheckedChange={() => toggleMethod(method.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {showTotpSetup && (
        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" aria-hidden="true" />
              Setup Authenticator App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center p-4 bg-muted rounded-lg">
              <div className="w-48 h-48 bg-background border-2 border-dashed rounded-lg flex items-center justify-center" aria-label="QR code for authenticator app">
                <QrCode className="h-24 w-24 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter verification code</Label>
              <Input
                id="totp-code"
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest"
                aria-label="6-digit verification code"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTotpSetup(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={verifyTotp} className="flex-1">
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {backupCodes.length > 0 && (
        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" aria-hidden="true" />
              Backup Codes
            </CardTitle>
            <CardDescription>
              Save these codes in a secure location. Each code can only be used once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded font-mono text-sm"
                >
                  <span>{code}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCode(code)}
                    aria-label={`Copy backup code ${code}`}
                  >
                    {copiedCode === code ? (
                      <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                navigator.clipboard.writeText(backupCodes.join('\n'));
                toast.success("All codes copied to clipboard");
              }}
            >
              Copy All Codes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MfaManagement;
