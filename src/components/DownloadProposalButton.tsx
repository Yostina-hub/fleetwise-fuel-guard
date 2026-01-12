import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { generateFleetProposal } from "@/lib/proposalGenerator";
import { toast } from "sonner";

export const DownloadProposalButton = () => {
  const handleDownload = () => {
    try {
      const filename = generateFleetProposal();
      toast.success(`Proposal downloaded: ${filename}`);
    } catch (error) {
      toast.error("Failed to generate proposal");
    }
  };

  return (
    <Button onClick={handleDownload} className="gap-2">
      <FileDown className="h-4 w-4" />
      Download Proposal PDF
    </Button>
  );
};
