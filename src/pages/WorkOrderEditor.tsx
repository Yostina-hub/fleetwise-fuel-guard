import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import OracleWorkOrderForm from "@/components/maintenance-enterprise/OracleWorkOrderForm";

/**
 * Oracle EBS-style Work Order editor page.
 *
 * Routes:
 *  - /maintenance-enterprise/wo/new?request=<maintenance_request_id>  -> create new WO from request
 *  - /maintenance-enterprise/wo/new                                   -> create blank WO
 *  - /maintenance-enterprise/wo/:id                                   -> edit existing WO
 */
const WorkOrderEditor = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isNew = !id || id === "new";
  const requestId = searchParams.get("request") || undefined;

  return (
    <Layout>
      <div className="p-3 md:p-6 animate-fade-in">
        <OracleWorkOrderForm
          workOrderId={isNew ? undefined : id}
          maintenanceRequestId={requestId}
          onCancel={() => navigate("/maintenance-enterprise")}
          onSaved={(woId) => {
            // Stay on the page after save; replace URL so refresh loads the saved WO.
            if (isNew && woId) navigate(`/maintenance-enterprise/wo/${woId}`, { replace: true });
          }}
        />
      </div>
    </Layout>
  );
};

export default WorkOrderEditor;
