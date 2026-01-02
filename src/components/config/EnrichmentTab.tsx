import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const ITEMS_PER_PAGE = 10;

const EnrichmentTab = () => {
  const { organizationId } = useOrganization();

  const { data: configs, isLoading } = useQuery({
    queryKey: ["enrichment_configs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrichment_configs")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(
    configs?.length || 0,
    ITEMS_PER_PAGE
  );

  const paginatedConfigs = useMemo(() => {
    if (!configs) return [];
    return configs.slice(startIndex, endIndex);
  }, [configs, startIndex, endIndex]);

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading enrichment configurations">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Data Enrichment Configuration ({configs?.length || 0})</h3>
          <p className="text-sm text-muted-foreground">
            Configure map-matching, geofence evaluation, and driver binding
          </p>
        </div>
        <Button aria-label="Add new enrichment configuration">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Add Config
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Config Name</TableHead>
            <TableHead>Geofencing</TableHead>
            <TableHead>Map Matching</TableHead>
            <TableHead>Driver Binding</TableHead>
            <TableHead>Geocoding</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedConfigs.map((config: any) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">
                {config.config_name}
                {config.is_default && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Default
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {config.enable_geofence_matching ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" aria-label="Geofencing enabled" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" aria-label="Geofencing disabled" />
                )}
              </TableCell>
              <TableCell>
                {config.enable_map_matching ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">
                      {config.map_provider}
                    </span>
                  </div>
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
              </TableCell>
              <TableCell>
                {config.enable_driver_binding ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
              </TableCell>
              <TableCell>
                {config.enable_reverse_geocoding ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
              </TableCell>
              <TableCell>
                {config.is_active ? (
                  <Badge variant="outline">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {configs && configs.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalItems={configs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}

      {configs?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" role="status" aria-label="No enrichment configurations found">
          <p>No enrichment configs found</p>
          <p className="text-sm mt-2">
            Create configs to enrich telemetry data
          </p>
        </div>
      )}
    </div>
  );
};

export default EnrichmentTab;
