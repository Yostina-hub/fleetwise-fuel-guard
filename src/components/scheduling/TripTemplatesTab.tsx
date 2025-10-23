import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Trash2, Copy, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export const TripTemplatesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["trip-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("trip_templates")
        .select(`
          *,
          creator:profiles!trip_templates_created_by_fkey(email),
          pickup_geofence:geofences!trip_templates_pickup_geofence_id_fkey(name),
          drop_geofence:geofences!trip_templates_drop_geofence_id_fkey(name)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await (supabase as any)
        .from("trip_templates")
        .update({ is_active: false })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-templates"] });
      toast({
        title: "Template deleted",
        description: "Trip template has been removed.",
      });
    },
  });

  const useTemplate = (template: any) => {
    // Store template data in session storage for the create dialog to use
    sessionStorage.setItem("trip_template", JSON.stringify(template));
    toast({
      title: "Template loaded",
      description: "Open 'New Trip Request' to use this template.",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading templates...</div>
        </CardContent>
      </Card>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trip Templates</CardTitle>
          <CardDescription>
            Save frequently used trip requests as templates for quick access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No templates yet</p>
            <p className="text-sm">Create a trip request and save it as a template</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Trip Templates ({templates.length})
        </CardTitle>
        <CardDescription>
          Reuse saved trip request templates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template: any) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">
                  {template.template_name}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate">{template.purpose}</div>
                  {template.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-xs">
                      {template.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    <div>Passengers: {template.passengers}</div>
                    {template.required_class && (
                      <div className="text-muted-foreground">
                        Class: {template.required_class}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {template.is_recurring ? (
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="w-3 h-3" />
                      Recurring
                    </Badge>
                  ) : (
                    <Badge variant="outline">One-time</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(template.created_at), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => useTemplate(template)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Use
                    </Button>
                    {template.created_by === user?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteTemplate.mutate(template.id)}
                        disabled={deleteTemplate.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
