import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Monitor, CheckCircle2, Share, MoreVertical, PlusSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Download className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t('install.title', 'Install FleetTrack')}</h1>
            <p className="text-muted-foreground text-xs">{t('install.subtitle', 'Access your fleet dashboard from your home screen')}</p>
          </div>
        </div>

        {isInstalled ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-6 flex items-center gap-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <div>
                <p className="font-semibold text-lg">{t('install.alreadyInstalled', 'App Already Installed!')}</p>
                <p className="text-sm text-muted-foreground">{t('install.alreadyInstalledDesc', 'FleetTrack is running as an installed app on this device.')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {deferredPrompt && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
                  <Smartphone className="w-12 h-12 text-primary shrink-0" />
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-semibold text-lg">{t('install.readyToInstall', 'Ready to Install')}</p>
                    <p className="text-sm text-muted-foreground">{t('install.readyDesc', 'One tap to add FleetTrack to your home screen. Works offline, loads instantly.')}</p>
                  </div>
                  <Button size="lg" onClick={handleInstall} className="gap-2 shrink-0">
                    <Download className="w-4 h-4" /> {t('install.installNow', 'Install Now')}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> {t('install.ios', 'iPhone / iPad')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
                    <p>{t('install.iosStep1', 'Open this page in Safari')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
                    <p className="flex items-center gap-1">{t('install.iosStep2', 'Tap the Share button')} <Share className="w-4 h-4 text-muted-foreground inline" /></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
                    <p className="flex items-center gap-1">{t('install.iosStep3', 'Select "Add to Home Screen"')} <PlusSquare className="w-4 h-4 text-muted-foreground inline" /></p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> {t('install.android', 'Android / Desktop')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
                    <p>{t('install.androidStep1', 'Open this page in Chrome')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
                    <p className="flex items-center gap-1">{t('install.androidStep2', 'Tap the menu')} <MoreVertical className="w-4 h-4 text-muted-foreground inline" /></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
                    <p>{t('install.androidStep3', 'Select "Install app" or "Add to Home Screen"')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('install.benefits', 'Why Install?')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {[
                    { icon: "⚡", label: t('install.fast', 'Instant Launch') },
                    { icon: "📱", label: t('install.fullscreen', 'Full Screen') },
                    { icon: "🔔", label: t('install.notifications', 'Notifications') },
                    { icon: "🏠", label: t('install.homescreen', 'Home Screen Icon') },
                  ].map((b, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 text-center">
                      <span className="text-2xl">{b.icon}</span>
                      <span className="font-medium">{b.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default InstallApp;
