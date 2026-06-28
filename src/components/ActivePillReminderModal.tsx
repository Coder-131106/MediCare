import React, { useState, useEffect } from "react";
import { Medicine } from "../types";
import { Bell, Check, Clock, X, AlertTriangle, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ActivePillReminderModalProps {
  medicine: Medicine;
  onTake: () => void;
  onSkip: () => void;
  onSnooze: () => void;
  familyContact: string;
}

export default function ActivePillReminderModal({
  medicine,
  onTake,
  onSkip,
  onSnooze,
  familyContact
}: ActivePillReminderModalProps) {
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds demo timer (represents 30 minutes)
  const [familyAlertTriggered, setFamilyAlertTriggered] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!familyAlertTriggered) {
        setFamilyAlertTriggered(true);
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, familyAlertTriggered]);

  return (
    <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        id="active-pill-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100"
      >
        {/* Pulsing Alarm Header */}
        <div className="bg-rose-500 text-white p-6 relative flex flex-col items-center justify-center text-center">
          <div className="absolute -top-12 w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center animate-ping opacity-25 z-0" />
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 relative z-10 animate-bounce">
            <Bell className="w-8 h-8 text-white" />
          </div>
          <span className="text-xs uppercase tracking-widest font-semibold bg-rose-600 px-3 py-1 rounded-full text-rose-100 mb-1">
            MEDICATION ALARM
          </span>
          <h2 className="text-2xl font-bold font-sans">It's Pill Time!</h2>
          <p className="text-sm text-rose-100 mt-1">Scheduled for {medicine.time}</p>
        </div>

        {/* Medication Details */}
        <div className="p-6 text-center">
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wide">Currently Due</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{medicine.name}</h3>
          <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 rounded-full text-slate-700 font-medium text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            Dosage: <span className="text-rose-600 font-bold">{medicine.dosage}</span>
          </div>

          {/* Adherence Timer Warning */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            {!familyAlertTriggered ? (
              <div className="text-sm text-slate-600">
                <p className="flex items-center justify-center gap-1 text-amber-600 font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4" /> 
                  Action required in {timeLeft}s
                </p>
                <p className="text-xs text-slate-400">
                  If unconfirmed, an urgent SMS alert will be sent to your family member <span className="font-medium text-slate-600">{familyContact}</span>.
                </p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / 30) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-500 rounded-lg text-white mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-800 text-sm">Family SMS Alert Sent!</h4>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      "Madhumitha has not confirmed today's {medicine.name} ({medicine.time}). Please check on them." 
                    </p>
                    <span className="text-[10px] text-rose-500 font-mono mt-1.5 block">Sent to: {familyContact}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 p-4 flex flex-col gap-2 border-t border-slate-100">
          <button
            onClick={onTake}
            id="pill-btn-taken"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Check className="w-5 h-5" />
            I have taken this
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSnooze}
              id="pill-btn-snooze"
              className="py-3 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-500" />
              Snooze 10 min
            </button>
            <button
              onClick={onSkip}
              id="pill-btn-skip"
              className="py-3 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 text-slate-500 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              Skip medication
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
