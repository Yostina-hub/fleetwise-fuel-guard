import Layout from "@/components/Layout";
import { FuelRequestWorkflow } from "@/components/fuel/FuelRequestWorkflow";

const FuelRequests = () => {
  return (
    <Layout>
      <div className="p-4 md:p-6">
        <FuelRequestWorkflow />
      </div>
    </Layout>
  );
};

export default FuelRequests;
