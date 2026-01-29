import { FileText, BarChart3, TrendingUp, Sparkles, Globe, Wifi, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReportsHeaderProps {
  totalReports: number;
  dateRange: string;
}

export const ReportsHeader = ({ totalReports, dateRange }: ReportsHeaderProps) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 p-6 md:p-8" style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}>
      {/* Tech grid pattern overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Arc segments */}
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20" viewBox="0 0 600 300">
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00bfff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#00bfff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00bfff" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {[120, 160, 200, 240].map((radius, i) => (
            <g key={i}>
              {[0, 1, 2, 3, 4, 5].map((j) => (
                <path
                  key={j}
                  d={`M ${300 + radius * Math.cos((j * 30 - 90) * Math.PI / 180)} ${150 + radius * Math.sin((j * 30 - 90) * Math.PI / 180)} A ${radius} ${radius} 0 0 1 ${300 + radius * Math.cos((j * 30 - 70) * Math.PI / 180)} ${150 + radius * Math.sin((j * 30 - 70) * Math.PI / 180)}`}
                  fill="none"
                  stroke="url(#arcGrad)"
                  strokeWidth={3 + i}
                  strokeLinecap="round"
                />
              ))}
            </g>
          ))}
        </svg>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#8DC63F]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl" />
      </div>

      {/* Grid lines */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 191, 255, 0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0, 191, 255, 0.5) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Green accent corner */}
      <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-bl from-[#8DC63F] via-[#6ba32d] to-transparent rounded-full opacity-60" />
      </div>

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Reports & Analytics
              </h1>
              <Badge variant="outline" className="bg-[#8DC63F]/10 border-[#8DC63F]/30 text-[#8DC63F] hidden sm:flex items-center gap-1">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI-Powered
              </Badge>
            </div>
            <p className="text-cyan-200/70 text-sm md:text-base flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Comprehensive fleet analytics, operational insights, and performance metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-cyan-300/60 text-xs mb-1">
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
              <span>Period: {dateRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#8DC63F]" aria-hidden="true" />
                  <span className="text-lg font-bold text-white">{totalReports}</span>
                  <span className="text-xs text-white/60">Reports Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="relative flex items-center gap-6 mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-white/70">Real-time Data</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#8DC63F]" />
          <span className="text-sm text-white/70">Global Coverage</span>
        </div>
      </div>
    </div>
  );
};
