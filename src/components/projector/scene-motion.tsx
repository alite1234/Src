"use client";

import { motion, useReducedMotion } from "framer-motion";

import type { AnimationPreset } from "@/lib/types";
import { cn } from "@/lib/utils";

function variantsFor(preset: AnimationPreset) {
  switch (preset) {
    case "slide":
      return {
        initial: { opacity: 0, x: "-5%" },
        animate: { opacity: 1, x: "0%" },
      };
    case "rise":
      return {
        initial: { opacity: 0, y: "6%" },
        animate: { opacity: 1, y: "0%" },
      };
    case "zoom":
      return {
        initial: { opacity: 0, scale: 1.06 },
        animate: { opacity: 1, scale: 1 },
      };
    case "reveal":
      return {
        initial: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
        animate: { opacity: 1, clipPath: "inset(0 0% 0 0)" },
      };
    case "spotlight":
      return {
        initial: { opacity: 0, scale: 0.97, filter: "brightness(0.55)" },
        animate: { opacity: 1, scale: 1, filter: "brightness(1)" },
      };
    case "fade":
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      };
  }
}

export function SceneMotion({
  preset,
  children,
  className,
}: {
  preset: AnimationPreset;
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const variants = variantsFor(preset);

  if (reduceMotion) {
    return <div className={cn("h-full", className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn("h-full", className)}
      initial={variants.initial}
      animate={variants.animate}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
