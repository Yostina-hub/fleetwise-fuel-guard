import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimulationParams {
  fleetSize: number;
  avgDailyKm: number;
  fuelPrice: number;
  evPercent: number;
  optimizeRoutes: boolean;
  driverTraining: boolean;
  months?: number;
  iterations?: number;
}

function runMonthlyProjection(params: SimulationParams) {
  const months = params.months || 12;
  const iterations = Math.min(params.iterations || 500, 1000);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();

  // Base calculations
  const baseMonthly = params.fleetSize * params.avgDailyKm * 30 * 0.12 * params.fuelPrice;
  const routeS = params.optimizeRoutes ? 0.15 : 0;
  const trainS = params.driverTraining ? 0.08 : 0;
  const evS = (params.evPercent / 100) * 0.40;
  const totalSavingsBase = routeS + trainS + evS;

  // Monte Carlo across months
  const monthlyResults = [];
  let cumulativeBaseline = 0;
  let cumulativeSavingsP50 = 0;

  for (let m = 0; m < months; m++) {
    const monthIdx = (now.getMonth() + m) % 12;
    const seasonal = 1 + ([11,0,1].includes(monthIdx) ? 0.08 : [5,6,7].includes(monthIdx) ? -0.05 : 0);
    const evRamp = 1 + (m / months) * 0.1;
    const monthBaseline = baseMonthly * seasonal;

    // Monte Carlo for this month
    const savings: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const variance = 1 + (Math.random() - 0.5) * 0.3;
      const sVar = totalSavingsBase * evRamp * (1 + (Math.random() - 0.5) * 0.4);
      savings.push(monthBaseline * variance * Math.min(sVar, 0.95));
    }
    savings.sort((a, b) => a - b);

    const p10 = savings[Math.floor(iterations * 0.1)];
    const p50 = savings[Math.floor(iterations * 0.5)];
    const p90 = savings[Math.floor(iterations * 0.9)];

    cumulativeBaseline += monthBaseline;
    cumulativeSavingsP50 += p50;

    monthlyResults.push({
      month: monthNames[monthIdx],
      monthIndex: m,
      baseline: Math.round(monthBaseline),
      savingsP10: Math.round(p10),
      savingsP50: Math.round(p50),
      savingsP90: Math.round(p90),
      optimizedCost: Math.round(monthBaseline - p50),
      cumulativeBaseline: Math.round(cumulativeBaseline),
      cumulativeSavings: Math.round(cumulativeSavingsP50),
    });
  }

  // Break-even analysis (months until investment pays off)
  const implementationCost = params.fleetSize * 500; // rough per-vehicle implementation cost
  let breakEvenMonth = -1;
  let runningTotal = 0;
  for (let i = 0; i < monthlyResults.length; i++) {
    runningTotal += monthlyResults[i].savingsP50;
    if (runningTotal >= implementationCost && breakEvenMonth < 0) {
      breakEvenMonth = i + 1;
    }
  }

  const annualSavingsP50 = monthlyResults.reduce((s, m) => s + m.savingsP50, 0);
  const co2Reduction = params.fleetSize * params.avgDailyKm * 30 * 0.00023 * totalSavingsBase * 12;

  return {
    monthlyProjections: monthlyResults,
    summary: {
      baselineAnnual: Math.round(cumulativeBaseline),
      annualSavingsP10: monthlyResults.reduce((s, m) => s + m.savingsP10, 0),
      annualSavingsP50,
      annualSavingsP90: monthlyResults.reduce((s, m) => s + m.savingsP90, 0),
      totalSavingsPercent: totalSavingsBase,
      co2ReductionTons: Math.round(co2Reduction),
      roi: cumulativeBaseline > 0 ? ((annualSavingsP50 / cumulativeBaseline) * 100) : 0,
      breakEvenMonths: breakEvenMonth,
      implementationCost: Math.round(implementationCost),
    },
    metadata: {
      iterations,
      months,
      timestamp: new Date().toISOString(),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as SimulationParams;

    // Validate
    if (!body.fleetSize || body.fleetSize < 1 || body.fleetSize > 100000) {
      return new Response(JSON.stringify({ error: "Invalid fleetSize (1-100000)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = runMonthlyProjection(body);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
