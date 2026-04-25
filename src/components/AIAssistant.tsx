import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, RotateCcw, Copy, Check, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { friendlyToastError } from "@/lib/errorMessages";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi, I'm **FleetAI**. I can analyze your fleet metrics, surface alerts, suggest scheduling moves, and explain trends.\n\nAsk me anything — or pick a suggestion below to get started.",
};

const SUGGESTIONS_BY_PAGE: Record<string, string[]> = {
  Dashboard: [
    "Summarize today's fleet status",
    "What are the top 3 risks right now?",
    "Which vehicles need attention this week?",
  ],
  "Fleet Management": [
    "How many vehicles are active vs idle?",
    "Which vehicles are due for maintenance?",
    "Suggest fleet utilization improvements",
  ],
  "Live Map View": [
    "Which vehicles are currently moving?",
    "Are any vehicles outside their geofence?",
    "Show me vehicles offline for over 1 hour",
  ],
  Alerts: [
    "Summarize critical alerts",
    "What patterns do you see in recent alerts?",
    "Recommend alert prioritization",
  ],
  "Fuel Monitoring": [
    "Detect potential fuel theft this week",
    "Which vehicles have abnormal consumption?",
    "Estimate this month's fuel cost trend",
  ],
  Maintenance: [
    "What maintenance is overdue?",
    "Predict next likely breakdowns",
    "Suggest a preventive maintenance plan",
  ],
  "Fleet Scheduling": [
    "Are there any unassigned approved requests?",
    "Which vehicles are underutilized?",
    "Suggest an optimal assignment for tomorrow",
  ],
  default: [
    "Give me a fleet health summary",
    "What should I focus on today?",
    "Highlight anomalies in the last 24h",
  ],
};

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  const getPageContext = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.includes("fleet")) return "Fleet Management";
    if (path.includes("map")) return "Live Map View";
    if (path.includes("alerts")) return "Alerts";
    if (path.includes("fuel")) return "Fuel Monitoring";
    if (path.includes("maintenance")) return "Maintenance";
    if (path.includes("routes")) return "Routes & Sites";
    if (path.includes("scheduling")) return "Fleet Scheduling";
    if (path.includes("incidents")) return "Incidents";
    if (path.includes("workorders")) return "Work Orders";
    if (path.includes("reports")) return "Reports";
    return "Fleet Management System";
  };

  const pageContext = getPageContext();
  const suggestions = SUGGESTIONS_BY_PAGE[pageContext] || SUGGESTIONS_BY_PAGE.default;

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantMessage = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Not signed in",
          description: "Please sign in to use the AI assistant.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: newMessages,
            context: { page: pageContext },
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Rate limit reached",
            description: "Too many requests. Please wait a moment.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: "AI credits exhausted",
            description: "Please add credits to your workspace to continue.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to get AI response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages([
                ...newMessages,
                { role: "assistant", content: assistantMessage },
              ]);
            }
          } catch {
            // Partial JSON — re-buffer and wait
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      friendlyToastError(null, { title: "Failed to get AI response. Please try again." });
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input.trim());
  };

  const handleSuggestion = (s: string) => {
    if (isLoading) return;
    streamChat(s);
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-br from-primary to-primary/70 hover:from-primary hover:to-primary"
        size="icon"
        aria-label="Open FleetAI assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  const showSuggestions = messages.length <= 1 && !isLoading;

  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 shadow-2xl z-50 flex flex-col transition-all border-primary/20",
        isMinimized ? "w-80 h-16" : "w-[420px] h-[640px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight">FleetAI Assistant</div>
            {!isMinimized && (
              <div className="text-[11px] text-primary-foreground/80 leading-tight truncate">
                {pageContext} · Powered by Lovable AI
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && messages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15"
              onClick={handleReset}
              aria-label="Clear chat"
              title="Clear chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={index}
                    className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}
                  >
                    {!isUser && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                        isUser
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0 prose-headings:my-2 prose-pre:my-2 prose-pre:bg-background prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-strong:text-foreground">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      )}
                      {!isUser && message.content && (
                        <button
                          onClick={() => handleCopy(message.content, index)}
                          className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                          aria-label="Copy"
                          title="Copy"
                        >
                          {copiedIndex === index ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                    {isUser && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {showSuggestions && (
                <div className="pt-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2 px-1">
                    Try asking
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/40 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t bg-card">
            <div className="flex gap-2 items-center">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask FleetAI…"
                disabled={isLoading}
                className="flex-1 h-9 text-sm"
                maxLength={2000}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-9 w-9 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5 px-1">
              FleetAI may produce inaccurate info. Verify critical decisions.
            </div>
          </form>
        </>
      )}
    </Card>
  );
};
