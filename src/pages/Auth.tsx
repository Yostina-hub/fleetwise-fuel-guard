import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { progressiveDelay } from "@/lib/security/progressiveDelay";
import { loginAlerts } from "@/lib/security/loginAlerts";
import { sessionManager } from "@/lib/security/sessionManagement";
import { verifyTotpCode } from "@/lib/security/totp";
import { ExecutiveTechBackground } from "@/components/dashboard/executive/ExecutiveTechBackground";
import { TechBackground } from "@/components/auth/TechBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Truck, Shield, CheckCircle, ArrowLeft, 
  MapPin, Gauge, BarChart3, Lock, Eye, EyeOff,
  Zap, Globe, Wifi, Server
} from "lucide-react";
import ethioTelecomBg from "@/assets/ethio-telecom-bg.webp";
import ethioTelecomCyberBg from "@/assets/ethio-telecom-cyber-bg.webp";
import { KeyRound } from "lucide-react";
import { getPostLoginPath } from "@/lib/auth/postLoginRedirect";
import { friendlyToastError } from "@/lib/errorMessages";

/**
 * Resolve the correct landing route for a freshly authenticated user.
 * Drivers go to /driver-portal; everyone else goes to /. Roles are read
 * directly from `user_roles` to avoid racing the async AuthContext refresh.
 */
async function resolveLandingPath(userId: string | undefined | null): Promise<string> {
  if (!userId) return "/";
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return getPostLoginPath((data as { role: string }[] | null) ?? []);
  } catch {
    return "/";
  }
}

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  
  // 2FA state
  const [pending2FA, setPending2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [pending2FAUserId, setPending2FAUserId] = useState<string | null>(null);
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [pending2FACredentials, setPending2FACredentials] = useState<{ email: string; password: string } | null>(null);
  const checking2FARef = useRef(false);

  // Redirect if already logged in (but not during 2FA check)
  useEffect(() => {
    if (user && !pending2FA && !checking2FARef.current) {
      void resolveLandingPath(user.id).then((path) => navigate(path));
    }
  }, [user, navigate, pending2FA]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const normalizedEmail = email.trim().toLowerCase();

    // Progressive delay: exponential backoff for failed attempts (server-side lockout + client defense-in-depth)
    const delayCheck = progressiveDelay.shouldDelay(normalizedEmail);
    if (delayCheck.delay) {
      toast({
        title: "Too Many Attempts",
        description: delayCheck.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Pre-check server-side lockout BEFORE attempting sign-in
    try {
      const { data: lockStatus } = await supabase.rpc("check_account_lockout", {
        p_email: normalizedEmail,
      });
      const lockRow = lockStatus?.[0];
      if (lockRow?.is_locked) {
        const until = new Date(lockRow.lockout_until).toLocaleTimeString();
        progressiveDelay.recordFailedAttempt(normalizedEmail);
        toast({
          title: "Account Locked",
          description: `Too many failed attempts. Try again after ${until}.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    } catch {
      // If pre-check fails, proceed with login attempt
    }

    // Set flag to prevent auto-redirect while we check 2FA
    checking2FARef.current = true;
    const { error } = await signIn(normalizedEmail, password);

    if (error) {
      checking2FARef.current = false;
      // Record failed attempt in progressive delay (client-side exponential backoff)
      progressiveDelay.recordFailedAttempt(normalizedEmail);
      // Record in server-side lockout table
      void (async () => { try { await supabase.rpc("record_failed_login", {
        p_email: normalizedEmail,
        p_ip_address: "0.0.0.0",
        p_max_attempts: 5,
        p_lockout_minutes: 15,
      }); } catch {} })();
      // Record in login alerts (security dashboard)
      loginAlerts.recordLogin("unknown", false);
      // Generic message - don't reveal whether email exists
      toast({
        title: "Authentication Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } else {
      // Clear all lockout state on success
      progressiveDelay.resetAttempts(normalizedEmail);
      void (async () => { try { await supabase.rpc("clear_failed_login", { p_email: normalizedEmail }); } catch {} })();
      
      // Check if user has 2FA enabled
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        loginAlerts.recordLogin(userId, true);
        sessionManager.registerSession(userId);
        
        try {
          const { data: twoFactor } = await supabase
            .from("two_factor_settings")
            .select("is_enabled, secret_encrypted")
            .eq("user_id", userId)
            .maybeSingle();
          
          if (twoFactor?.is_enabled && twoFactor?.secret_encrypted) {
            // Sign out temporarily - user must complete 2FA first
            await supabase.auth.signOut();
            setPending2FA(true);
            setPending2FAUserId(userId);
            setPending2FACredentials({ email: normalizedEmail, password });
            setTotpCode("");
            toast({
              title: "2FA Required",
              description: "Enter your authenticator code to continue.",
            });
            setLoading(false);
            return;
          }
        } catch {
          // If 2FA check fails, allow login
        }
      }

      checking2FARef.current = false;
      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      });
      const landing = await resolveLandingPath(userId);
      navigate(landing);
    }

    setLoading(false);
  };

  const handle2FAVerify = async () => {
    if (totpCode.length !== 6) {
      toast({ title: "Invalid Code", description: "Enter a 6-digit code.", variant: "destructive" });
      return;
    }
    setVerifying2FA(true);

    try {
      // Get the stored secret for this user
      // We need to sign back in first to access the data
      if (!pending2FACredentials) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        setPending2FA(false);
        setVerifying2FA(false);
        return;
      }

      // Re-authenticate
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: pending2FACredentials.email,
        password: pending2FACredentials.password,
      });

      if (reAuthError) {
        toast({ title: "Authentication failed", description: "Please try again.", variant: "destructive" });
        setPending2FA(false);
        setVerifying2FA(false);
        return;
      }

      // Fetch the 2FA secret
      const { data: twoFactor } = await supabase
        .from("two_factor_settings")
        .select("secret_encrypted, backup_codes")
        .eq("user_id", pending2FAUserId!)
        .maybeSingle();

      if (!twoFactor?.secret_encrypted) {
        // 2FA was disabled in the meantime, allow through
        toast({ title: "Welcome back!", description: "Signed in successfully." });
        const landing2 = await resolveLandingPath(pending2FAUserId);
        navigate(landing2);
        setVerifying2FA(false);
        return;
      }

      // Verify TOTP code using RFC-compatible algorithm
      const isValidTotp = await verifyTotpCode(twoFactor.secret_encrypted, totpCode);
      
      // Also check backup codes
      let usedBackupCode = false;
      if (!isValidTotp && twoFactor.backup_codes) {
        const codes = twoFactor.backup_codes as string[];
        const codeIndex = codes.indexOf(totpCode);
        if (codeIndex >= 0) {
          usedBackupCode = true;
          // Remove used backup code
          const updatedCodes = [...codes];
          updatedCodes.splice(codeIndex, 1);
          await supabase
            .from("two_factor_settings")
            .update({ backup_codes: updatedCodes, last_used_at: new Date().toISOString() })
            .eq("user_id", pending2FAUserId!);
        }
      }

      if (isValidTotp || usedBackupCode) {
        // Update last_used_at
        if (isValidTotp) {
          await supabase
            .from("two_factor_settings")
            .update({ last_used_at: new Date().toISOString() })
            .eq("user_id", pending2FAUserId!);
        }

        setPending2FA(false);
        setPending2FACredentials(null);
        toast({
          title: "Welcome back!",
          description: usedBackupCode
            ? "Signed in with backup code. Consider regenerating codes."
            : "Two-factor verification successful.",
        });
        const landing3 = await resolveLandingPath(pending2FAUserId);
        navigate(landing3);
      } else {
        // Wrong code - sign out again
        await supabase.auth.signOut();
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive",
        });
        setTotpCode("");
      }
    } catch (err) {
      console.error("2FA verification error:", err);
      friendlyToastError(null, { title: "Verification failed. Please try again." });
    }
    
    setVerifying2FA(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Rate limit signup attempts (Finding #1: batch user registration prevention)
    const lastSignup = sessionStorage.getItem('last_signup_attempt');
    if (lastSignup && Date.now() - parseInt(lastSignup) < 10000) {
      toast({
        title: "Please Wait",
        description: "You can only register once every 10 seconds.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const fullName = formData.get("fullName") as string;

    if (password !== confirmPassword) {
      friendlyToastError(null, { title: "Passwords do not match" });
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    sessionStorage.setItem('last_signup_attempt', Date.now().toString());
    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        title: "Registration Error",
        description: "Unable to create account. Please check your details and try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account before signing in.",
      });
    }

    setLoading(false);
  };

  const features = [
    { icon: Shield, text: "Enterprise-grade security", color: "text-[#8DC63F]" },
    { icon: MapPin, text: "Real-time GPS tracking", color: "text-cyan-400" },
    { icon: Gauge, text: "Advanced fuel monitoring", color: "text-amber-400" },
    { icon: BarChart3, text: "Powerful analytics", color: "text-blue-400" }
  ];

  const stats = [
    { value: "2000+", label: "Active Vehicles", icon: Truck },
    { value: "99.9%", label: "System Uptime", icon: Server },
    { value: "50+", label: "Countries", icon: Globe },
  ];

  return (
    <div className="h-screen relative overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Theme-based backgrounds */}
      {theme === 'cyber' ? (
        <>
          {/* Cyber theme: Futuristic tech corridor background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${ethioTelecomCyberBg})`,
            }}
          />
          {/* Cyan glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 via-transparent to-[#0a1628]/40 z-[1]" />
        </>
      ) : (
        <>
          {/* Dark/Light themes: Ethio Telecom Background */}
          <div
            className="absolute inset-0 bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url(${ethioTelecomBg})`,
              backgroundPosition: "left top",
            }}
          />
          {/* Animated particles overlay */}
          <div className="absolute inset-0 z-[1]">
            <ExecutiveTechBackground />
          </div>
          {/* Subtle overlay for better readability */}
          <div className="absolute inset-0 bg-surface-deep/20 z-[2]" />
        </>
      )}

      <div className="relative z-10 min-h-full grid lg:grid-cols-2">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:flex flex-col justify-between p-12 pt-16 pl-24">
          <div className="mt-20">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-12 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-[#8DC63F]/40 rounded-2xl blur-xl animate-pulse" />
                <div className="relative p-4 bg-gradient-to-br from-[#8DC63F] to-[#6ba32d] rounded-2xl shadow-lg shadow-[#8DC63F]/30">
                  <Truck className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  FleetTrack FMS
                </h1>
                <p className="text-cyan-300/80 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Enterprise Fleet Management
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4 mt-8">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-cyan-400" />
                Next-Generation Fleet Control
              </h2>
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-4 p-4 rounded-xl bg-surface-overlay/40 backdrop-blur-sm border border-surface-border/60 hover:border-[#8DC63F]/50 hover:bg-surface-overlay/60 transition-all duration-300 animate-fade-in group cursor-default"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-surface-overlay/60 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <span className="text-lg text-surface-foreground/90 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-6">
            <div className="flex gap-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="w-4 h-4 text-[#8DC63F]" />
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                  </div>
                  <div className="text-sm text-surface-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
            
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <p className="text-sm text-surface-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Trusted by leading logistics companies worldwide
            </p>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="flex items-center justify-center p-4 lg:p-12">
          <div className="w-full max-w-md">
            <Card className="border border-surface-border/80 shadow-2xl shadow-black/50 backdrop-blur-xl bg-surface-deep/80 animate-scale-in overflow-hidden">
              {/* Card glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-[#8DC63F]/5 pointer-events-none" />
              
              {pending2FA ? (
                <>
                  <CardHeader className="space-y-1 pb-6 relative">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-gradient-to-br from-[#8DC63F] to-[#6ba32d] rounded-2xl shadow-lg shadow-[#8DC63F]/30">
                        <KeyRound className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl text-center font-bold text-white">
                      Two-Factor Authentication
                    </CardTitle>
                    <CardDescription className="text-center text-base text-surface-muted-foreground">
                      Enter the 6-digit code from your authenticator app
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="totp-code" className="text-sm font-medium text-surface-foreground/80">
                        Verification Code
                      </Label>
                      <Input
                        id="totp-code"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="h-14 text-center text-2xl font-mono tracking-[0.5em] bg-surface-overlay/40 border-surface-border/80 text-white placeholder:text-white/30 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20"
                        maxLength={6}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && totpCode.length === 6) handle2FAVerify();
                        }}
                      />
                      <p className="text-xs text-surface-foreground/40 text-center mt-2">
                        You can also enter a backup recovery code
                      </p>
                    </div>

                    <Button
                      onClick={handle2FAVerify}
                      className="w-full h-12 gap-2 text-base font-semibold bg-gradient-to-r from-[#8DC63F] to-[#6ba32d] hover:from-[#7ab534] hover:to-[#5a9226] text-white shadow-lg shadow-[#8DC63F]/25"
                      disabled={totpCode.length !== 6 || verifying2FA}
                    >
                      {verifying2FA ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          Verify & Sign In
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => { setPending2FA(false); setTotpCode(""); setPending2FACredentials(null); }}
                      className="w-full text-center text-sm text-surface-muted-foreground hover:text-surface-foreground/80 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to sign in
                    </button>
                  </CardContent>
                </>
              ) : (
                <>
              <CardHeader className="space-y-1 pb-6 relative">
                {/* Mobile branding */}
                <div className="flex lg:hidden items-center justify-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-[#8DC63F] to-[#6ba32d] rounded-xl shadow-lg">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">FleetTrack FMS</span>
                </div>
                
                <CardTitle className="text-2xl text-center font-bold text-white">
                  {activeTab === "signin" ? "Welcome back" : "Get started"}
                </CardTitle>
                <CardDescription className="text-center text-base text-surface-muted-foreground">
                  {activeTab === "signin" 
                    ? "Sign in to your account to continue" 
                    : "Create your account to get started"
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative">
                <Tabs value="signin" className="w-full">
                  
                  <TabsContent value="signin" className="space-y-4 animate-fade-in">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium text-surface-foreground/80">Email Address</Label>
                        <Input
                          id="signin-email"
                          name="email"
                          type="email"
                          placeholder="you@company.com"
                          required
                          className="h-12 bg-surface-overlay/40 border-surface-border/80 text-white placeholder:text-surface-foreground/40 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20 transition-all duration-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-sm font-medium text-surface-foreground/80">Password</Label>
                          <button 
                            type="button"
                            onClick={async () => {
                              const email = (document.getElementById('signin-email') as HTMLInputElement)?.value;
                              if (!email) {
                                toast({
                                  title: "Email Required",
                                  description: "Please enter your email address first.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              // Block password reset for SSO/AD-managed accounts
                              const { data: ssoManaged } = await supabase.rpc("is_sso_managed_email", { _email: email });
                              if (ssoManaged === true) {
                                toast({
                                  title: "Managed by your organization",
                                  description: "This account signs in via your organization's identity provider (SSO/AD). Please reset your password through your IT portal.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              const { data: rlData } = await supabase.rpc("check_rate_limit", {
                                p_client_id: email,
                                p_function_name: "password_reset",
                                p_max_requests: 3,
                                p_window_seconds: 300,
                              });
                              const rlRow = (rlData as any)?.[0];
                              if (rlRow && !rlRow.allowed) {
                                toast({
                                  title: "Please Wait",
                                  description: "Too many reset requests. Please wait a few minutes.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              const ALLOWED_RESET_EMAILS = ["abel.birara@gmail.com", "eshibel@gmail.com"];
                              const normalizedResetEmail = email.trim().toLowerCase();
                              if (!ALLOWED_RESET_EMAILS.includes(normalizedResetEmail)) {
                                toast({
                                  title: "Password Reset Email Sent",
                                  description: "If an account exists with this email, you will receive a reset link.",
                                });
                                return;
                              }
                              supabase.auth.resetPasswordForEmail(email, {
                                redirectTo: `${window.location.origin}/auth`,
                              }).catch(() => {});
                              toast({
                                title: "Password Reset Email Sent",
                                description: "If an account exists with this email, you will receive a reset link.",
                              });
                            }}
                            className="text-xs text-[#8DC63F] hover:text-[#8DC63F]/80 hover:underline transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            required
                            className="h-12 pr-12 bg-surface-overlay/40 border-surface-border/80 text-white placeholder:text-surface-foreground/40 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20 transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-muted-foreground hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-12 gap-2 text-base font-semibold bg-gradient-to-r from-[#8DC63F] to-[#6ba32d] hover:from-[#7ab534] hover:to-[#5a9226] text-white shadow-lg shadow-[#8DC63F]/25 hover:shadow-[#8DC63F]/40 transition-all duration-300" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            <Lock className="w-5 h-5" />
                            Sign In
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  {/* Signup tab removed - admin-only system (Finding #1 & #10) */}
                </Tabs>
              </CardContent>
                </>
              )}
            </Card>

            {/* Keyboard shortcut hint */}
            <p className="text-center text-xs text-surface-foreground/40 mt-6 hidden lg:block">
              Press <kbd className="px-1.5 py-0.5 bg-surface-overlay/60 rounded text-[10px] font-mono text-surface-muted-foreground">⌘K</kbd> anywhere for quick navigation
            </p>

            {/* Mobile features */}
            <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
              {features.slice(0, 2).map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 text-sm text-surface-foreground/70 p-3 bg-surface-overlay/40 rounded-lg border border-surface-border/60"
                >
                  <feature.icon className="w-4 h-4 text-[#8DC63F]" />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
