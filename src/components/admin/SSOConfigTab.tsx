import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const SSOConfigTab = () => {
  const { organizationId } = useOrganization();
  const ITEMS_PER_PAGE = 10;

  const { data: ssoConfigs, isLoading } = useQuery({
    queryKey: ["sso_configurations", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sso_configurations")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(
    ssoConfigs?.length || 0,
    ITEMS_PER_PAGE
  );

  const paginatedConfigs = useMemo(() => {
    if (!ssoConfigs) return [];
    return ssoConfigs.slice(startIndex, endIndex);
  }, [ssoConfigs, startIndex, endIndex]);

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading SSO configurations">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Single Sign-On Configuration ({ssoConfigs?.length || 0})</h3>
          <p className="text-sm text-muted-foreground">
            Configure SAML 2.0 or OIDC authentication providers
          </p>
        </div>
        <Button aria-label="Add new SSO provider">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Add SSO Provider
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Auto-Provision</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedConfigs.map((config: any) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">{config.provider_name}</TableCell>
              <TableCell className="uppercase">{config.provider_name}</TableCell>
              <TableCell>
                {config.auto_provision_users ? (
                  <Badge variant="outline">Yes</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
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

      {ssoConfigs && ssoConfigs.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalItems={ssoConfigs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}

      {ssoConfigs?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" role="status" aria-label="No SSO providers configured">
          <p>No SSO providers configured</p>
          <p className="text-sm mt-2">Add SAML or OIDC providers for enterprise authentication</p>
        </div>
      )}
    </div>
  );
};

export default SSOConfigTab;
