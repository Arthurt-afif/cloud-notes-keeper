import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function LoadingSpinner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center py-16"
    >
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </motion.div>
  );
}
