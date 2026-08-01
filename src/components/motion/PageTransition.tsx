import { motion } from "framer-motion";
import { type ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.997 }}
      transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
      className="pageTransition"
    >
      {children}
    </motion.div>
  );
}
