import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Thermometer, DoorOpen, Siren, Gauge, KeyRound, CircuitBoard, Weight, Fuel, Wrench, Activity } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useTranslation } from "react-i18next";
import SensorInventoryTab from "@/components/iot-sensors/SensorInventoryTab";
import DoorSensorTab from "@/components/iot-sensors/DoorSensorTab";
import PanicButtonTab from "@/components/iot-sensors/PanicButtonTab";
import TPMSTab from "@/components/iot-sensors/TPMSTab";
import DriverIdTab from "@/components/iot-sensors/DriverIdTab";
import HardwareSensorDataTab from "@/components/iot-sensors/HardwareSensorDataTab";
import SensorCalibrationTab from "@/components/iot-sensors/SensorCalibrationTab";
import FuelProbeCalibrationPanel from "@/components/fleet/FuelProbeCalibrationPanel";
import OBDRemoteDiagnosticsPanel from "@/components/fleet/OBDRemoteDiagnosticsPanel";

const IoTSensorManagement = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [activeTab, setActiveTab] = useState("inventory");

  if (!organizationId) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading organization...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="h-7 w-7 text-primary" />
            {t("pages.iot_sensors.title", "Hardware & IoT Sensors")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("pages.iot_sensors.description", "Unified sensor ecosystem — TPMS, OBD-II, Door Security, Emergency SOS, Driver ID, Fuel Probes, Load Sensors & Calibration")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="inventory" className="gap-1.5"><Cpu className="h-3.5 w-3.5" /> Inventory</TabsTrigger>
            <TabsTrigger value="sensor-data" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Sensor Data</TabsTrigger>
            <TabsTrigger value="tpms" className="gap-1.5"><Gauge className="h-3.5 w-3.5" /> TPMS</TabsTrigger>
            <TabsTrigger value="obd2" className="gap-1.5"><CircuitBoard className="h-3.5 w-3.5" /> OBD-II</TabsTrigger>
            <TabsTrigger value="temperature" className="gap-1.5"><Thermometer className="h-3.5 w-3.5" /> Cold Chain</TabsTrigger>
            <TabsTrigger value="door" className="gap-1.5"><DoorOpen className="h-3.5 w-3.5" /> Door Security</TabsTrigger>
            <TabsTrigger value="panic" className="gap-1.5"><Siren className="h-3.5 w-3.5" /> Emergency SOS</TabsTrigger>
            <TabsTrigger value="driver_id" className="gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Driver ID</TabsTrigger>
            <TabsTrigger value="fuel-probe" className="gap-1.5"><Fuel className="h-3.5 w-3.5" /> Fuel Probes</TabsTrigger>
            <TabsTrigger value="calibrations" className="gap-1.5"><Wrench className="h-3.5 w-3.5" /> Calibrations</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <SensorInventoryTab organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="sensor-data">
            <HardwareSensorDataTab organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="tpms">
            <TPMSTab organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="obd2">
            <OBDRemoteDiagnosticsPanel />
          </TabsContent>

          <TabsContent value="temperature">
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground mb-2">Cold Chain temperature monitoring is available on the dedicated page for advanced analytics, compliance tracking, and threshold configuration.</p>
              <a href="/cold-chain" className="text-primary hover:underline text-sm font-medium">Go to Cold Chain Dashboard →</a>
            </div>
          </TabsContent>

          <TabsContent value="door">
            <DoorSensorTab organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="panic">
            <PanicButtonTab organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="driver_id">
            <DriverIdTab organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="fuel-probe">
            <FuelProbeCalibrationPanel />
          </TabsContent>

          <TabsContent value="calibrations">
            <SensorCalibrationTab organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default IoTSensorManagement;
