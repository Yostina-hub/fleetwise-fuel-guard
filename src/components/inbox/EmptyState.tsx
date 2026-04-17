import { Inbox as InboxIcon } from "lucide-react";

interface EmptyStateProps {
  status: "pending" | "completed";
}

export function EmptyState({ status }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <InboxIcon className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {status === "pending" ? "Inbox zero" : "No completed tasks yet"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "pending"
              ? "When a workflow reaches a Human Task or Approval step, it will appear here for you to act on."
              : "Tasks you complete will be archived here for reference."}
          </p>
        </div>
      </div>
    </div>
  );
}
