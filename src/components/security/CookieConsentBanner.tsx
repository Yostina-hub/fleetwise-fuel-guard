import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "cookie_consent_accepted";

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = sessionStorage.getItem(CONSENT_KEY);
    if (!accepted) setVisible(true);
  }, []);

  const accept = (all: boolean) => {
    sessionStorage.setItem(CONSENT_KEY, all ? "all" : "essential");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <Card className="max-w-lg w-full pointer-events-auto shadow-lg border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <p className="text-sm">
                We use essential cookies for authentication and session management. No third-party
                tracking cookies are used. See our{" "}
                <a href="/privacy" className="text-primary underline">Privacy Policy</a> for details.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => accept(true)}>Accept All</Button>
                <Button size="sm" variant="outline" onClick={() => accept(false)}>Essential Only</Button>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => accept(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsentBanner;
