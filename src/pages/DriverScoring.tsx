import Layout from "@/components/Layout";
import { DriverScoringTab } from "@/components/fleet/DriverScoringTab";

const DriverScoring = () => {
  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        <DriverScoringTab />
      </div>
    </Layout>
  );
};

export default DriverScoring;
