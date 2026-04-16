import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Props {
  request: any;
  open: boolean;
  onClose: () => void;
}

export const RequesterFeedbackDialog = ({ request, open, onClose }: Props) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hover, setHover] = useState(0);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({ requester_rating: rating, requester_feedback: feedback })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('feedback.submitted', 'Feedback submitted!'));
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('feedback.title', 'Rate this service')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('feedback.rating', 'Rating')}</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={() => mutation.mutate()} disabled={!rating || mutation.isPending}>
            {mutation.isPending ? "..." : t('feedback.submit', 'Submit Feedback')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
