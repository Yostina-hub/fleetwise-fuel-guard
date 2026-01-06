import { motion } from "framer-motion";
import { Wifi, WifiOff, Signal } from "lucide-react";

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
          ? 'bg-gradient-to-r from-success/20 to-success/10 border border-success/30' 
          : 'bg-gradient-to-r from-destructive/20 to-destructive/10 border border-destructive/30'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Dashboard Connection</span>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Signal className="w-4 h-4 text-success" />
            </motion.div>
          ) : (
            <WifiOff className="w-4 h-4 text-destructive" />
          )}
        </div>
      </div>
      <div className={`text-xl font-bold mt-1 ${isConnected ? 'text-success' : 'text-destructive'}`}>
        {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
      </div>
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Last update: {lastUpdate}
        </span>
      )}
    </motion.div>
  );
};

export default ConnectionStatus;
