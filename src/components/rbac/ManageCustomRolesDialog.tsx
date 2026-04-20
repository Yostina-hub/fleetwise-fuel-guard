/**
 * ManageCustomRolesDialog
 * =======================
 * Full CRUD for organisation-defined custom roles. Sits beside the built-in
 * Postgres `app_role` enum — admins can create new role names, edit their
 * label/description, toggle active, and delete.
 *
 * Permissions:
 *   - super_admin: full access across all orgs.
 *   - org_admin:   manage roles inside their own organisation.
 *   - everyone else: dialog is hidden.
 *
 * Note: assigning permissions to custom roles is handled by the existing
 * permission matrix once a role exists — this dialog is the role registry.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, ShieldPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface CustomRole {
  id: string;
  organization_id: string | null;
  name: string;
  label: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_NAME_RE = /^[a-z][a-z0-9_]{1,49}$/;

const sanitizeName = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

const validate = (name: string, label: string) => {
  if (!name) return "Role name is required (e.g. 'inspector').";
  if (!ROLE_NAME_RE.test(name))
    return "Role name must start with a letter and contain only lowercase letters, digits, or underscores (2–50 chars).";
  if (!label || label.trim().length < 1)
    return "Display label is required (e.g. 'Field Inspector').";
  if (label.length > 80) return "Display label must be 80 characters or less.";
  return null;
};

export function ManageCustomRolesDialog({ open, onOpenChange }: Props) {
  const { organizationId, isSuperAdmin } = useOrganization();
  const qc = useQueryClient();

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<CustomRole | null>(null);

  const reset = () => {
    setEditingId(null);
    setName("");
    setLabel("");
    setDescription("");
    setIsActive(true);
  };

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["custom-roles", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("custom_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomRole[];
    },
    enabled: open,
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const cleanName = sanitizeName(name);
      const err = validate(cleanName, label);
      if (err) throw new Error(err);

      const payload = {
        organization_id: isSuperAdmin ? null : organizationId,
        name: cleanName,
        label: label.trim(),
        description: description.trim() || null,
        is_active: isActive,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("custom_roles")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("custom_roles")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Role updated" : "Role created");
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      reset();
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("custom_roles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role deleted");
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      setConfirmDelete(null);
      if (editingId === confirmDelete?.id) reset();
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  const startEdit = (r: CustomRole) => {
    setEditingId(r.id);
    setName(r.name);
    setLabel(r.label);
    setDescription(r.description ?? "");
    setIsActive(r.is_active);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldPlus className="w-5 h-5 text-primary" />
              Manage Custom Roles
            </DialogTitle>
            <DialogDescription>
              Create, edit, or remove organisation-defined roles. Built-in
              roles (Super Admin, Driver, etc.) are always available and not
              listed here.
            </DialogDescription>
          </DialogHeader>

          {/* Create / edit form */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {editingId ? "Edit Role" : "Create New Role"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Role Name (machine) <span className="text-destructive">*</span></Label>
                <Input
                  value={name}
                  onChange={(e) => setName(sanitizeName(e.target.value))}
                  placeholder="e.g. inspector"
                  className="h-9 font-mono text-sm"
                  maxLength={50}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Lowercase letters, digits, underscores. Cannot be changed after creation.
                </p>
              </div>
              <div>
                <Label className="text-xs">Display Label <span className="text-destructive">*</span></Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Field Inspector"
                  className="h-9"
                  maxLength={80}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Friendly name shown in pickers and badges.
                </p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional — what this role is responsible for."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label className="text-xs">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel edit
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => upsertMutation.mutate()}
                  disabled={upsertMutation.isPending}
                  className="gap-1"
                >
                  {upsertMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : editingId ? (
                    <Pencil className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {editingId ? "Save changes" : "Create role"}
                </Button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Existing Custom Roles ({roles.length})
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                No custom roles yet. Create one above to get started.
              </div>
            ) : (
              <div className="rounded-lg border divide-y">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{r.label}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {r.name}
                        </Badge>
                        {!r.is_active && (
                          <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                        )}
                        {r.organization_id === null && (
                          <Badge variant="default" className="text-[10px]">Global</Badge>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {r.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEdit(r)}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(r)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role "{confirmDelete?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the role and all its permission
              assignments. Users currently holding this role will lose its
              access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1" />
              )}
              Delete role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ManageCustomRolesDialog;
