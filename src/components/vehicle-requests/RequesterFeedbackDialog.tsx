import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOrganization } from "@/hooks/useOrganization";

interface Props {
  request: any;
  open: boolean;
  onClose: () => void;
}

export const RequesterFeedbackDialog = ({ request, open, onClose }: Props) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hover, setHover] = useState(0);

  // Read super-admin-controlled setting that decides whether rating is mandatory.
  const { data: ratingRequired = false } = useQuery({
    queryKey: ["org-requester-rating-required", organizationId],
    enabled: !!organizationId && open,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("organization_settings")
        .select("requester_rating_required")
        .eq("organization_id", organizationId)
        .maybeSingle();
      return Boolean(data?.requester_rating_required);
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { rating: number | null; feedback: string }) => {
      const update: Record<string, any> = { requester_feedback: payload.feedback };
      if (payload.rating != null) update.requester_rating = payload.rating;
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update(update)
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.rating != null
          ? t('feedback.submitted', 'Feedback submitted!')
          : t('feedback.skipped', 'Feedback closed without rating'),
      );
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSubmit = ratingRequired ? rating > 0 : true;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('feedback.title', 'Rate this service')}</DialogTitle>
          <DialogDescription>
            {ratingRequired
              ? t('feedback.required_hint', 'A rating is required by your organization to close this request.')
              : t('feedback.optional_hint', 'Rating is optional — you may skip if you prefer.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>
              {t('feedback.rating', 'Rating')}
              {ratingRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  className="p-0.5"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      s <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('feedback.comments', 'Comments')}</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('feedback.placeholder', 'How was the service delivery?')}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          {!ratingRequired && (
            <Button
              variant="ghost"
              onClick={() => mutation.mutate({ rating: null, feedback })}
              disabled={mutation.isPending}
            >
              {t('feedback.skip', 'Skip')}
            </Button>
          )}
          <Button
            onClick={() => mutation.mutate({ rating, feedback })}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? "..." : t('feedback.submit', 'Submit Feedback')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
