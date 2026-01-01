import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

export interface Document {
  id: string;
  organization_id: string;
  document_type: string;
  entity_type: 'driver' | 'vehicle';
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  expiry_date?: string;
  issue_date?: string;
  document_number?: string;
  notes?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface UseDocumentsFilters {
  entityType?: 'driver' | 'vehicle';
  entityId?: string;
  documentType?: string;
}

export const useDocuments = (filters?: UseDocumentsFilters) => {
  const { organizationId } = useOrganization();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      let query = (supabase as any)
        .from("documents")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (filters?.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }
      if (filters?.entityId) {
        query = query.eq("entity_id", filters.entityId);
      }
      if (filters?.documentType) {
        query = query.eq("document_type", filters.documentType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!organizationId) return;

    fetchDocuments();

    let debounceTimer: NodeJS.Timeout;

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`documents-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchDocuments, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, filters?.entityType, filters?.entityId, filters?.documentType]);

  const createDocument = async (
    doc: Omit<Document, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'is_verified'>
  ) => {
    if (!organizationId) return null;

    try {
      const { data, error } = await (supabase as any)
        .from("documents")
        .insert({
          ...doc,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments((prev) => [data, ...prev]);
      toast.success("Document uploaded successfully");
      return data;
    } catch (err: any) {
      toast.error("Failed to upload document: " + err.message);
      return null;
    }
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      const { error } = await (supabase as any)
        .from("documents")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
      );
      toast.success("Document updated");
    } catch (err: any) {
      toast.error("Failed to update document: " + err.message);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success("Document deleted");
    } catch (err: any) {
      toast.error("Failed to delete document: " + err.message);
    }
  };

  const verifyDocument = async (id: string, userId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("documents")
        .update({
          is_verified: true,
          verified_by: userId,
          verified_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? { ...doc, is_verified: true, verified_by: userId, verified_at: new Date().toISOString() }
            : doc
        )
      );
      toast.success("Document verified");
    } catch (err: any) {
      toast.error("Failed to verify document: " + err.message);
    }
  };

  // Get documents expiring soon (within 30 days)
  const getExpiringDocuments = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return documents.filter((doc) => {
      if (!doc.expiry_date) return false;
      const expiryDate = new Date(doc.expiry_date);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
    });
  };

  // Get expired documents
  const getExpiredDocuments = () => {
    const now = new Date();
    return documents.filter((doc) => {
      if (!doc.expiry_date) return false;
      return new Date(doc.expiry_date) < now;
    });
  };

  return {
    documents,
    loading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    verifyDocument,
    getExpiringDocuments,
    getExpiredDocuments,
    refetch: fetchDocuments,
  };
};
