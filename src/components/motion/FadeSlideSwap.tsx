import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode } from "react";

type FadeSlideSwapProps = {
  swapKey: string;
  children: ReactNode;
};

export function FadeSlideSwap({ swapKey, children }: FadeSlideSwapProps) {
  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={swapKey}
        initial={{ opacity: 0, x: 8, y: 6, scale: 0.996 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: -8, y: -4, scale: 0.996 }}
        transition={{ type: "spring", stiffness: 280, damping: 30, mass: 0.85 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
