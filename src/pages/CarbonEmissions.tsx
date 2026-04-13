import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, TrendingDown, BarChart3, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const CarbonEmissions = () => {
  const { organizationId } = useOrganization();

  const { data: emissions = [], isLoading } = useQuery({
    queryKey: ["carbon-emissions", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("carbon_emissions")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .order("period_start", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const totalCO2 = emissions.reduce((s: number, e: any) => s + (e.co2_kg || 0), 0);
  const totalFuel = emissions.reduce((s: number, e: any) => s + (e.fuel_consumed_liters || 0), 0);
  const totalOffset = emissions.reduce((s: number, e: any) => s + (e.offset_credits || 0), 0);
  const netEmissions = totalCO2 - totalOffset;

  const chartData = emissions.slice(0, 12).reverse().map((e: any) => ({
    period: format(new Date(e.period_start), "MMM yy"),
    co2: Math.round(e.co2_kg || 0),
    fuel: Math.round(e.fuel_consumed_liters || 0),
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Carbon Emissions</h1><p className="text-muted-foreground">Track fleet CO₂ emissions, fuel impact, and carbon offset programs</p></div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Leaf className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{(totalCO2 / 1000).toFixed(1)}t</p><p className="text-sm text-muted-foreground">Total CO₂</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Droplets className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{totalFuel.toLocaleString()}L</p><p className="text-sm text-muted-foreground">Fuel Consumed</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-emerald-500" /><div><p className="text-2xl font-bold">{(totalOffset / 1000).toFixed(1)}t</p><p className="text-sm text-muted-foreground">Offset Credits</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{(netEmissions / 1000).toFixed(1)}t</p><p className="text-sm text-muted-foreground">Net Emissions</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="details">By Vehicle</TabsTrigger></TabsList>

          <TabsContent value="overview">
            <Card><CardHeader><CardTitle>Emissions Trend</CardTitle></CardHeader><CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Bar dataKey="co2" fill="hsl(var(--primary))" name="CO₂ (kg)" /><Bar dataKey="fuel" fill="hsl(var(--muted-foreground))" name="Fuel (L)" /></BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">No emission data recorded yet</p>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="details">
            <Card><Table>
              <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Period</TableHead><TableHead>CO₂ (kg)</TableHead><TableHead>Fuel (L)</TableHead><TableHead>Distance (km)</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
                emissions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow> :
                emissions.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.vehicles?.plate_number || "—"}</TableCell>
                    <TableCell>{format(new Date(e.period_start), "MMM dd")} – {format(new Date(e.period_end), "MMM dd, yy")}</TableCell>
                    <TableCell>{e.co2_kg?.toFixed(1)}</TableCell>
                    <TableCell>{e.fuel_consumed_liters?.toFixed(0)}</TableCell>
                    <TableCell>{e.distance_km?.toFixed(0) || "—"}</TableCell>
                    <TableCell className="capitalize">{e.emission_source?.replace(/_/g, " ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CarbonEmissions;
