import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Truck, Users, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchResult {
  type: 'vehicle' | 'driver' | 'geofence';
  id: string;
  title: string;
  subtitle: string;
}

const DashboardSearch = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  const searchAll = useCallback(async (searchQuery: string) => {
    if (!organizationId || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [vehiclesRes, driversRes, geofencesRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id, plate_number, make, model')
          .eq('organization_id', organizationId)
          .or(`plate_number.ilike.%${searchQuery}%,make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`)
          .limit(5),
        supabase
          .from('drivers')
          .select('id, first_name, last_name, license_number')
          .eq('organization_id', organizationId)
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,license_number.ilike.%${searchQuery}%`)
          .limit(5),
        supabase
          .from('geofences')
          .select('id, name, address')
          .eq('organization_id', organizationId)
          .or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
          .limit(5),
      ]);

      const allResults: SearchResult[] = [
        ...(vehiclesRes.data || []).map(v => ({
          type: 'vehicle' as const,
          id: v.id,
          title: v.plate_number,
          subtitle: `${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle',
        })),
        ...(driversRes.data || []).map(d => ({
          type: 'driver' as const,
          id: d.id,
          title: `${d.first_name} ${d.last_name}`,
          subtitle: d.license_number || 'Driver',
        })),
        ...(geofencesRes.data || []).map(g => ({
          type: 'geofence' as const,
          id: g.id,
          title: g.name,
          subtitle: g.address || 'Location',
        })),
      ];

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    searchAll(debouncedQuery);
  }, [debouncedQuery, searchAll]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    switch (result.type) {
      case 'vehicle':
        navigate('/fleet');
        break;
      case 'driver':
        navigate('/drivers');
        break;
      case 'geofence':
        navigate('/geofencing');
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'vehicle': return <Truck className="w-4 h-4" />;
      case 'driver': return <Users className="w-4 h-4" />;
      case 'geofence': return <MapPin className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-64 justify-start gap-2 text-muted-foreground"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Search vehicles, drivers, and geofences"
        >
          <Search className="w-4 h-4" />
          Search vehicles, drivers...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search..." 
            value={query}
            onValueChange={setQuery}
            aria-label="Search query"
          />
          <CommandList>
            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!loading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {getIcon(result.type)}
                      <div>
                        <p className="text-sm font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default DashboardSearch;
