import { useState, useEffect } from "react";
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
import { ExecutiveTechBackground } from "@/components/dashboard/executive/ExecutiveTechBackground";
import { TechBackground } from "@/components/auth/TechBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Truck, Shield, CheckCircle, ArrowLeft, 
  MapPin, Gauge, BarChart3, Lock, Eye, EyeOff,
  Zap, Globe, Wifi, Server
} from "lucide-react";
import ethioTelecomBg from "@/assets/ethio-telecom-bg.png";
import ethioTelecomCyberBg from "@/assets/ethio-telecom-cyber-bg.png";

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

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Authentication Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      });
      navigate("/");
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const fullName = formData.get("fullName") as string;

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
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
        description: "Welcome to FleetTrack FMS. You're now signed in.",
      });
      navigate("/");
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
    <div className="min-h-screen relative overflow-hidden">
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
          <div className="absolute inset-0 bg-[#001a33]/20 z-[2]" />
        </>
      )}

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
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
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#8DC63F]/50 hover:bg-white/10 transition-all duration-300 animate-fade-in group cursor-default"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <span className="text-lg text-white/90 font-medium">{feature.text}</span>
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
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
            
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <p className="text-sm text-white/50 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Trusted by leading logistics companies worldwide
            </p>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="flex items-center justify-center p-4 lg:p-12">
          <div className="w-full max-w-md">
            <Card className="border border-white/20 shadow-2xl shadow-black/50 backdrop-blur-xl bg-[#001a33]/80 animate-scale-in overflow-hidden">
              {/* Card glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-[#8DC63F]/5 pointer-events-none" />
              
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
                <CardDescription className="text-center text-base text-white/60">
                  {activeTab === "signin" 
                    ? "Sign in to your account to continue" 
                    : "Create your account to get started"
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-white/5 border border-white/10">
                    <TabsTrigger 
                      value="signin" 
                      className="text-white/70 data-[state=active]:bg-[#8DC63F] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup" 
                      className="text-white/70 data-[state=active]:bg-[#8DC63F] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="space-y-4 animate-fade-in">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium text-white/80">Email Address</Label>
                        <Input
                          id="signin-email"
                          name="email"
                          type="email"
                          placeholder="you@company.com"
                          required
                          className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20 transition-all duration-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-sm font-medium text-white/80">Password</Label>
                          <button 
                            type="button"
                            onClick={async () => {
                              const email = (document.getElementById('signin-email') as HTMLInputElement)?.value;
                              if (email) {
                                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                  redirectTo: `${window.location.origin}/auth`,
                                });
                                if (error) {
                                  toast({
                                    title: "Error",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                } else {
                                  toast({
                                    title: "Password Reset Email Sent",
                                    description: "Check your email for a password reset link.",
                                  });
                                }
                              } else {
                                toast({
                                  title: "Email Required",
                                  description: "Please enter your email address first.",
                                  variant: "destructive",
                                });
                              }
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
                            className="h-12 pr-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20 transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
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
                  
                  <TabsContent value="signup" className="space-y-4 animate-fade-in">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm font-medium text-white/80">Full Name</Label>
                        <Input
                          id="signup-name"
                          name="fullName"
                          type="text"
                          placeholder="John Doe"
                          required
                          className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20 transition-all duration-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium text-white/80">Email Address</Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          placeholder="you@company.com"
                          required
                          className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20 transition-all duration-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium text-white/80">Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            className="h-12 pr-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20 transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        
                        {/* Password Strength Meter */}
                        <PasswordStrengthMeter password={signupPassword} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm" className="text-sm font-medium text-white/80">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-confirm"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            className="h-12 pr-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#8DC63F] focus:ring-2 focus:ring-[#8DC63F]/20 transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                            Creating account...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Create Account
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-center text-white/50">
                        By signing up, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Keyboard shortcut hint */}
            <p className="text-center text-xs text-white/40 mt-6 hidden lg:block">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono text-white/60">⌘K</kbd> anywhere for quick navigation
            </p>

            {/* Mobile features */}
            <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
              {features.slice(0, 2).map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 text-sm text-white/70 p-3 bg-white/5 rounded-lg border border-white/10"
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
