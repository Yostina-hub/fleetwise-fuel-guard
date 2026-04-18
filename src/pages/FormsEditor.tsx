/**
 * /forms/:id/edit — WYSIWYG form editor.
 *
 * Three-pane layout:
 *   ┌──────────┬──────────────────────────────┬───────────────────┐
 *   │ Palette  │           Canvas              │   Properties      │
 *   │  (drag)  │  (drop, reorder, select)      │   or Live preview │
 *   └──────────┴──────────────────────────────┴───────────────────┘
 *
 * Autosave (DB) every 1.2s after edits. "Publish" creates an immutable
 * version and bumps `forms.current_version`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Loader2, Save, Send, Settings, ListChecks, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm, useFormDraftVersion, useFormVersions, usePublishDraft, useSaveDraft } from "@/lib/forms/api";
import { collectKeys, makeField } from "@/lib/forms/fieldCatalog";
import { walkFields, type BaseField, type FieldType, type FormSchema, type FormSettings } from "@/lib/forms/schema";
import { isFieldLocked } from "@/lib/forms/legacyContracts";
import { FormsPalette } from "@/components/forms/editor/FormsPalette";
import { FormsWysiwygCanvas } from "@/components/forms/editor/FormsWysiwygCanvas";
import { FieldProperties } from "@/components/forms/editor/FieldProperties";
import { FormRenderer } from "@/components/forms/FormRenderer";

const AUTOSAVE_MS = 1200;

export default function FormsEditor() {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formQ = useForm(formId);
  const draftQ = useFormDraftVersion(formId);
  const versionsQ = useFormVersions(formId);
  const saveDraft = useSaveDraft();
  const publish = usePublishDraft();

  const [schema, setSchema] = useState<FormSchema>({ version: 1, fields: [] });
  const [settings, setSettings] = useState<FormSettings>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"build" | "preview">("build");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  // Hydrate from draft.
  useEffect(() => {
    if (!draftQ.data) return;
    setSchema(draftQ.data.schema);
    setSettings(draftQ.data.settings);
    setSavedAt(draftQ.data.updated_at);
  }, [draftQ.data?.id]);

  // Autosave.
  useEffect(() => {
    if (!formId || !dirtyRef.current) return;
    const t = setTimeout(() => {
      saveDraft.mutate(
        { formId, schema, settings },
        {
          onSuccess: () => {
            dirtyRef.current = false;
            setSavedAt(new Date().toISOString());
          },
        },
      );
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(schema), JSON.stringify(settings), formId]);

  const markDirty = () => {
    dirtyRef.current = true;
  };

  // ---------- Mutators ---------------------------------------------------

  const addAtEnd = useCallback((type: FieldType) => {
    setSchema((s) => {
      const keys = collectKeys(s.fields);
      const f = makeField(type, keys);
      return { ...s, fields: [...s.fields, f] };
    });
    markDirty();
  }, []);

  const insertAt = useCallback((index: number, type: FieldType) => {
    setSchema((s) => {
      const keys = collectKeys(s.fields);
      const f = makeField(type, keys);
      const next = [...s.fields];
      const safeIdx = Math.max(0, Math.min(index, next.length));
      next.splice(safeIdx, 0, f);
      return { ...s, fields: next };
    });
    markDirty();
  }, []);

  const addToContainer = useCallback((containerId: string, type: FieldType) => {
    setSchema((s) => {
      const keys = collectKeys(s.fields);
      const f = makeField(type, keys);
      const next = s.fields.map((field) => {
        if (field.id !== containerId) return field;
        return { ...field, fields: [...(field.fields ?? []), f] };
      });
      return { ...s, fields: next };
    });
    markDirty();
  }, []);

  const reorder = useCallback((newOrder: string[]) => {
    setSchema((s) => {
      const map = new Map(s.fields.map((f) => [f.id, f]));
      const next = newOrder.map((id) => map.get(id)).filter(Boolean) as BaseField[];
      return { ...s, fields: next };
    });
    markDirty();
  }, []);

  const deleteTopLevel = useCallback((id: string) => {
    setSchema((s) => {
      const target = s.fields.find((f) => f.id === id);
      if (target && isFieldLocked(formQ.data?.key, target.key)) {
        toast.error(`"${target.label}" is locked by the legacy contract and can't be deleted.`);
        return s;
      }
      return { ...s, fields: s.fields.filter((f) => f.id !== id) };
    });
    setSelectedId((prev) => (prev === id ? null : prev));
    markDirty();
  }, [formQ.data?.key]);

  const deleteChild = useCallback((id: string) => {
    setSchema((s) => {
      let blocked = false;
      const next = s.fields.map((f) => {
        if (!f.fields) return f;
        const child = f.fields.find((c) => c.id === id);
        if (child && isFieldLocked(formQ.data?.key, child.key)) {
          blocked = true;
          return f;
        }
        return { ...f, fields: f.fields.filter((c) => c.id !== id) };
      });
      if (blocked) {
        toast.error("That field is locked by the legacy contract and can't be deleted.");
        return s;
      }
      return { ...s, fields: next };
    });
    setSelectedId((prev) => (prev === id ? null : prev));
    markDirty();
  }, [formQ.data?.key]);

  const updateField = useCallback((id: string, patch: Partial<BaseField>) => {
    setSchema((s) => {
      const apply = (arr: BaseField[]): BaseField[] =>
        arr.map((f) => {
          if (f.id === id) return { ...f, ...patch };
          if (f.fields) return { ...f, fields: apply(f.fields) };
          return f;
        });
      return { ...s, fields: apply(s.fields) };
    });
    markDirty();
  }, []);

  const replaceFields = useCallback((next: BaseField[]) => {
    setSchema((s) => ({ ...s, fields: next }));
    markDirty();
  }, []);

  const duplicateField = useCallback((id: string) => {
    setSchema((s) => {
      const keys = collectKeys(s.fields);
      const cloneWithNewIds = (f: BaseField): BaseField => {
        const newKey = (() => {
          let base = `${f.key}_copy`;
          let k = base;
          let n = 1;
          while (keys.has(k)) { n += 1; k = `${base}_${n}`; }
          keys.add(k);
          return k;
        })();
        return {
          ...f,
          id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          key: newKey,
          fields: f.fields?.map(cloneWithNewIds),
        };
      };
      // top-level?
      const topIdx = s.fields.findIndex((f) => f.id === id);
      if (topIdx >= 0) {
        const dup = cloneWithNewIds(s.fields[topIdx]);
        const next = [...s.fields];
        next.splice(topIdx + 1, 0, dup);
        return { ...s, fields: next };
      }
      // child?
      const next = s.fields.map((f) => {
        if (!f.fields) return f;
        const cIdx = f.fields.findIndex((c) => c.id === id);
        if (cIdx < 0) return f;
        const dup = cloneWithNewIds(f.fields[cIdx]);
        const arr = [...f.fields];
        arr.splice(cIdx + 1, 0, dup);
        return { ...f, fields: arr };
      });
      return { ...s, fields: next };
    });
    markDirty();
  }, []);

  // ---------- Find selected field & its siblings ------------------------

  const { selected, siblings } = useMemo(() => {
    if (!selectedId) return { selected: null, siblings: schema.fields };
    for (const f of schema.fields) {
      if (f.id === selectedId) return { selected: f, siblings: schema.fields };
      if (f.fields?.some((c) => c.id === selectedId)) {
        return { selected: f.fields.find((c) => c.id === selectedId)!, siblings: f.fields };
      }
    }
    return { selected: null, siblings: schema.fields };
  }, [selectedId, schema]);

  // ---------- Manual save / publish -------------------------------------

  const onManualSave = () => {
    if (!formId) return;
    saveDraft.mutate(
      { formId, schema, settings },
      {
        onSuccess: () => {
          setSavedAt(new Date().toISOString());
          dirtyRef.current = false;
          toast.success("Draft saved");
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const onPublish = () => {
    if (!formId) return;
    // Save first, then publish.
    saveDraft.mutate(
      { formId, schema, settings },
      {
        onSuccess: () => {
          publish.mutate(formId, {
            onSuccess: (v) => toast.success(`Published v${v}`),
            onError: (e: any) => toast.error(e.message),
          });
        },
      },
    );
  };

  if (formQ.isLoading || draftQ.isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!formQ.data) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Form not found.</div>
      </Layout>
    );
  }

  const fieldCount = (() => {
    let n = 0;
    for (const _ of walkFields(schema.fields)) n += 1;
    return n;
  })();

  return (
    <Layout>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/forms")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to forms
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{formQ.data.name}</h1>
              <Badge variant="outline" className="font-mono text-[10px]">{formQ.data.key}</Badge>
              {formQ.data.current_published_version_id ? (
                <Badge variant="secondary" className="text-[10px]">Published</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Unpublished</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {fieldCount} field{fieldCount === 1 ? "" : "s"}
              {savedAt ? ` · Saved ${new Date(savedAt).toLocaleTimeString()}` : ""}
              {saveDraft.isPending ? " · Saving…" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/forms/${formId}/submissions`}>
                <ListChecks className="h-3.5 w-3.5 mr-1" /> Submissions
              </Link>
            </Button>
            <SettingsDialog settings={settings} onChange={(s) => { setSettings(s); markDirty(); }} />
            <Button variant="outline" size="sm" onClick={onManualSave} disabled={saveDraft.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save draft
            </Button>
            <PublishDialog
              fieldCount={fieldCount}
              hasPublished={!!formQ.data.current_published_version_id}
              onPublish={onPublish}
              isPending={publish.isPending}
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="build"><Settings className="h-3.5 w-3.5 mr-1" /> Build</TabsTrigger>
            <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1" /> Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="mt-3">
            <div className="grid grid-cols-12 gap-3 h-[calc(100vh-260px)] min-h-[500px]">
              <Card className="col-span-12 md:col-span-2 overflow-hidden">
                <FormsPalette onAdd={addAtEnd} />
              </Card>
              <Card className="col-span-12 md:col-span-7 overflow-hidden bg-muted/20">
                <FormsWysiwygCanvas
                  schema={schema}
                  settings={settings}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onReplaceFields={replaceFields}
                  onDelete={deleteTopLevel}
                  onAddPaletteAtEnd={addAtEnd}
                  onAddPaletteToContainer={addToContainer}
                  onPatchField={updateField}
                  onDuplicateField={duplicateField}
                  onInsertAt={insertAt}
                />
              </Card>
              <Card className="col-span-12 md:col-span-3 overflow-hidden">
                <FieldProperties
                  field={selected}
                  siblings={siblings}
                  formKey={formQ.data?.key}
                  onChange={(patch) => selected && updateField(selected.id, patch)}
                />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-3">
            <Card className="p-4 max-w-3xl mx-auto">
              {(() => {
                const k = formQ.data?.key ?? "";
                const isLegacyBound = k === "vehicle_request" || k.startsWith("vehicle_request_");
                if (isLegacyBound) {
                  return (
                    <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Legacy form bound:</span>{" "}
                      This form key is wired to the original Fleet Request component for full feature parity (pickers, approval routing, SMS).
                      Schema edits here affect metadata only — the rendered form below is the legacy component.
                    </div>
                  );
                }
                return null;
              })()}
              {schema.fields.length === 0 && !(formQ.data?.key ?? "").startsWith("vehicle_request") ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Add some fields to see the live preview.
                </div>
              ) : (
                <FormRenderer
                  schema={schema}
                  settings={settings}
                  formKey={formQ.data?.key}
                  onSubmit={async (v) => {
                    toast.success("Preview submission");
                    console.log("[FormsEditor preview]", v);
                  }}
                />
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {versionsQ.data && versionsQ.data.filter((v) => v.status === "published").length > 0 ? (
          <Card className="p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Version history
            </div>
            <div className="flex flex-wrap gap-1.5">
              {versionsQ.data.filter((v) => v.status === "published").map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px]"
                >
                  <span className="font-mono">v{v.version_number}</span>
                  <span className="text-muted-foreground">
                    · {v.published_at ? new Date(v.published_at).toLocaleDateString() : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1 ml-1 text-[10px]"
                    onClick={() => {
                      setSchema(v.schema);
                      setSettings(v.settings);
                      setSelectedId(null);
                      markDirty();
                      toast.success(`Loaded v${v.version_number} into draft — Save or Publish to apply`);
                    }}
                    title="Copy this version into the current draft"
                  >
                    <RotateCcw className="h-3 w-3 mr-0.5" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}

// ---------- Dialogs ------------------------------------------------------

function SettingsDialog({
  settings, onChange,
}: { settings: FormSettings; onChange: (s: FormSettings) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-3.5 w-3.5 mr-1" /> Form settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Form settings</DialogTitle>
          <DialogDescription>Apply to all submissions of this form.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Submit button label</Label>
            <Input
              value={settings.submitLabel ?? "Submit"}
              onChange={(e) => onChange({ ...settings, submitLabel: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cancel button label</Label>
            <Input
              value={settings.cancelLabel ?? "Cancel"}
              onChange={(e) => onChange({ ...settings, cancelLabel: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Success message</Label>
            <Input
              value={settings.successMessage ?? ""}
              onChange={(e) => onChange({ ...settings, successMessage: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Two-column layout (md+)</Label>
            <Switch
              checked={settings.twoColumnLayout ?? true}
              onCheckedChange={(v) => onChange({ ...settings, twoColumnLayout: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PublishDialog({
  fieldCount, hasPublished, onPublish, isPending,
}: {
  fieldCount: number;
  hasPublished: boolean;
  onPublish: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={fieldCount === 0 || isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
          Publish
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish form?</AlertDialogTitle>
          <AlertDialogDescription>
            This {hasPublished ? "creates a new immutable version" : "publishes the first immutable version"}.
            New submissions will use this version. In-flight workflow instances continue with the
            version they started with.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onPublish}>Publish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
