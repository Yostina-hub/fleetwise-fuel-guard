import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, MapPin, Gauge, Shield, TrendingDown, BarChart3, 
  Zap, Clock, Users, CheckCircle, ArrowRight, Sparkles, Star,
  Building2, Headphones, Mail, Phone, Twitter, Linkedin, 
  Globe, Menu, X, Check, Award, Target, Workflow, Database,
  Lock, Bell, Calendar, FileText, Cpu, Cloud
} from "lucide-react";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const pricingPlans = [
    {
      name: "Starter",
      price: "$99",
      description: "Perfect for small fleets",
      features: [
        "Up to 10 vehicles",
        "Real-time GPS tracking",
        "Basic fuel monitoring",
        "Email support",
        "Mobile app access",
        "Monthly reports"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$299",
      description: "Ideal for growing businesses",
      features: [
        "Up to 50 vehicles",
        "Advanced GPS tracking",
        "Full fuel monitoring",
        "Driver behavior analysis",
        "Priority support 24/7",
        "Mobile app access",
        "Advanced analytics",
        "Custom alerts",
        "API access"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large-scale operations",
      features: [
        "Unlimited vehicles",
        "Enterprise GPS tracking",
        "Complete fuel management",
        "Full driver analytics",
        "Dedicated account manager",
        "Custom integrations",
        "White-label options",
        "SLA guarantees",
        "On-premise deployment"
      ],
      popular: false
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Fleet Manager, LogiTrans Inc",
      content: "FleetTrack FMS reduced our fuel costs by 23% in the first quarter. The real-time tracking has been a game-changer.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Operations Director, Swift Delivery",
      content: "The driver behavior analytics helped us improve safety scores by 40%. Best investment we've made.",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      role: "CEO, TransGlobal Logistics",
      content: "Seamless integration and incredible support. Our operational efficiency improved dramatically.",
      rating: 5
    }
  ];

  const integrations = [
    { name: "SAP", icon: Database },
    { name: "Oracle", icon: Cloud },
    { name: "Microsoft", icon: Cpu },
    { name: "Salesforce", icon: Globe },
    { name: "Slack", icon: Bell },
    { name: "QuickBooks", icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Enhanced Header */}
      <header className="border-b bg-background/95 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-8 h-8 text-primary animate-float" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                FleetTrack FMS
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Testimonials</a>
              <a href="#integrations" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Integrations</a>
            </nav>

            {/* Desktop Buttons */}
            <div className="hidden md:flex gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/dashboard")} className="gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-3 animate-fade-in">
              <a href="#features" className="block text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">Features</a>
              <a href="#pricing" className="block text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">Pricing</a>
              <a href="#testimonials" className="block text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">Testimonials</a>
              <a href="#integrations" className="block text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">Integrations</a>
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="ghost" onClick={() => navigate("/auth")} className="w-full">Sign In</Button>
                <Button onClick={() => navigate("/dashboard")} className="w-full gap-2">Get Started <ArrowRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
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
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4">Powerful Features</Badge>
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
              className="group hover:shadow-xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20 bg-muted/30 rounded-3xl my-20">
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4">Flexible Pricing</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Perfect Plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Scale with confidence. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative animate-slide-up ${
                plan.popular 
                  ? "border-2 border-primary shadow-2xl scale-105" 
                  : "hover:shadow-lg"
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full mt-6" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => navigate("/dashboard")}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4">Customer Stories</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Trusted by Industry Leaders
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See what our customers have to say about transforming their fleet operations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="animate-fade-in hover:shadow-lg transition-shadow"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                <div className="border-t pt-4">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="container mx-auto px-4 py-20 bg-gradient-to-b from-transparent to-muted/30 rounded-3xl">
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4">Seamless Integrations</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Works With Your Favorite Tools
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect FleetTrack FMS with the tools you already use
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
          {integrations.map((integration, index) => (
            <Card 
              key={index}
              className="flex items-center justify-center p-6 hover:shadow-lg hover:border-primary/50 transition-all animate-scale-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-center">
                <integration.icon className="w-8 h-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-xs font-medium">{integration.name}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Why Choose Us</Badge>
            <h2 className="text-4xl font-bold mb-4">
              The Complete Fleet Management Solution
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: TrendingDown, text: "Reduce operational costs by 10-25%" },
              { icon: Shield, text: "Improve driver safety and compliance" },
              { icon: Target, text: "Optimize routes and fuel efficiency" },
              { icon: Award, text: "Real-time visibility across your fleet" },
              { icon: Calendar, text: "Automated maintenance scheduling" },
              { icon: Headphones, text: "24/7 monitoring and support" }
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 animate-fade-in p-4 rounded-lg hover:bg-muted/50 transition-colors" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg pt-2">{benefit.text}</span>
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

      {/* Enhanced Footer */}
      <footer className="border-t mt-20 bg-muted/20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold">FleetTrack FMS</span>
              </div>
              <p className="text-muted-foreground mb-4">
                The most comprehensive fleet management system trusted by thousands of businesses worldwide.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Globe className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#integrations" className="text-muted-foreground hover:text-primary transition-colors">Integrations</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">API</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Press</a></li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Status</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Documentation</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 FleetTrack FMS. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
