import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  Send,
  X,
  Bot,
  User,
  Shield,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import type { WorkflowNode, WorkflowEdge } from "./types";

interface WorkflowAIChatPanelProps {
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

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  result?: AIWorkflowResult | null;
  isLoading?: boolean;
}

const QUICK_PROMPTS = [
  { icon: "🔧", text: "Create a predictive maintenance workflow" },
  { icon: "⛽", text: "Alert when fuel drops below 10%" },
  { icon: "🚨", text: "Speed violation escalation chain" },
  { icon: "📊", text: "Daily fleet health report via email" },
  { icon: "🧠", text: "Auto-assign nearest driver to trips" },
  { icon: "🔍", text: "Detect suspicious fuel patterns" },
];

function detectAction(prompt: string, hasExistingNodes: boolean): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("delete") || lower.includes("remove")) return "delete";
  if (lower.includes("modify") || lower.includes("change") || lower.includes("update") || lower.includes("edit")) return "modify";
  if (lower.includes("add") || lower.includes("insert")) return hasExistingNodes ? "add_nodes" : "generate";
  if (lower.includes("suggest") || lower.includes("recommend") || lower.includes("improve")) return "suggest";
  if (lower.includes("maintenance") || lower.includes("predictive")) return "auto_maintenance";
  if (lower.includes("decision") || lower.includes("smart") || lower.includes("auto-assign")) return "smart_decision";
  return hasExistingNodes ? "add_nodes" : "generate";
}

export const WorkflowAICommandBar = ({
  open,
  onClose,
  nodes,
  edges,
  onApplyResult,
}: WorkflowAIChatPanelProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus on open
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 150);
  }, [open]);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Hey! I'm your **AI Workflow Assistant**. Tell me what you want to automate and I'll build the workflow for you.\n\nYou can ask me to:\n- 🔨 **Generate** complete workflows from descriptions\n- ➕ **Add** nodes to your current workflow\n- ✏️ **Modify** existing nodes or connections\n- 🗑️ **Delete** specific nodes\n- 🔧 Create **predictive maintenance** pipelines\n- 🧠 Build **smart decision** automations\n- 💡 **Suggest** improvements",
        timestamp: new Date(),
      }]);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const loadingMsg: ChatMessage = {
      id: `loading_${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    const action = detectAction(text, nodes.length > 0);

    try {
      const { data, error } = await supabase.functions.invoke("ai-workflow", {
        body: {
          prompt: text,
          action,
          currentNodes: nodes,
          currentEdges: edges,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        const errorContent = data.error.includes("Rate limit")
          ? "⏳ Rate limited — please try again in a moment."
          : data.error.includes("credits")
          ? "💳 AI credits exhausted. Please add credits to continue."
          : `❌ ${data.error}`;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? { ...m, content: errorContent, isLoading: false }
              : m
          )
        );
        return;
      }

      const aiResult = data?.result;
      if (!aiResult) throw new Error("No result from AI");

      let responseContent = "";
      let result: AIWorkflowResult | null = null;

      if (aiResult.suggestions) {
        responseContent = "Here are my suggestions:\n\n" +
          aiResult.suggestions.map((s: any, i: number) => `**${i + 1}. ${s.title}**\n${s.description}`).join("\n\n");
        result = { action, suggestions: aiResult.suggestions };
      } else {
        const nodeCount = aiResult.nodes?.length || 0;
        const edgeCount = aiResult.edges?.length || 0;
        const deleteCount = aiResult.nodesToDelete?.length || 0;

        if (action === "delete") {
          responseContent = `I've prepared **${deleteCount} node(s)** for removal. Click **Apply** to remove them from your canvas.`;
        } else if (action === "modify") {
          responseContent = `I've updated the workflow with **${nodeCount} node(s)** and **${edgeCount} connection(s)**. Click **Apply** to update your canvas.`;
        } else if (action === "add_nodes") {
          responseContent = `I've created **${nodeCount} new node(s)** with **${edgeCount} connection(s)** to add to your workflow. Click **Apply** to add them.`;
        } else {
          responseContent = `I've generated a workflow with **${nodeCount} node(s)** and **${edgeCount} connection(s)**. Here's what I built:\n\n` +
            (aiResult.nodes || []).map((n: any) => `- ${n.data?.icon || "•"} **${n.data?.label}** — ${n.data?.description || n.data?.nodeType}`).join("\n") +
            "\n\nClick **Apply** to load it onto your canvas.";
        }
        result = { action, ...aiResult };
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: responseContent, isLoading: false, result }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: `❌ ${err instanceof Error ? err.message : "Something went wrong"}`, isLoading: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [nodes, edges, loading]);

  const handleApply = useCallback((result: AIWorkflowResult) => {
    onApplyResult(result);
    toast({ title: "Applied!", description: "AI changes applied to workflow canvas" });

    setMessages((prev) => [...prev, {
      id: `system_${Date.now()}`,
      role: "assistant",
      content: "✅ Changes applied successfully! What else would you like to do?",
      timestamp: new Date(),
    }]);
  }, [onApplyResult, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 380, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full border-l border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-7 w-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">AI Assistant</span>
            <Badge variant="secondary" className="text-[9px] ml-2 py-0">⌘K</Badge>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "user" ? "bg-primary/15" : "bg-violet-500/15"
                }`}>
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-violet-400" />
                  )}
                </div>

                {/* Bubble */}
                <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : ""}`}>
                  <div className={`rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground ml-auto"
                      : "bg-muted/50 text-foreground"
                  }`}>
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-xs">Building workflow...</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-1 [&_p]:mt-0 [&_ul]:my-1 [&_li]:my-0 text-[13px] leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Apply button for results */}
                  {msg.result && !msg.result.suggestions && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button
                        size="sm"
                        onClick={() => handleApply(msg.result!)}
                        className="h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Shield className="h-3 w-3" />
                        Apply to Canvas
                      </Button>
                    </motion.div>
                  )}

                  {/* Suggestion chips */}
                  {msg.result?.suggestions && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.result.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s.prompt)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-colors"
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Quick prompts (only shown when no user messages yet) */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => sendMessage(qp.text)}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <span>{qp.icon}</span>
                <span>{qp.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border bg-card/80 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to automate..."
            className="min-h-[40px] max-h-[120px] text-sm resize-none flex-1"
            rows={1}
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="h-10 w-10 p-0 flex-shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>
    </motion.div>
  );
};
