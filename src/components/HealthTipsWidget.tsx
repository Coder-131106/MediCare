import React, { useState, useEffect } from "react";
import { HEALTH_TIPS } from "../data";
import { HealthTip } from "../types";
import { Sparkles, ArrowRight, Droplets, Bed, Flame, Utensils, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function HealthTipsWidget() {
  const [currentTip, setCurrentTip] = useState<HealthTip>(HEALTH_TIPS[0]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setCurrentTip(HEALTH_TIPS[index]);
  }, [index]);

  const rotateTip = () => {
    setIndex((prevIndex) => (prevIndex + 1) % HEALTH_TIPS.length);
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "hydration":
        return {
          icon: Droplets,
          bg: "bg-blue-50 border-blue-100",
          text: "text-blue-700",
          pill: "bg-blue-500 text-white"
        };
      case "sleep":
        return {
          icon: Bed,
          bg: "bg-purple-50 border-purple-100",
          text: "text-purple-700",
          pill: "bg-purple-500 text-white"
        };
      case "activity":
        return {
          icon: Flame,
          bg: "bg-amber-50 border-amber-100",
          text: "text-amber-700",
          pill: "bg-amber-500 text-white"
        };
      case "diet":
        return {
          icon: Utensils,
          bg: "bg-emerald-50 border-emerald-100",
          text: "text-emerald-700",
          pill: "bg-emerald-500 text-white"
        };
      case "adherence":
      default:
        return {
          icon: ClipboardCheck,
          bg: "bg-indigo-50 border-indigo-100",
          text: "text-indigo-700",
          pill: "bg-indigo-500 text-white"
        };
    }
  };

  const config = getCategoryStyles(currentTip.category);
  const IconComponent = config.icon;

  return (
    <div id="health-tips-widget" className={`rounded-3xl border p-5 transition-all duration-300 ${config.bg}`}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${config.pill} flex items-center justify-center`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider font-mono">
            {currentTip.category} advice
          </span>
        </div>
        <button
          onClick={rotateTip}
          id="btn-next-tip"
          className="text-xs font-bold flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
          style={{ color: "inherit" }}
        >
          Next Tip <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentTip.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
        >
          <p className={`text-sm font-semibold leading-relaxed ${config.text}`}>
            "{currentTip.tip}"
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
