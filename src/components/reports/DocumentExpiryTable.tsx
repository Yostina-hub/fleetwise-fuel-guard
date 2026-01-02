import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { format, differenceInDays, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface Document {
  id: string;
  document_type: string;
  entity_type: string;
  file_name: string;
  expiry_date?: string;
  is_verified?: boolean;
}

interface DocumentExpiryTableProps {
  documents: Document[];
}

export const DocumentExpiryTable = ({ documents }: DocumentExpiryTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const today = new Date();
  
  const expiringDocs = documents
    .filter(d => d.expiry_date)
    .map(d => ({ ...d, daysUntilExpiry: differenceInDays(new Date(d.expiry_date!), today), isExpired: isBefore(new Date(d.expiry_date!), today) }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const totalItems = expiringDocs.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDocs = expiringDocs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (expiringDocs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Documents with Expiry Dates</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No documents with expiration tracking found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg"><FileText className="w-5 h-5 text-primary" />Document Expiry Report ({totalItems})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Document</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedDocs.map((doc) => (
                <tr key={doc.id} className={cn("hover:bg-muted/30 transition-colors", doc.isExpired && "bg-red-500/5")}>
                  <td className="px-4 py-3 font-medium text-sm max-w-xs truncate">{doc.file_name}</td>
                  <td className="px-4 py-3 capitalize">{doc.document_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 capitalize text-sm text-muted-foreground">{doc.entity_type}</td>
                  <td className="px-4 py-3 text-sm">{format(new Date(doc.expiry_date!), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3">{doc.isExpired ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" />Expired</span> : doc.daysUntilExpiry <= 30 ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" />{doc.daysUntilExpiry} days</span> : <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">{doc.daysUntilExpiry} days</span>}</td>
                  <td className="px-4 py-3">{doc.is_verified ? <CheckCircle className="w-5 h-5 text-green-500" /> : <span className="text-muted-foreground text-sm">Pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
      </CardContent>
    </Card>
  );
};