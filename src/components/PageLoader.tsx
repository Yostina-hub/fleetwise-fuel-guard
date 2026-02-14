import { motion } from "framer-motion";
import { Truck } from "lucide-react";

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="p-4 rounded-2xl bg-primary/10 border border-primary/20"
        animate={{ 
          boxShadow: [
            "0 0 0px hsl(84 54% 56% / 0.1)",
            "0 0 30px hsl(84 54% 56% / 0.3)",
            "0 0 0px hsl(84 54% 56% / 0.1)",
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Truck className="w-8 h-8 text-primary" />
      </motion.div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  </div>
);
