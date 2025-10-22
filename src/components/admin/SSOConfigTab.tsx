import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const SSOConfigTab = () => {
  const { organizationId } = useOrganization();

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

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Single Sign-On (SSO) Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure SAML 2.0 or OIDC authentication providers
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
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
          {ssoConfigs?.map((config: any) => (
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

      {ssoConfigs?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No SSO providers configured</p>
          <p className="text-sm mt-2">Add SAML or OIDC providers for enterprise authentication</p>
        </div>
      )}
    </div>
  );
};

export default SSOConfigTab;
