import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Wand2,
  Plus,
  Trash2,
  Edit3,
  Lightbulb,
  Wrench,
  Brain,
  Loader2,
  ArrowRight,
  Zap,
  BarChart3,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { WorkflowNode, WorkflowEdge } from "./types";

interface WorkflowAICommandBarProps {
  open: boolean;
  onClose: () => void;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onApplyResult: (result: AIWorkflowResult) => void;
}

export interface AIWorkflowResult {
  action: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  nodesToDelete?: string[];
  edgesToDelete?: string[];
  suggestions?: Array<{ title: string; description: string; prompt: string }>;
}

const QUICK_ACTIONS = [
  {
    id: "generate",
    label: "Generate Workflow",
    description: "Create a complete workflow from description",
    icon: Wand2,
    color: "text-primary",
    placeholder: "Describe the workflow you want to create...",
  },
  {
    id: "add_nodes",
    label: "Add Nodes",
    description: "Add new nodes to current workflow",
    icon: Plus,
    color: "text-emerald-500",
    placeholder: "What nodes do you want to add?",
  },
  {
    id: "modify",
    label: "Modify Workflow",
    description: "Edit existing nodes or connections",
    icon: Edit3,
    color: "text-amber-500",
    placeholder: "How should I modify the workflow?",
  },
  {
    id: "delete",
    label: "Remove Nodes",
    description: "Remove specific nodes by description",
    icon: Trash2,
    color: "text-destructive",
    placeholder: "Which nodes should I remove?",
  },
  {
    id: "auto_maintenance",
    label: "Auto Maintenance Workflow",
    description: "AI-powered predictive maintenance pipeline",
    icon: Wrench,
    color: "text-orange-500",
    placeholder: "Describe your maintenance requirements...",
  },
  {
    id: "smart_decision",
    label: "Smart Decision Workflow",
    description: "AI-driven decision-making automation",
    icon: Brain,
    color: "text-violet-500",
    placeholder: "What decisions should be automated?",
  },
  {
    id: "suggest",
    label: "Get Suggestions",
    description: "AI recommends workflow improvements",
    icon: Lightbulb,
    color: "text-yellow-500",
    placeholder: "What area needs improvement?",
  },
];

export const WorkflowAICommandBar = ({
  open,
  onClose,
  nodes,
  edges,
  onApplyResult,
}: WorkflowAICommandBarProps) => {
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIWorkflowResult | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string; prompt: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedAction(null);
      setPrompt("");
      setResult(null);
      setSuggestions([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) {
          // Parent handles opening
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const executeAction = useCallback(async (action: string, userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setLoading(true);
    setResult(null);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("ai-workflow", {
        body: {
          prompt: userPrompt,
          action,
          currentNodes: nodes,
          currentEdges: edges,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast({ title: "Rate Limited", description: "Please try again in a moment.", variant: "destructive" });
        } else if (data.error.includes("credits")) {
          toast({ title: "Credits Exhausted", description: "Please add credits to continue.", variant: "destructive" });
        } else {
          toast({ title: "Error", description: data.error, variant: "destructive" });
        }
        return;
      }

      const aiResult = data?.result;
      if (!aiResult) throw new Error("No result from AI");

      if (aiResult.suggestions) {
        setSuggestions(aiResult.suggestions);
      } else {
        setResult({ action, ...aiResult });
      }
    } catch (err) {
      toast({
        title: "AI Error",
        description: err instanceof Error ? err.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [nodes, edges, toast]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction || !prompt.trim()) return;
    executeAction(selectedAction, prompt);
  }, [selectedAction, prompt, executeAction]);

  const handleApply = useCallback(() => {
    if (!result) return;
    onApplyResult(result);
    toast({ title: "Applied!", description: "AI changes applied to workflow" });
    onClose();
  }, [result, onApplyResult, onClose, toast]);

  const handleSuggestionClick = useCallback((suggestion: { prompt: string }) => {
    setPrompt(suggestion.prompt);
    setSelectedAction("generate");
    executeAction("generate", suggestion.prompt);
  }, [executeAction]);

  const activeAction = QUICK_ACTIONS.find((a) => a.id === selectedAction);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 bg-card/95 backdrop-blur-xl border-primary/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Workflow Assistant</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            ⌘K
          </Badge>
        </div>

        {/* Action selector or prompt */}
        {!selectedAction ? (
          <ScrollArea className="max-h-[400px]">
            <div className="p-2 space-y-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action.id);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                >
                  <action.icon className={`h-5 w-5 ${action.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{action.label}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-4 space-y-4">
            {/* Back to actions */}
            <button
              onClick={() => {
                setSelectedAction(null);
                setResult(null);
                setSuggestions([]);
                setPrompt("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              ← Back to actions
            </button>

            {/* Active action header */}
            <div className="flex items-center gap-2">
              {activeAction && <activeAction.icon className={`h-5 w-5 ${activeAction.color}`} />}
              <span className="text-sm font-semibold">{activeAction?.label}</span>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeAction?.placeholder}
                className="flex-1 text-sm"
                disabled={loading}
              />
              <Button type="submit" size="sm" disabled={loading || !prompt.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              </Button>
            </form>

            {/* Loading */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                AI is building your workflow...
              </motion.div>
            )}

            {/* Result preview */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-400">AI Result Ready</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {result.nodes && <p>• {result.nodes.length} node(s) to add</p>}
                    {result.edges && <p>• {result.edges.length} connection(s)</p>}
                    {result.nodesToDelete && <p>• {result.nodesToDelete.length} node(s) to remove</p>}
                  </div>
                </div>

                {/* Node preview */}
                {result.nodes && result.nodes.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Nodes:</span>
                    <div className="flex flex-wrap gap-1">
                      {result.nodes.map((n: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {n.data?.icon} {n.data?.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleApply} className="flex-1 gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Apply to Canvas
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setResult(null)}>
                    Discard
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <span className="text-xs font-medium text-muted-foreground">Suggestions:</span>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                  >
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                  </button>
                ))}
              </motion.div>
            )}

            {/* Quick prompts */}
            {!result && !loading && suggestions.length === 0 && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Quick prompts:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAction === "auto_maintenance" && (
                    <>
                      <QuickPrompt text="Predictive oil change based on mileage" onClick={setPrompt} />
                      <QuickPrompt text="Tire wear monitoring with auto scheduling" onClick={setPrompt} />
                      <QuickPrompt text="Engine health check every 5000km" onClick={setPrompt} />
                    </>
                  )}
                  {selectedAction === "smart_decision" && (
                    <>
                      <QuickPrompt text="Auto-assign nearest driver to trip request" onClick={setPrompt} />
                      <QuickPrompt text="Route vehicles away from high-traffic zones" onClick={setPrompt} />
                      <QuickPrompt text="Flag suspicious fuel consumption patterns" onClick={setPrompt} />
                    </>
                  )}
                  {selectedAction === "generate" && (
                    <>
                      <QuickPrompt text="Alert when vehicle enters restricted zone" onClick={setPrompt} />
                      <QuickPrompt text="Daily fleet health report via email" onClick={setPrompt} />
                      <QuickPrompt text="Speed violation escalation chain" onClick={setPrompt} />
                    </>
                  )}
                  {selectedAction === "suggest" && (
                    <>
                      <QuickPrompt text="How can I optimize fuel usage?" onClick={setPrompt} />
                      <QuickPrompt text="Suggest safety improvements" onClick={setPrompt} />
                      <QuickPrompt text="What automations am I missing?" onClick={setPrompt} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

function QuickPrompt({ text, onClick }: { text: string; onClick: (t: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="text-[11px] px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      {text}
    </button>
  );
}
