import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, Shield, CheckCircle, ArrowLeft, 
  MapPin, Gauge, BarChart3, TrendingDown, Lock, Eye, EyeOff 
} from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if already logged in - use useEffect to avoid render-time navigation
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
      // Generic error message to prevent user enumeration
      toast({
        title: "Authentication Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged in successfully!",
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

    const { error } = await signUp(email, password, fullName);

    if (error) {
      // Generic error message to prevent user enumeration
      toast({
        title: "Registration Error",
        description: "Unable to create account. Please check your details and try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account created successfully! You can now log in.",
      });
      navigate("/");
    }

    setLoading(false);
  };

  const features = [
    { icon: Shield, text: "Enterprise-grade security" },
    { icon: MapPin, text: "Real-time GPS tracking" },
    { icon: Gauge, text: "Advanced fuel monitoring" },
    { icon: BarChart3, text: "Powerful analytics" }
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Branding & Features (ethio telecom Brand Colors) */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-lemon-green/20 via-lemon-green/10 to-background p-12 relative overflow-hidden">
        {/* Decorative elements - ethio telecom Brand */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-lemon-green/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-dark-blue/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-8 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>

          <div className="flex items-center gap-3 mb-6 animate-fade-in">
            <div className="p-3 bg-lemon-green/20 rounded-xl animate-float">
              <Truck className="w-10 h-10 text-lemon-green" />
            </div>
            <div>
              <h1 className="headline-large text-brand-black">FleetTrack FMS</h1>
              <p className="body-text text-muted-foreground">Enterprise Fleet Management</p>
            </div>
          </div>

          <div className="space-y-4 mt-12">
            <h2 className="headline-small text-brand-black mb-6">Why choose FleetTrack?</h2>
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-lemon-green/20 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-lemon-green" />
                </div>
                <span className="body-text text-lg text-brand-black">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              <TrendingDown className="w-3 h-3 mr-1" />
              10-25% Cost Reduction
            </Badge>
            <Badge variant="outline" className="text-sm">
              <CheckCircle className="w-3 h-3 mr-1" />
              1000+ Active Fleets
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Trusted by leading logistics companies worldwide
          </p>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex items-center justify-center p-4 lg:p-12 bg-background">
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

          <Card className="border-2 shadow-xl animate-scale-in">
            <CardHeader className="space-y-1 pb-6">
              {/* Mobile branding */}
              <div className="flex lg:hidden items-center justify-center gap-2 mb-4">
                <div className="p-2 bg-lemon-green/20 rounded-lg">
                  <Truck className="w-6 h-6 text-lemon-green" />
                </div>
                <span className="headline-small">FleetTrack FMS</span>
              </div>
              
              <CardTitle className="headline-small text-center">Welcome</CardTitle>
              <CardDescription className="body-text text-center">
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email Address</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        required
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <button 
                          type="button"
                          onClick={() => {
                            const email = (document.getElementById('signin-email') as HTMLInputElement)?.value;
                            if (email) {
                              import('@/integrations/supabase/client').then(({ supabase }) => {
                                supabase.auth.resetPasswordForEmail(email, {
                                  redirectTo: `${window.location.origin}/auth`,
                                }).then(({ error }) => {
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
                                });
                              });
                            } else {
                              toast({
                                title: "Email Required",
                                description: "Please enter your email address first.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="text-xs text-primary hover:underline"
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
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 gap-2" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
                        required
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email Address</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        required
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Must be at least 6 characters
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-confirm"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 gap-2" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
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

          {/* Mobile features */}
          <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
            {features.slice(0, 2).map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <feature.icon className="w-4 h-4 text-lemon-green" />
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
