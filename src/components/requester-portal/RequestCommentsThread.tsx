/**
 * RequestCommentsThread — realtime comment thread on a vehicle request.
 * Fetches + subscribes to vehicle_request_comments. Internal comments are
 * automatically hidden for basic 'user' role by RLS.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  request_id: string;
  author_id: string;
  author_name: string | null;
  author_role: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

interface Props {
  requestId: string;
}

export function RequestCommentsThread({ requestId }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["vehicle-request-comments", requestId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_request_comments")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Comment[];
    },
    enabled: !!requestId,
  });

  // Realtime
  useEffect(() => {
    if (!requestId) return;
    const ch = supabase
      .channel(`vrc-${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_request_comments", filter: `request_id=eq.${requestId}` },
        () => qc.invalidateQueries({ queryKey: ["vehicle-request-comments", requestId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [requestId, qc]);

  // Auto-scroll to latest
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [comments.length]);

  const post = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !organizationId) throw new Error("Not authenticated");
      const trimmed = text.trim();
      if (!trimmed) throw new Error("Comment cannot be empty");
      if (trimmed.length > 4000) throw new Error("Comment is too long (max 4000 chars)");
      const authorName =
        (user.user_metadata as any)?.full_name ?? user.email?.split("@")[0] ?? "User";
      const { error } = await (supabase as any).from("vehicle_request_comments").insert({
        request_id: requestId,
        organization_id: organizationId,
        author_id: user.id,
        author_name: authorName,
        body: trimmed,
        is_internal: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["vehicle-request-comments", requestId] });
    },
    onError: (e: any) => {
      toast({
        title: "Could not post comment",
        description: e?.message ?? "Try again",
        variant: "destructive",
      });
    },
  });

  const initials = (name?: string | null) =>
    (name ?? "U")
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        Conversation
        <span className="text-xs text-muted-foreground font-normal">
          ({comments.length} {comments.length === 1 ? "comment" : "comments"})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto rounded-md border border-border bg-muted/20 p-3 space-y-3 min-h-[180px] max-h-[320px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> Loading…
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center text-xs text-muted-foreground">
            <MessageSquare className="h-5 w-5 mb-1 opacity-50" aria-hidden="true" />
            No comments yet — start the conversation with the approving team below.
          </div>
        ) : (
          comments.map((c) => {
            const mine = c.author_id === user?.id;
            return (
              <div
                key={c.id}
                className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-semibold",
                      mine ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {initials(c.author_name)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("max-w-[75%] flex flex-col gap-0.5", mine && "items-end")}>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {mine ? "You" : c.author_name ?? "Member"}
                    </span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    {c.is_internal && (
                      <span className="inline-flex items-center gap-0.5 text-warning">
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" /> internal
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words border",
                      mine
                        ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-sm"
                        : "bg-background border-border text-foreground rounded-tl-sm",
                    )}
                  >
                    {c.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!post.isPending) post.mutate(body);
        }}
        className="flex flex-col gap-2"
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 4000))}
          placeholder="Write a comment for the approving team…"
          rows={2}
          maxLength={4000}
          aria-label="New comment"
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {body.length}/4000
          </span>
          <Button
            type="submit"
            size="sm"
            className="gap-1.5"
            disabled={post.isPending || body.trim().length === 0}
          >
            {post.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
