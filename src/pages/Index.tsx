import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Truck, MapPin, Gauge, Shield, TrendingDown, BarChart3, 
  Zap, Clock, Users, CheckCircle, ArrowRight, Sparkles 
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MapPin,
      title: "Real-Time GPS Tracking",
      description: "Monitor your entire fleet with live location updates and intelligent route optimization."
    },
    {
      icon: Gauge,
      title: "Fuel Monitoring",
      description: "Track fuel consumption, detect theft, and reduce costs with advanced analytics."
    },
    {
      icon: Shield,
      title: "Driver Behavior Analysis",
      description: "Improve safety with comprehensive driver scoring and behavior monitoring."
    },
    {
      icon: Clock,
      title: "Maintenance Management",
      description: "Automated scheduling and tracking to keep your fleet running smoothly."
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Make data-driven decisions with powerful reporting and insights."
    },
    {
      icon: Zap,
      title: "Instant Alerts",
      description: "Get real-time notifications for critical events and incidents."
    }
  ];

  const stats = [
    { value: "10-25%", label: "Cost Reduction" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
    { value: "1000+", label: "Active Fleets" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              FleetTrack FMS
            </span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-32 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 rounded-3xl blur-3xl" />
        
        <div className="relative text-center max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-scale-in">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Enterprise Fleet Management</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
            Transform Your Fleet Operations
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Complete visibility, control, and optimization for your fleet with real-time tracking, 
            fuel monitoring, and advanced analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={() => navigate("/dashboard")} className="gap-2 text-lg px-8 hover-scale">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center border-2 hover:border-primary/50 transition-all hover-scale">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to Manage Your Fleet
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to optimize every aspect of your fleet operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover-scale animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-b from-transparent to-muted/30 rounded-3xl">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Why Choose FleetTrack FMS?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              "Reduce operational costs by 10-25%",
              "Improve driver safety and compliance",
              "Optimize routes and fuel efficiency",
              "Real-time visibility across your fleet",
              "Automated maintenance scheduling",
              "24/7 monitoring and support"
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20">
          <CardContent className="text-center py-16 px-6">
            <Users className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Optimize Your Fleet?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of companies using FleetTrack FMS to reduce costs and improve efficiency
            </p>
            <Button size="lg" onClick={() => navigate("/dashboard")} className="gap-2 text-lg px-8 hover-scale">
              Start Your Free Trial <ArrowRight className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 FleetTrack FMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
