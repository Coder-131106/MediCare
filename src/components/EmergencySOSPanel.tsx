import React, { useState, useEffect } from "react";
import { Phone, AlertOctagon, HeartPulse, User, ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EmergencySOSPanelProps {
  familyPhone: string;
  familyName: string;
}

export default function EmergencySOSPanel({ familyPhone, familyName }: EmergencySOSPanelProps) {
  const [dialingContact, setDialingContact] = useState<{ name: string; number: string; type: string } | null>(null);
  const [timer, setTimer] = useState(5);

  useEffect(() => {
    if (!dialingContact) return;
    if (timer <= 0) {
      // Simulate successful call establishment
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [dialingContact, timer]);

  const startCall = (name: string, number: string, type: string) => {
    setDialingContact({ name, number, type });
    setTimer(5);
  };

  const cancelCall = () => {
    setDialingContact(null);
  };

  const emergencyContacts = [
    {
      name: "Emergency Ambulance",
      number: "911 (Ambulance)",
      type: "ambulance",
      icon: HeartPulse,
      color: "bg-red-500 hover:bg-red-600 shadow-red-500/20 text-white",
      desc: "Instant connection to local dispatch"
    },
    {
      name: familyName || "Family Emergency Contact",
      number: familyPhone || "+1 (555) 019-2834",
      type: "family",
      icon: User,
      color: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white",
      desc: "Alert and dial your saved kin"
    },
    {
      name: "Dr. Kumar (Primary Doctor)",
      number: "+1 (555) 293-1029",
      type: "doctor",
      icon: ShieldAlert,
      color: "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20 text-white",
      desc: "Speak with your cardiologist"
    }
  ];

  return (
    <div id="emergency-sos-panel" className="bg-rose-50 rounded-3xl p-6 border border-rose-100 shadow-xs relative overflow-hidden">
      {/* Visual background decor */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-rose-200/20 rounded-full blur-2xl -z-10" />
      
      <div className="mb-4">
        <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-rose-500 animate-pulse" />
          Emergency Speed Dial
        </h3>
        <p className="text-xs text-rose-700/80 mt-0.5">
          Single tap to trigger urgent alerts and simulate instant emergency calls.
        </p>
      </div>

      <div className="space-y-2.5">
        {emergencyContacts.map((contact, index) => {
          const IconComponent = contact.icon;
          return (
            <button
              key={index}
              onClick={() => startCall(contact.name, contact.number, contact.type)}
              id={`sos-btn-${contact.type}`}
              className={`w-full p-4 rounded-2xl flex items-center justify-between shadow-md transition-all active:scale-98 cursor-pointer ${contact.color}`}
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{contact.name}</h4>
                  <p className="text-xs opacity-80 font-mono font-medium mt-0.5">{contact.number}</p>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-rose-600 shadow-inner">
                <Phone className="w-4 h-4 fill-current text-rose-500" />
              </div>
            </button>
          );
        })}
      </div>

      {/* SOS DIALING OVERLAY */}
      <AnimatePresence>
        {dialingContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm"
          >
            <div className="absolute top-10 text-slate-400 text-xs font-mono tracking-wider uppercase">
              Emergency SOS Simulator
            </div>

            {/* Glowing Ring Animation */}
            <div className="relative w-40 h-40 flex items-center justify-center mb-8">
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-red-500/25 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-4 bg-red-500/35 rounded-full"
              />
              <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 z-10 animate-pulse">
                <Phone className="w-10 h-10 text-white fill-current" />
              </div>
            </div>

            <span className="text-xs text-red-400 font-mono uppercase tracking-widest font-bold">
              DIALING URGENT OUTBOUND
            </span>
            <h2 className="text-2xl font-black text-white mt-1.5">{dialingContact.name}</h2>
            <p className="text-sm font-mono text-slate-400 mt-1">{dialingContact.number}</p>

            {/* Countdown / Connection details */}
            <div className="mt-8 bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700/50 max-w-xs">
              {timer > 0 ? (
                <div>
                  <p className="text-xs text-slate-300">Establishing direct satellite line in</p>
                  <p className="text-3xl font-black text-red-500 mt-1.5 font-mono">{timer}s</p>
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-emerald-400"
                >
                  <p className="text-xs uppercase font-bold tracking-wider">Line Connected</p>
                  <p className="text-lg font-bold mt-1">SIMULATED CALL ACTIVE</p>
                  <p className="text-xs text-slate-400 mt-1">Talking via device audio channels...</p>
                </motion.div>
              )}
            </div>

            {/* End Call Button */}
            <button
              onClick={cancelCall}
              id="sos-cancel-btn"
              className="mt-12 px-8 py-4 bg-slate-100 text-slate-800 rounded-full font-bold hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-2 text-sm shadow-lg active:scale-95"
            >
              <X className="w-4 h-4 text-slate-500" />
              End Simulated Call
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
