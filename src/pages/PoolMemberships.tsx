import Layout from "@/components/Layout";
import PoolMembershipsManager from "@/components/admin/PoolMembershipsManager";
import PoolCorridorSettings from "@/components/admin/PoolCorridorSettings";
import PoolSharedRidesOverview from "@/components/admin/PoolSharedRidesOverview";
import { Users } from "lucide-react";

const PoolMemberships = () => {
  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Pool Memberships
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign users to fleet pools as members (can request &amp; see their
            pool's vehicles) or managers (can approve and assign within the
            pool).
          </p>
        </div>
        <PoolMembershipsManager />
        <PoolCorridorSettings />
        <PoolSharedRidesOverview />
      </div>
    </Layout>
  );
};

export default PoolMemberships;
