"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

type RitualTransitionProps = {
  transitionKey: string | number;
  children: ReactNode;
};

export default function RitualTransition({ transitionKey, children }: RitualTransitionProps) {
  return (
    <div className="ritual-transition">
      <AnimatePresence mode="wait">
        <motion.div
          className="ritual-transition__scene"
          key={transitionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: {
              duration: 0.4,
              delay: 0.6,
              ease: "easeOut",
            },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      <style>{`
        .ritual-transition {
          position: relative;
          min-height: 100vh;
          background: #000;
          overflow: hidden;
        }

        .ritual-transition__scene {
          min-height: 100vh;
          background: linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%);
        }
      `}</style>
    </div>
  );
}
