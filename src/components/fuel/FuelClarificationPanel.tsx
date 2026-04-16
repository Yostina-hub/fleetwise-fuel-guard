// Clarification request/justification loop UI (steps 14-17 of the Telebirr fuel workflow).
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useFuelClarifications } from "@/hooks/useFuelClarifications";
import { Loader2, MessageSquareWarning, CheckCircle2, XCircle, Send } from "lucide-react";
import { format } from "date-fns";

interface Props {
  fuelRequestId: string;
  organizationId: string;
  /** Can request clarification (fleet operations / fuel specialist) */
  canRequest: boolean;
  /** Can submit justification (fuel admin supervisor) */
  canJustify: boolean;
  /** Can resolve final clearance (fleet management) */
  canResolve: boolean;
}

export function FuelClarificationPanel({ fuelRequestId, organizationId, canRequest, canJustify, canResolve }: Props) {
  const { clarifications, isLoading, requestClarification, submitJustification, resolveClarification } =
    useFuelClarifications(fuelRequestId);
  const [question, setQuestion] = useState("");
  const [activeJustify, setActiveJustify] = useState<string | null>(null);
  const [justification, setJustification] = useState("");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5 text-warning" /> Clarification & Clearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canRequest && (
          <div className="border-l-4 border-warning/40 bg-warning/5 p-2 space-y-2 rounded">
            <p className="text-xs font-medium">Step 16 — Request clarification / justification</p>
            <Textarea
              rows={2}
              placeholder="Why does the actual fuel cost deviate from approval? Need explanation…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!question.trim() || requestClarification.isPending}
              onClick={() => {
                requestClarification.mutate({ question, organization_id: organizationId });
                setQuestion("");
              }}
            >
              {requestClarification.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-1" /> Send
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : clarifications.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No clarification requests yet.</p>
        ) : (
          <div className="space-y-2">
            {clarifications.map((c) => (
              <div key={c.id} className="border rounded p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <Badge variant={c.status === "closed" ? (c.resolution === "approved" ? "outline" : "destructive") : "secondary"}>
                    {c.status === "closed" ? c.resolution : c.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "PP p")}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Question</p>
                  <p>{c.question}</p>
                </div>

                {c.justification && (
                  <div className="border-t pt-2">
                    <p className="text-xs font-medium text-muted-foreground">Step 17 — Justification</p>
                    <p>{c.justification}</p>
                    {c.justified_at && <p className="text-[10px] text-muted-foreground">{format(new Date(c.justified_at), "PP p")}</p>}
                  </div>
                )}

                {/* Justify */}
                {c.status === "open" && canJustify && (
                  <>
                    {activeJustify === c.id ? (
                      <div className="space-y-2 border-t pt-2">
                        <Textarea rows={2} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Provide justification…" />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={!justification.trim() || submitJustification.isPending}
                            onClick={() => { submitJustification.mutate({ id: c.id, justification }); setActiveJustify(null); setJustification(""); }}>
                            Submit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setActiveJustify(null); setJustification(""); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setActiveJustify(c.id)}>Provide justification</Button>
                    )}
                  </>
                )}

                {/* Resolve (Fleet ops final approval) */}
                {c.status === "answered" && canResolve && (
                  <div className="flex gap-2 border-t pt-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700"
                      onClick={() => resolveClarification.mutate({ id: c.id, resolution: "approved" })}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve clearance
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => resolveClarification.mutate({ id: c.id, resolution: "rejected" })}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
