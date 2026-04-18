import { Inbox as InboxIcon, Trash2 } from "lucide-react";

interface EmptyStateProps {
  status: "pending" | "completed" | "trash";
}

export function EmptyState({ status }: EmptyStateProps) {
  const isTrash = status === "trash";
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          {isTrash
            ? <Trash2 className="h-7 w-7 text-primary" />
            : <InboxIcon className="h-7 w-7 text-primary" />}
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {status === "pending"
              ? "Inbox zero"
              : status === "completed"
              ? "No completed tasks yet"
              : "Recycle bin is empty"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "pending"
              ? "When a workflow reaches a Human Task or Approval step, it will appear here for you to act on."
              : status === "completed"
              ? "Tasks you complete will be archived here for reference."
              : "Tasks you remove from the inbox land here. Restore them or delete them permanently."}
          </p>
        </div>
      </div>
    </div>
  );
}
