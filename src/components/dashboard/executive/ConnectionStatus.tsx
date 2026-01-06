import { motion } from "framer-motion";
import { Signal, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate?: string;
}

const ConnectionStatus = ({ isConnected, lastUpdate }: ConnectionStatusProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        rounded-lg p-4 
        ${isConnected 
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 border border-emerald-500/50' 
          : 'bg-gradient-to-br from-red-600 to-red-700 border border-red-500/50'
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white/80">Dashboard Connection</span>
        {isConnected ? (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Signal className="w-4 h-4 text-white" />
          </motion.div>
        ) : (
          <WifiOff className="w-4 h-4 text-white" />
        )}
      </div>
      <div className="text-xl font-bold text-white">
        {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
      </div>
    </motion.div>
  );
};

export default ConnectionStatus;
