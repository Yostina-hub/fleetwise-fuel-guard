import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface LanguageSettingsTabProps {
  getVal: (category: string, key: string) => any;
  saveSetting: (category: string, key: string, value: any) => void;
}

const LanguageSettingsTab = ({ getVal, saveSetting }: LanguageSettingsTabProps) => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    saveSetting("general", "language", value);
    toast.success("Language updated");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Language & Localization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 max-w-lg">
          <div className="space-y-2">
            <Label>Application Language</Label>
            <Select value={getVal("general", "language") || "en"} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                <SelectItem value="or">Afaan Oromoo (Oromifa)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={getVal("general", "timezone") || "Africa/Addis_Ababa"} onValueChange={v => saveSetting("general", "timezone", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Addis_Ababa">Africa/Addis Ababa (EAT)</SelectItem>
                <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select value={getVal("general", "date_format") || "dd/MM/yyyy"} onValueChange={v => saveSetting("general", "date_format", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={getVal("general", "currency") || "ETB"} onValueChange={v => saveSetting("general", "currency", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETB">ETB (Br) - Ethiopian Birr</SelectItem>
                <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Distance Unit</Label>
            <Select value={getVal("general", "distance_unit") || "km"} onValueChange={v => saveSetting("general", "distance_unit", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers (km)</SelectItem>
                <SelectItem value="mi">Miles (mi)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>RTL Layout (for supported languages)</Label>
            <Switch
              checked={getVal("general", "rtl_enabled") || false}
              onCheckedChange={v => saveSetting("general", "rtl_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LanguageSettingsTab;
