import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  MapProvider,
  getAvailableProviders,
  getActiveProvider,
  setActiveProvider,
  storeMapApiKey,
  removeMapApiKey,
  isProviderConfigured,
  getStoredApiKey,
} from '@/lib/mapProviders';
import { Map, Check, Key, Trash2, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function MapProviderSettings() {
  const [active, setActive] = useState<MapProvider>(getActiveProvider());
  const [editingKey, setEditingKey] = useState<MapProvider | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const providers = getAvailableProviders();

  const handleActivate = (provider: MapProvider) => {
    if (!isProviderConfigured(provider)) {
      toast({
        title: 'API key required',
        description: `Please add an API key for ${provider} first.`,
        variant: 'destructive',
      });
      return;
    }
    setActiveProvider(provider);
    setActive(provider);
    toast({ title: `Map provider set to ${provider}` });
  };

  const handleSaveKey = (provider: MapProvider) => {
    if (!keyInput.trim()) return;
    storeMapApiKey(provider, keyInput.trim());
    setEditingKey(null);
    setKeyInput('');
    toast({ title: 'API key saved', description: `${provider} API key has been stored securely in session.` });
  };

  const handleRemoveKey = (provider: MapProvider) => {
    removeMapApiKey(provider);
    if (active === provider) {
      setActiveProvider('lemat');
      setActive('lemat');
    }
    toast({ title: 'API key removed' });
  };

  return (
    <Card className="glass-strong border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Map className="w-5 h-5 text-primary" />
          Map Provider
          <Badge variant="outline" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Session-only keys
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Lemat Map is the default. Add API keys for Mapbox or Google Maps for premium map tiles.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((p) => {
          const configured = isProviderConfigured(p.provider);
          const isActive = active === p.provider;
          const hasKey = !!getStoredApiKey(p.provider);
          const needsKey = p.provider !== 'lemat' && p.provider !== 'osm';

          return (
            <div
              key={p.provider}
              className={`p-4 rounded-xl border transition-colors ${
                isActive
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.label}</span>
                    {isActive && (
                      <Badge className="bg-primary/20 text-primary text-xs">Active</Badge>
                    )}
                    {p.provider === 'lemat' && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                    {needsKey && hasKey && (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                        <Key className="w-3 h-3 mr-1" /> Configured
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {needsKey && !hasKey && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingKey(p.provider);
                        setKeyInput('');
                      }}
                    >
                      <Key className="w-3 h-3 mr-1" /> Add Key
                    </Button>
                  )}
                  {needsKey && hasKey && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleRemoveKey(p.provider)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => handleActivate(p.provider)}
                    disabled={isActive}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3 h-3 mr-1" /> Active
                      </>
                    ) : (
                      'Use'
                    )}
                  </Button>
                </div>
              </div>

              {/* API Key Input */}
              {editingKey === p.provider && (
                <div className="mt-3 flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {p.provider === 'mapbox' ? 'Mapbox Access Token (pk.*)' : 'Google Maps API Key'}
                    </Label>
                    <Input
                      type="password"
                      placeholder={p.provider === 'mapbox' ? 'pk.eyJ1Ijoi...' : 'AIzaSy...'}
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <Button size="sm" onClick={() => handleSaveKey(p.provider)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingKey(null);
                        setKeyInput('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
