"use client";

import { motion, useReducedMotion } from "motion/react";

export function Atmosphere() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="bg-foreground/5 absolute -top-24 -left-20 size-64 rounded-full blur-3xl sm:size-80"
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="bg-foreground/5 absolute -right-16 bottom-8 size-56 rounded-full blur-3xl sm:size-72"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
