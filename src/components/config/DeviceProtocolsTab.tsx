import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Pencil, Trash2, Shield, ShieldOff } from "lucide-react";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useDeviceProtocols, DeviceProtocol } from "@/hooks/useDeviceProtocols";
import { CreateProtocolDialog } from "./CreateProtocolDialog";
import { EditProtocolDialog } from "./EditProtocolDialog";

const ITEMS_PER_PAGE = 10;

const DeviceProtocolsTab = () => {
  const { protocols, isLoading, deleteProtocol, updateProtocol } = useDeviceProtocols();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<DeviceProtocol | null>(null);

  const handleEdit = (protocol: DeviceProtocol) => {
    setSelectedProtocol(protocol);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (protocol: DeviceProtocol) => {
    setSelectedProtocol(protocol);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedProtocol) {
      deleteProtocol.mutate(selectedProtocol.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedProtocol(null);
        },
      });
    }
  };

  const handleToggleActive = (protocol: DeviceProtocol) => {
    updateProtocol.mutate({
      id: protocol.id,
      is_active: !protocol.is_active,
    });
  };

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-label="Loading device protocols">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Device Protocol Decoders</h3>
          <p className="text-sm text-muted-foreground">
            Configure AVL codec parsers, CRC validation, and vendor-specific decoders
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} aria-label="Add new device protocol">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Add Protocol
        </Button>
      </div>

      <ProtocolsTable 
        protocols={protocols || []} 
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onToggleActive={handleToggleActive}
      />

      <CreateProtocolDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditProtocolDialog
        protocol={selectedProtocol}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Protocol</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{selectedProtocol?.protocol_name}" protocol? 
              This action cannot be undone and may affect devices using this protocol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface ProtocolsTableProps {
  protocols: DeviceProtocol[];
  onEdit: (protocol: DeviceProtocol) => void;
  onDelete: (protocol: DeviceProtocol) => void;
  onToggleActive: (protocol: DeviceProtocol) => void;
}

const ProtocolsTable = ({ protocols, onEdit, onDelete, onToggleActive }: ProtocolsTableProps) => {
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(protocols.length, ITEMS_PER_PAGE);
  const paginatedProtocols = protocols.slice(startIndex, endIndex);

  if (protocols.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" role="status" aria-label="No device protocols configured">
        <p>No device protocols configured</p>
        <p className="text-sm mt-2">Add protocols to decode tracker data with CRC validation</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Protocol Name</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Port</TableHead>
            <TableHead>CRC Validation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProtocols.map((protocol) => (
            <TableRow key={protocol.id}>
              <TableCell className="font-medium">{protocol.vendor}</TableCell>
              <TableCell>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  {protocol.protocol_name}
                </code>
              </TableCell>
              <TableCell>{protocol.version || "-"}</TableCell>
              <TableCell>
                {protocol.decoder_config?.port ? (
                  <Badge variant="outline">{protocol.decoder_config.port}</Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                {protocol.decoder_config?.crc_enabled ? (
                  <Badge variant="default" className="bg-green-600">
                    <Shield className="h-3 w-3 mr-1" />
                    {protocol.decoder_config.crc_type?.toUpperCase() || 'CRC'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <ShieldOff className="h-3 w-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {protocol.is_active ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Protocol actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(protocol)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleActive(protocol)}>
                      {protocol.is_active ? (
                        <>
                          <ShieldOff className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(protocol)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        currentPage={currentPage}
        totalItems={protocols.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default DeviceProtocolsTab;
