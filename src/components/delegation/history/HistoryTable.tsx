import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { History } from "lucide-react";
import {
  ACTION_META,
  FALLBACK_ACTION,
  FALLBACK_SOURCE,
  SOURCE_META,
} from "./constants";
import { formatHistoryRelativeTime } from "./format";
import type { DelegationHistoryRow } from "./types";

type Props = {
  rows: DelegationHistoryRow[];
  isLoading: boolean;
  totalRows: number;
};

export const HistoryTable = ({ rows, isLoading, totalRows }: Props) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>When</TableHead>
        <TableHead>Action</TableHead>
        <TableHead>Source</TableHead>
        <TableHead>Entity</TableHead>
        <TableHead>Scope</TableHead>
        <TableHead>Summary</TableHead>
        <TableHead>Actor</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {isLoading ? (
        <TableRow>
          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
            Loading history…
          </TableCell>
        </TableRow>
      ) : rows.length === 0 ? (
        <TableRow>
          <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
            <History className="h-6 w-6 mx-auto mb-2 opacity-50" />
            {totalRows === 0
              ? "No history yet — approval, routing, and substitution events will appear here."
              : "No events match your filters."}
          </TableCell>
        </TableRow>
      ) : (
        rows.map((log) => {
          const action = ACTION_META[log.action] ?? FALLBACK_ACTION;
          const source = SOURCE_META[log.source_table] ?? FALLBACK_SOURCE(log.source_table);
          const ActionIcon = action.icon;
          const SourceIcon = source.icon;
          return (
            <TableRow key={log.id}>
              <TableCell className="text-xs whitespace-nowrap">
                <div className="font-medium">{formatHistoryRelativeTime(log.created_at)}</div>
                <div className="text-muted-foreground">
                  {format(new Date(log.created_at), "MMM dd, HH:mm")}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`gap-1 ${action.className}`}>
                  <ActionIcon className="h-3 w-3" />
                  {action.label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="gap-1 capitalize">
                  <SourceIcon className="h-3 w-3" />
                  {source.label}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-sm capitalize">
                {log.entity_name || "—"}
              </TableCell>
              <TableCell>
                {log.scope ? (
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {log.scope.replace(/_/g, " ")}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell
                className="text-xs text-muted-foreground max-w-[320px] truncate"
                title={log.summary ?? undefined}
              >
                {log.summary || "—"}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {log.actor_name || "System"}
              </TableCell>
            </TableRow>
          );
        })
      )}
    </TableBody>
  </Table>
);
