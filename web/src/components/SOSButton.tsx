import { motion } from "framer-motion";
import { Siren } from "lucide-react";
import { useSafetyStore } from "../store/safetyStore";

export default function SOSButton({ size = "lg", label = "HOLD FOR SOS" }: { size?: "lg" | "md"; label?: string }) {
  const { triggerSOS, sosActive, dismissSOS } = useSafetyStore();

  const dim = size === "lg" ? "w-48 h-48" : "w-32 h-32";

  return (
    <div className="relative grid place-items-center select-none">
      {/* Concentric rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`absolute ${dim} rounded-full border-2 border-pink-400/40`}
          animate={sosActive ? { scale: [1, 1.6, 1.6], opacity: [0.5, 0, 0] } : { scale: [1, 1.4, 1.4], opacity: [0.4, 0, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
        />
      ))}

      <motion.button
        onMouseDown={() => !sosActive && triggerSOS("Manual Press")}
        onClick={() => sosActive && dismissSOS()}
        className={`relative ${dim} rounded-full grid place-items-center text-white font-bold tracking-widest
          ${sosActive
            ? "bg-gradient-to-br from-rose-600 to-red-700"
            : "bg-gradient-to-br from-pink-500 via-rose-500 to-red-600 hover:brightness-110"}
          glow-pink`}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
      >
        <div className="absolute inset-3 rounded-full border border-white/20" />
        <div className="absolute inset-6 rounded-full border border-white/10" />
        <div className="flex flex-col items-center gap-2">
          <Siren className={size === "lg" ? "w-10 h-10" : "w-7 h-7"} strokeWidth={2.2} />
          <span className={size === "lg" ? "text-sm" : "text-[10px]"}>
            {sosActive ? "TAP TO DISARM" : label}
          </span>
        </div>
      </motion.button>
    </div>
  );
}
