import { motion } from "framer-motion";
import { Signal, WifiOff, Zap } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate?: string;
}

const ConnectionStatus = ({ isConnected, lastUpdate }: ConnectionStatusProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`
        rounded-lg p-4 relative overflow-hidden
        ${isConnected 
          ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 border border-emerald-400/50' 
          : 'bg-gradient-to-br from-red-500 via-red-600 to-rose-700 border border-red-400/50'
        }
        hover:shadow-2xl transition-all duration-500
        ${isConnected ? 'hover:shadow-emerald-500/30' : 'hover:shadow-red-500/30'}
      `}
    >
      {/* Animated background pattern */}
      <motion.div 
        className="absolute inset-0 opacity-20"
        animate={{ 
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      
      <div className="relative flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white drop-shadow-sm">Dashboard Connection</span>
        {isConnected ? (
          <motion.div
            animate={{ 
              opacity: [0.6, 1, 0.6],
              scale: [1, 1.2, 1],
            }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <Signal className="w-5 h-5 text-white drop-shadow-lg" />
          </motion.div>
        ) : (
          <WifiOff className="w-5 h-5 text-white" />
        )}
      </div>
      
      <motion.div 
        className="relative flex items-center gap-2"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isConnected && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-5 h-5 text-yellow-300" />
          </motion.div>
        )}
        <span className="text-2xl font-bold text-white tracking-wide drop-shadow-lg">
          {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </motion.div>
      
      {/* Pulse ring effect for connected state */}
      {isConnected && (
        <motion.div
          className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

export default ConnectionStatus;
