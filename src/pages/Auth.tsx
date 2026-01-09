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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ParticleBackground } from "@/components/auth/ParticleBackground";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { 
  Truck, Shield, CheckCircle, ArrowLeft, 
  MapPin, Gauge, BarChart3, TrendingDown, Lock, Eye, EyeOff,
  Sparkles, Zap, Globe, Users
} from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
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
    { icon: Shield, text: "Enterprise-grade security", color: "text-success" },
    { icon: MapPin, text: "Real-time GPS tracking", color: "text-secondary" },
    { icon: Gauge, text: "Advanced fuel monitoring", color: "text-warning" },
    { icon: BarChart3, text: "Powerful analytics", color: "text-primary" }
  ];

  const stats = [
    { value: "2000+", label: "Active Vehicles" },
    { value: "99.9%", label: "Uptime" },
    { value: "50+", label: "Countries" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative z-10">
        {/* Decorative gradient orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-secondary/20 rounded-full blur-[120px]" />
        
        <div className="relative z-10">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-8 gap-2 hover:bg-primary/10 transition-all duration-300 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Button>

          {/* Logo with glow effect */}
          <div className="flex items-center gap-4 mb-8 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/40 rounded-2xl blur-xl animate-pulse" />
              <div className="relative p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg">
                <Truck className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                FleetTrack FMS
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Enterprise Fleet Management
              </p>
            </div>
          </div>

          {/* Features with stagger animation */}
          <div className="space-y-4 mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Why choose FleetTrack?
            </h2>
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 animate-fade-in group cursor-default"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <span className="text-lg text-foreground font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats and trust badges */}
        <div className="relative z-10 space-y-6">
          {/* Stats row */}
          <div className="flex gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
          
          <Separator className="bg-border/50" />
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3 bg-card/50 backdrop-blur-sm">
              <TrendingDown className="w-3.5 h-3.5 text-success" />
              10-25% Cost Reduction
            </Badge>
            <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3 bg-card/50 backdrop-blur-sm">
              <Users className="w-3.5 h-3.5 text-secondary" />
              1000+ Active Fleets
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Trusted by leading logistics companies worldwide
          </p>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex items-center justify-center p-4 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile back button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-6 lg:hidden gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>

          <Card className="border-2 border-border/50 shadow-2xl shadow-primary/5 backdrop-blur-xl bg-card/95 animate-scale-in overflow-hidden">
            {/* Card glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            
            <CardHeader className="space-y-1 pb-6 relative">
              {/* Mobile branding */}
              <div className="flex lg:hidden items-center justify-center gap-3 mb-4">
                <div className="p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                  <Truck className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">FleetTrack FMS</span>
              </div>
              
              <CardTitle className="text-2xl text-center font-bold">
                {activeTab === "signin" ? "Welcome back" : "Get started"}
              </CardTitle>
              <CardDescription className="text-center text-base">
                {activeTab === "signin" 
                  ? "Sign in to your account to continue" 
                  : "Create your account to get started"
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50">
                  <TabsTrigger value="signin" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300">
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4 animate-fade-in">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        required
                        className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
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
                          className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
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
                          className="h-12 pr-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 gap-2 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
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
                      <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                      <Input
                        id="signup-name"
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
                        required
                        className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        required
                        className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
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
                          className="h-12 pr-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {/* Password Strength Meter */}
                      <PasswordStrengthMeter password={signupPassword} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-confirm"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          minLength={8}
                          className="h-12 pr-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 gap-2 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Create Account
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      By signing up, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Keyboard shortcut hint */}
          <p className="text-center text-xs text-muted-foreground mt-6 hidden lg:block">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd> anywhere for quick navigation
          </p>

          {/* Mobile features */}
          <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
            {features.slice(0, 2).map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-card/50 rounded-lg border border-border/50"
              >
                <feature.icon className="w-4 h-4 text-primary" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;