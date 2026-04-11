import { motion, useReducedMotion } from "framer-motion";

const gridStyle = {
  position: "fixed",
  inset: 0,
  zIndex: -1,
  pointerEvents: "none",
  backgroundImage: [
    "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "64px 64px",
};

export default function BackgroundGrid() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div style={gridStyle} />;
  }

  return (
    <motion.div
      style={gridStyle}
      animate={{ backgroundPosition: ["0px 0px", "64px 64px"] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
  );
}
