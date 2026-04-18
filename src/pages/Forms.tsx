/**
 * /forms — Forms registry (CRUD list).
 *
 * Lists all forms in the current organization, with quick actions to create,
 * edit (opens the WYSIWYG), archive, and view submissions. Acts as the
 * landing page for the standalone Forms Module.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Archive, ArchiveRestore, FileText, Search, Loader2, CheckCircle2, Inbox, ListChecks, LibraryBig, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useFormsList, useCreateForm, useArchiveForm, useUnarchiveForm, useCloneTemplate,
} from "@/lib/forms/api";
import { keyFromLabel } from "@/lib/forms/fieldCatalog";
import { FORM_TEMPLATES, type FormTemplate } from "@/lib/forms/templates";

export default function Forms() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "archived">("active");

  const list = useFormsList(organizationId, includeArchived || tab !== "active");
  const archive = useArchiveForm();
  const unarchive = useUnarchiveForm();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data ?? [])
      .filter((f) => (tab === "all" ? true : tab === "active" ? !f.is_archived : f.is_archived))
      .filter((f) =>
        !q ? true : f.name.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || (f.category ?? "").toLowerCase().includes(q),
      );
  }, [list.data, search, tab]);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Forms
            </h1>
            <p className="text-sm text-muted-foreground">
              Build, version, and publish dynamic forms used in workflows and SOPs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TemplateLibraryDialog />
            <CreateFormDialog />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2 ml-auto">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search forms…"
                    className="pl-7 h-8 w-[220px]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading forms…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No forms yet — click "New form" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Key</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Version</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr key={f.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">
                          <Link to={`/forms/${f.id}/edit`} className="hover:underline">
                            {f.name}
                          </Link>
                          {f.description ? (
                            <div className="text-xs text-muted-foreground line-clamp-1">{f.description}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{f.key}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{f.category || "—"}</td>
                        <td className="px-3 py-2">
                          {!f.is_archived ? (
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Archived</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {f.current_published_version_id ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              published
                            </span>
                          ) : (
                            <span className="text-muted-foreground">draft only</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/forms/${f.id}/submissions`)}>
                              <ListChecks className="h-3.5 w-3.5 mr-1" /> Submissions
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/forms/${f.id}/edit`)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            {!f.is_archived ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  archive.mutate(f.id, {
                                    onSuccess: () => toast.success("Form archived"),
                                    onError: (e: any) => toast.error(e.message),
                                  })
                                }
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  unarchive.mutate(f.id, {
                                    onSuccess: () => toast.success("Form restored"),
                                    onError: (e: any) => toast.error(e.message),
                                  })
                                }
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// ---------- Create dialog ------------------------------------------------

function CreateFormDialog() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const create = useCreateForm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [autoKey, setAutoKey] = useState(true);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const onNameChange = (v: string) => {
    setName(v);
    if (autoKey) setKey(keyFromLabel(v));
  };

  const submit = async () => {
    if (!organizationId) {
      toast.error("No organization");
      return;
    }
    if (!name.trim() || !key.trim()) {
      toast.error("Name and key are required");
      return;
    }
    try {
      const form = await create.mutateAsync({
        organization_id: organizationId,
        name: name.trim(),
        key: key.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
      });
      toast.success("Form created");
      setOpen(false);
      navigate(`/forms/${form.id}/edit`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> New form
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create form</DialogTitle>
          <DialogDescription>
            Define a name and a stable key. The key is referenced by workflow nodes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Vehicle Handover Checklist" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Key *</Label>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                Auto from name <Switch checked={autoKey} onCheckedChange={setAutoKey} />
              </div>
            </div>
            <Input
              value={key}
              onChange={(e) => {
                setAutoKey(false);
                setKey(e.target.value);
              }}
              placeholder="vehicle_handover_checklist"
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Maintenance, HR, Safety…" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
