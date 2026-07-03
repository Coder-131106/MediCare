import { useState, useEffect, useRef } from "react";
import { 
  Clock, Heart, User, Activity, Trash2,
  Stethoscope, ArrowRight, ArrowLeft, Users, ClipboardList,
  Search, CalendarDays, Phone, ShieldAlert,
   MapPin, Droplet, CheckCircle2, XCircle,
  Zap, BellRing, UserMinus, Calendar, Eye, EyeOff, Mail, Smartphone, ShieldCheck, KeyRound, AlertCircle, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import PrescriptionOCRScanner from "./components/PrescriptionOCRScanner";
import HealthTipsWidget from "./components/HealthTipsWidget";

export default function App() {
  // --- AUTH & PERSISTENCE ---
  const [allAccounts, setAllAccounts] = useState<any[]>(() => 
    JSON.parse(localStorage.getItem("medicare_accounts") || "[]")
  );

  const [activeUser, setActiveUser] = useState<any>(() => {
    const saved = localStorage.getItem("medicare_active_session");
    return saved ? JSON.parse(saved) : null;
  });

  const [authStep, setAppStep] = useState<"landing" | "login" | "signup" | "otp-verify" | "forgot-email" | "forgot-otp" | "recover-choice" | "reset-pass" | "setup-patient" | "setup-doctor" | "dashboard">(() => {
    const saved = localStorage.getItem("medicare_active_session");
    if (saved) {
      const user = JSON.parse(saved);
      return user.profileComplete ? "dashboard" : "landing";
    }
    return "landing";
  });

  const [appointments, setAppointments] = useState<any[]>(() => 
    JSON.parse(localStorage.getItem("medicare_global_appointments") || "[]")
  );

  // --- UI & FEEDBACK STATES ---
  const [activeTab, setActiveTab] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [activeReminder, setActiveReminder] = useState<any>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [snoozedMeds, setSnoozedMeds] = useState<any[]>([]);
  const [otpInput, setOtpInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [recoveryName, setRecoveryName] = useState(""); 
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; type: "error" | "success" } | null>(null);

  const lastTriggeredMinute = useRef<string>("");
  const reminderTimeoutRef = useRef<any>(null);

  // --- FORM STATES ---
  const [authForm, setAuthForm] = useState({ name: "", pass: "", email: "", phone: "" });
  const [setupData, setSetupData] = useState({ 
    age: "", blood: "", emergencyName: "", emergencyPhone: "", 
    doctorName: "", doctorPhone: "", clinicAddress: "" 
  });
  const [medForm, setMedForm] = useState({ name: "", dosage: "", time: "" });
  const [apptForm, setApptForm] = useState({ reason: "", date: "" });
  const [patientReg, setPatientReg] = useState({ name: "", blood: "", phone: "", condition: "", famName: "", famPhone: "" });

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    localStorage.setItem("medicare_accounts", JSON.stringify(allAccounts));
    localStorage.setItem("medicare_global_appointments", JSON.stringify(appointments));
    if (activeUser) {
        localStorage.setItem("medicare_active_session", JSON.stringify(activeUser));
    }
  }, [activeUser, appointments, allAccounts]);

  // --- HELPERS ---
  const notify = (msg: string, type: "error" | "success" = "error") => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const playNotificationSound = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.play().catch(() => {});
  };

  const isPhoneValid = (p: string) => /^[0-9]{10}$/.test(p?.trim() || "");
  const isOnlyLetters = (s: string) => /^[a-zA-Z\s]+$/.test(s?.trim() || "");
  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isBloodValid = (bg: string) => {
    const validGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "RH-NULL", "BOMBAY", "HH", "GOLDEN BLOOD"];
    return validGroups.includes(bg?.trim().toUpperCase());
  };
  const normalize = (val: string) => val?.toLowerCase().trim();

  // --- ACTIONS ---
  const syncToMaster = (updatedUser: any) => {
    setActiveUser(updatedUser);
    setAllAccounts(prev => prev.map(acc => acc.id === updatedUser.id ? updatedUser : acc));
  };

  const handleLogin = () => {
    const user = allAccounts.find(u => 
        (normalize(u.name) === normalize(authForm.name) || normalize(u.email) === normalize(authForm.name)) 
        && u.pass === authForm.pass.trim()
    );
    if (!user) return notify("Invalid Credentials.");
    setActiveUser(user);
    setAppStep("dashboard");
    setShowPass(false);
  };

  const handleSignupInit = async (role: "patient" | "doctor") => {
    if (!isOnlyLetters(authForm.name)) return notify("Username error.");
    if (!isEmailValid(authForm.email)) return notify("Email error.");
    setIsVerifying(true);
    try {
        const response = await fetch("http://localhost:3000/api/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: authForm.email })
        });
        if (response.ok) {
            setActiveUser({ ...authForm, role, profileComplete: false, medicines: [], medHistory: [], skippedMeds: [], patients: [] }); 
            setAppStep("otp-verify");
        } else { notify("OTP failed."); }
    } catch (err) { notify("Server Error."); }
    finally { setIsVerifying(false); }
  };

  const handleVerifyRecoveryOTP = async () => {
    try {
        const response = await fetch("http://localhost:3000/api/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recoveryEmail, otp: otpInput }) });
        if (response.ok) {
            const user = allAccounts.find(u => normalize(u.email) === normalize(recoveryEmail));
            setActiveUser(user);
            setAppStep("recover-choice");
        } else { notify("Invalid Code."); }
    } catch (err) { alert("Error."); }
  };

  const handleForgotPassword = async () => {
    const targetUser = allAccounts.find(u => normalize(u.name) === normalize(recoveryName) && normalize(u.email) === normalize(recoveryEmail));
    if (!targetUser) return notify("Incorrect email, check again.");
    setIsVerifying(true);
    try {
        await fetch("http://localhost:3000/api/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recoveryEmail }) });
        setAppStep("forgot-otp");
    } catch (err) { notify("Failed."); }
    finally { setIsVerifying(false); }
  };

  const finalizeAccount = () => {
    const finalizedUser = { ...activeUser, ...setupData, id: Date.now().toString(), profileComplete: true };
    setAllAccounts(prev => [...prev, finalizedUser]);
    setActiveUser(finalizedUser);
    setAppStep("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("medicare_active_session");
    setActiveUser(null);
    setAppStep("landing");
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Delete account permanently?")) {
        setAllAccounts(allAccounts.filter(acc => acc.id !== activeUser.id));
        handleLogout();
    }
  };

  const addMedicine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newMeds = [...(activeUser.medicines || []), { id: (Date.now() + Math.random()).toString(), ...medForm }];
    syncToMaster({ ...activeUser, medicines: newMeds });
    setMedForm({ name: "", dosage: "", time: "" });
    notify("Reminder added.", "success");
  };

  const updateMedicineTime = (id: string, newTime: string) => {
    const updatedMeds = activeUser.medicines.map((m: any) => m.id === id ? { ...m, time: newTime } : m);
    syncToMaster({ ...activeUser, medicines: updatedMeds });
  };

  const bookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newAppt = { 
        id: Date.now().toString(), 
        ...apptForm, 
        patientId: activeUser.id, // FIXED: Track by ID for privacy
        patientName: activeUser.name, 
        doctorKey: normalize(activeUser.doctorName), 
        doctorDisplay: activeUser.doctorName 
    };
    setAppointments([...appointments, newAppt]);
    setApptForm({ reason: "", date: "" });
    notify("Sent.", "success");
  };

  const handleMedResponse = (action: "taken" | "skip" | "snooze") => {
    if (action === "taken") {
      const history = [{ name: activeReminder.name, time: activeReminder.time, dateTaken: new Date().toLocaleString() }, ...(activeUser.medHistory || [])];
      syncToMaster({ ...activeUser, medHistory: history });
    } else if (action === "skip") {
      const skipped = [{ name: activeReminder.name, scheduled: activeReminder.time, skippedAt: new Date().toLocaleString() }, ...(activeUser.skippedMeds || [])];
      syncToMaster({ ...activeUser, skippedMeds: skipped });
      notify(`${activeReminder.name} Skipped.`, "error");
    } else if (action === "snooze") {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 10);
      const snoozeTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setSnoozedMeds([...snoozedMeds, { ...activeReminder, triggerTime: snoozeTime }]);
    }
    setActiveReminder(null);
  };

  // --- ENGINE ---
  useEffect(() => {
    const loop = setInterval(() => {
      if (activeUser?.role !== 'patient' || activeReminder) return;
      const now = new Date();
      const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (lastTriggeredMinute.current === current) return;
      const due = activeUser.medicines?.find((m: any) => m.time === current);
      const snooze = snoozedMeds.find(s => s.triggerTime === current);
      if (due || snooze) {
          setActiveReminder(due || snooze);
          playNotificationSound();
          lastTriggeredMinute.current = current;
          if(snooze) setSnoozedMeds(prev => prev.filter(s => s.triggerTime !== current));
      }
    }, 1000);
    return () => clearInterval(loop);
  }, [activeUser, activeReminder, snoozedMeds]);

  // FIXED: Strictly filter requests by the active user's unique ID
  const myAppointments = appointments.filter(a => a.patientId === activeUser?.id);
  const docAppointments = appointments.filter(a => a.doctorKey === normalize(activeUser?.doctorName || activeUser?.name));
  const clinicSearchResults = (activeUser?.patients || []).filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- COMPONENTS ---
  const FeedbackUI = () => (
    <AnimatePresence>
      {feedback && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-xl mb-4 flex items-center gap-3 font-black text-xs uppercase ${feedback.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
          {feedback.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
          {feedback.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const SkippedDosesPanel = () => (
    <div className="bg-rose-50 border border-rose-100 rounded-[35px] p-8 shadow-sm flex flex-col gap-6">
        <div className="flex gap-4 items-center">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-rose-600 border border-rose-100">
                <AlertCircle size={24} />
            </div>
            <h3 className="font-black text-rose-900 text-lg tracking-tighter uppercase">SKIPPED DOSES</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {(!activeUser?.skippedMeds || activeUser.skippedMeds.length === 0) ? (
                <p className="text-[11px] text-rose-300 font-black uppercase italic text-center py-6">No missed medications.</p>
            ) : (
                activeUser.skippedMeds.map((m: any, i: number) => (
                    <div key={i} className="bg-white p-6 rounded-[30px] flex justify-between items-center shadow-sm border border-rose-100">
                        <div className="text-left font-black">
                            <p className="text-xl text-slate-800 uppercase mb-2">{m.name}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase">SCHEDULED: {m.scheduled} | SKIPPED: {m.skippedAt}</p>
                        </div>
                        <XCircle className="text-rose-500 shrink-0" size={32} />
                    </div>
                ))
            )}
        </div>
    </div>
  );

  // --- RENDERING ---
  if (authStep === "landing") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-black uppercase">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] p-12 max-w-lg w-full shadow-2xl">
        <Heart className="mx-auto text-indigo-600 mb-8" size={60} />
        <h1 className="text-4xl tracking-tighter mb-10">MediCare</h1>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setAppStep("login")} className="py-6 bg-indigo-600 text-white rounded-2xl shadow-lg">Login</button>
          <button onClick={() => setAppStep("signup")} className="py-6 border-2 border-indigo-600 text-indigo-600 rounded-2xl">Signup</button>
        </div>
      </motion.div>
    </div>
  );

  if (authStep === "login") return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 uppercase font-black">
        <button onClick={() => { setAppStep("landing"); setFeedback(null); }} className="mb-6 text-white/50 flex items-center gap-2 transition-all"><ArrowLeft size={18}/> Back</button>
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl space-y-8">
            <h2 className="text-3xl text-center">Login</h2>
            <FeedbackUI />
            <div className="space-y-4">
                <input placeholder="Username or Email" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                <div className="relative">
                    <input type={showPass ? "text" : "password"} placeholder="Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none pr-14" onChange={e => setAuthForm({...authForm, pass: e.target.value})} />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={22}/> : <Eye size={22}/>}</button>
                </div>
                <button onClick={handleLogin} className="w-full py-5 bg-indigo-600 text-white rounded-2xl shadow-lg">Enter Portal</button>
                <button onClick={() => { setAppStep("forgot-email"); setFeedback(null); }} className="w-full text-xs text-indigo-600 font-black uppercase">Forgot Password?</button>
            </div>
        </div>
    </div>
  );

  if (authStep === "signup") return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 uppercase font-black">
        <button onClick={() => { setAppStep("landing"); setFeedback(null); }} className="mb-6 text-white/50 flex items-center gap-2"><ArrowLeft size={18}/> Back</button>
        <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-3xl text-center">Signup</h2>
            <FeedbackUI />
            <div className="space-y-3 font-black">
                <input placeholder="Username" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                <input placeholder="Email" type="email" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                <input placeholder="Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
                <div className="relative">
                    <input type={showPass ? "text" : "password"} placeholder="Password" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none pr-14" onChange={e => setAuthForm({...authForm, pass: e.target.value})} />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                </div>
                <div className="grid grid-cols-1 gap-2 pt-4">
                    <button disabled={isVerifying} onClick={() => handleSignupInit("patient")} className="w-full py-4 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 rounded-2xl flex justify-between px-8 uppercase">{isVerifying ? "Sending..." : "As Patient"} <User size={20}/></button>
                    <button disabled={isVerifying} onClick={() => handleSignupInit("doctor")} className="w-full py-4 bg-indigo-600 text-white rounded-2xl flex justify-between px-8 uppercase">{isVerifying ? "Sending..." : "As Doctor"} <Stethoscope size={20}/></button>
                </div>
            </div>
        </div>
    </div>
  );

  // ... (Forgot Password screens stay same) ...
  if (authStep === "forgot-email") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-black">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl text-center space-y-6">
            <Mail size={50} className="mx-auto text-indigo-600" />
            <h2 className="text-2xl">Recover</h2>
            <FeedbackUI />
            <div className="space-y-4">
                <input placeholder="Username" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-black" onChange={e => setRecoveryName(e.target.value)} />
                <input placeholder="Gmail" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-black" onChange={e => setRecoveryEmail(e.target.value)} />
            </div>
            <button disabled={isVerifying} onClick={handleForgotPassword} className="w-full py-5 bg-indigo-600 text-white rounded-2xl shadow-lg">{isVerifying ? "Matching..." : "Get Code"}</button>
            <button onClick={() => { setAppStep("login"); setFeedback(null); }} className="text-xs text-slate-400 font-black">Back</button>
        </div>
    </div>
  );

  if (authStep === "forgot-otp") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-black">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl text-center space-y-8">
            <h2 className="text-2xl">Enter OTP</h2>
            <FeedbackUI />
            <input maxLength={4} placeholder="0000" className="w-full p-6 bg-slate-50 border rounded-3xl text-center text-4xl outline-none" onChange={e => setOtpInput(e.target.value)} />
            <button onClick={() => handleVerifyRecoveryOTP()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl shadow-lg">Verify</button>
        </div>
    </div>
  );

  if (authStep === "recover-choice") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-black text-center">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl space-y-8">
            <ShieldCheck size={60} className="mx-auto text-emerald-500" />
            <h2 className="text-2xl text-emerald-600 uppercase">Access Granted</h2>
            <div className="space-y-4 font-black">
                <button onClick={() => setAppStep("reset-pass")} className="w-full py-5 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 uppercase"><KeyRound size={18}/> New Password</button>
                <button onClick={() => setAppStep("dashboard")} className="w-full py-5 border-2 border-indigo-600 text-indigo-600 rounded-2xl flex items-center justify-center gap-3 uppercase"><Mail size={18}/> Login Directly</button>
            </div>
        </div>
    </div>
  );

  if (authStep === "reset-pass") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-black">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl text-center space-y-6">
            <h2 className="text-2xl uppercase">Reset</h2>
            <input type="password" placeholder="New Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-black" onChange={e => setNewPassword(e.target.value)} />
            <button onClick={() => {
                const updated = allAccounts.map(u => normalize(u.name) === normalize(recoveryName) ? {...u, pass: newPassword} : u);
                setAllAccounts(updated);
                setAppStep("dashboard");
                notify("Updated.", "success");
            }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase">Save & Login</button>
        </div>
    </div>
  );

  if (authStep === "otp-verify") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-black">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl text-center space-y-8 font-black">
            <ShieldCheck size={60} className="mx-auto text-indigo-600" />
            <h2 className="text-2xl uppercase">Verify Gmail</h2>
            <p className="text-slate-400 text-xs italic font-black">Sent to {activeUser.email}</p>
            <FeedbackUI />
            <input maxLength={4} placeholder="0000" className="w-full p-6 bg-slate-50 border rounded-3xl text-center text-4xl outline-none border-indigo-200 font-black" onChange={e => setOtpInput(e.target.value)} />
            <button disabled={isVerifying} onClick={async () => {
                setIsVerifying(true);
                const res = await fetch("http://localhost:3000/api/verify-otp", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({email: activeUser.email, otp: otpInput}) });
                setIsVerifying(false);
                if (res.ok) { setAppStep(activeUser.role === "patient" ? "setup-patient" : "setup-doctor"); setFeedback(null); }
                else notify("Incorrect Code.");
            }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl shadow-lg uppercase font-black">Verify</button>
        </div>
    </div>
  );

  if (authStep === "setup-patient" || authStep === "setup-doctor") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 uppercase font-black text-left">
        <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-xl space-y-6">
            <h2 className="text-2xl text-center font-black uppercase">Finalize Setup</h2>
            <FeedbackUI />
            {authStep === "setup-patient" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Age" type="number" className="p-4 bg-slate-50 rounded-2xl border font-black" onChange={e => setSetupData({...setupData, age: e.target.value})} />
                    <input placeholder="Blood Group (O+)" className="p-4 bg-slate-50 rounded-2xl border uppercase font-black" onChange={e => setSetupData({...setupData, blood: e.target.value})} />
                </div>
                <input placeholder="Family Member Name" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-black" onChange={e => setSetupData({...setupData, emergencyName: e.target.value})} />
                <input placeholder="Emergency Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-black" onChange={e => setSetupData({...setupData, emergencyPhone: e.target.value})} />
                <div className="border-t pt-4 space-y-2 font-sans uppercase"><input placeholder="Consulting Doctor" className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, doctorName: e.target.value})} /> <input placeholder="Doctor Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, doctorPhone: e.target.value})} /></div>
              </>
            ) : (
              <>
                <input placeholder="Clinic Number" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" onChange={e => setSetupData({...setupData, doctorPhone: e.target.value})} />
                <textarea placeholder="Facility Address" className="w-full p-4 bg-slate-50 border rounded-2xl min-h-[120px] font-black" onChange={e => setSetupData({...setupData, clinicAddress: e.target.value})} />
              </>
            )}
            <button onClick={finalizeAccount} className="w-full py-4 bg-indigo-600 text-white rounded-2xl shadow-lg uppercase font-black">Finish Setup</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-black uppercase">
      {/* GLOBAL POPUPS */}
      <AnimatePresence>
        {activeReminder && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white rounded-[50px] p-12 max-w-sm w-full shadow-2xl space-y-8 border-t-[12px] border-indigo-600">
              <div className="w-20 h-20 bg-indigo-100 rounded-full mx-auto flex items-center justify-center text-indigo-600 font-black"><Clock size={40} className="animate-bounce" /></div>
              <h2 className="text-3xl tracking-tighter uppercase font-black">Medicine Due!</h2>
              <p className="text-slate-500 italic font-bold uppercase">{activeReminder.name} ({activeReminder.dosage})</p>
              <button onClick={() => handleMedResponse("taken")} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl uppercase tracking-widest">Mark as Taken</button>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => handleMedResponse("snooze")} className="py-4 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] uppercase font-black">10 MIN REMIND</button>
                 <button onClick={() => handleMedResponse("skip")} className="py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] uppercase font-black">SKIP</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b sticky top-0 z-40 p-4 flex items-center justify-between px-10 shadow-sm">
        <h1 className="font-extrabold text-lg flex items-center gap-2 font-sans"><Heart className="text-indigo-600" /> MediCare Portal</h1>
        <button onClick={() => setActiveTab("profile")} className="bg-slate-50 p-2 rounded-xl border flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center rounded-lg">{activeUser.name?.[0]}</div>
            <p className="text-sm font-sans">{activeUser.name}</p>
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left uppercase">
        <div className="lg:col-span-3 flex flex-col gap-6 font-sans">
          <div className="bg-white rounded-3xl p-5 shadow-sm border space-y-1">
            <button onClick={() => setActiveTab("home")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={18}/> Dashboard</button>
            {activeUser.role === 'patient' ? (<><button onClick={() => setActiveTab("meds")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black ${activeTab === 'meds' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}><Clock size={18}/> Reminders</button><button onClick={() => setActiveTab("apps")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black ${activeTab === 'apps' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}><Calendar size={18}/> Appointments</button><button onClick={() => setActiveTab("history")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}><ClipboardList size={18}/> History</button></>) : (<button onClick={() => setActiveTab("patients")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black ${activeTab === 'patients' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}><Users size={18}/> Directory</button>)}
            <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}><User size={18}/> Profile</button>
          </div>
          {activeUser.role === 'patient' && <SkippedDosesPanel />}
        </div>

        <div className="lg:col-span-9 font-black">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-indigo-900 text-white p-12 rounded-[50px] shadow-lg relative overflow-hidden text-left font-black">
                    <h2 className="text-4xl font-black mb-3 uppercase">Hello, {activeUser.name}!</h2>
                    <p className="opacity-80 font-medium text-lg uppercase tracking-tight">{activeUser.role === 'doctor' ? activeUser.clinicAddress : 'Automated medicine tracking is active.'}</p>
                    <Zap className="absolute right-[-20px] top-[-20px] w-64 h-64 opacity-5 text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[45px] border shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="font-black text-slate-800 mb-8 uppercase tracking-widest">{activeUser.role === 'doctor' ? "Requests" : "Today"}</h3>
                    <div className="flex-1 font-black max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {activeUser.role === 'doctor' ? (docAppointments.length === 0 ? <p className="text-center py-20 text-slate-300 italic uppercase">No bookings.</p> : docAppointments.map(a => <div key={a.id} className="p-6 bg-indigo-50 border rounded-3xl mb-4 flex justify-between uppercase"><div><p className="font-black text-slate-800">{a.patientName}</p><p className="text-[10px] text-indigo-500 font-bold">{a.reason}</p></div><p className="text-xs font-black">{new Date(a.date).toLocaleDateString()}</p></div>)) : ((activeUser.medicines || []).map((m:any) => <div key={m.id} className="p-6 bg-slate-50 border rounded-3xl mb-4 flex justify-between font-black uppercase shadow-sm"><span>{m.name}</span><span className={!m.time ? "text-rose-500 animate-pulse font-bold" : "text-indigo-600"}>{m.time || "SET TIME"}</span></div>))}
                    </div>
                  </div>
                  {activeUser.role === 'patient' ? <div className="space-y-8"><PrescriptionOCRScanner onImportMedicines={(p:any) => { const withIds = p.map((m:any)=>({...m, id: Math.random(), time: ""})); syncToMaster({...activeUser, medicines: [...(activeUser.medicines || []), ...withIds]}); setActiveTab("meds"); }}/><HealthTipsWidget/></div> : <div className="bg-white p-10 rounded-[45px] border shadow-sm text-left font-black uppercase font-black"><h3 className="mb-8 uppercase font-black font-sans flex items-center gap-3"><Search className="text-indigo-600"/> Clinic Search</h3><input placeholder="Search name..." className="w-full p-6 bg-slate-50 border rounded-3xl outline-none text-lg shadow-inner font-black" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><div className="mt-4 space-y-2">{searchTerm && clinicSearchResults.map((p: any) => (<button key={p.id} onClick={() => { setActiveTab("patients"); setSelectedPatient(p); }} className="w-full p-4 flex justify-between items-center bg-white border rounded-2xl hover:border-indigo-400 transition-all font-black text-sm uppercase">{p.name} <ArrowRight size={16}/></button>))}</div></div>}
                </div>
              </motion.div>
            )}

            {/* RESTORED TABS */}
            {activeTab === "meds" && (
                <div className="space-y-8 text-left uppercase font-black">
                    <div className="bg-white p-10 rounded-[45px] border shadow-sm"><h3 className="font-black text-xl uppercase tracking-widest mb-8">Add Reminder</h3><FeedbackUI /><form onSubmit={addMedicine} className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black uppercase"><input required placeholder="Med Name" className="p-5 bg-slate-50 border rounded-3xl outline-none font-black" value={medForm.name} onChange={e => setMedForm({...medForm, name: e.target.value})} /><input required placeholder="Dosage" className="p-5 bg-slate-50 border rounded-3xl outline-none font-black" value={medForm.dosage} onChange={e => setMedForm({...medForm, dosage: e.target.value})} /><input required type="time" className="p-5 bg-slate-50 border rounded-3xl outline-none font-black" value={medForm.time} onChange={e => setMedForm({...medForm, time: e.target.value})} /><button className="md:col-span-3 py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl uppercase">Create Alert</button></form></div>
                    <div className="grid grid-cols-1 gap-4 font-black">{(activeUser.medicines || []).map((m:any) => (<div key={m.id} className="p-8 bg-white border rounded-[35px] shadow-sm flex justify-between items-center uppercase font-black"><div className="text-left font-black"><p className="text-2xl font-black">{m.name}</p><div className="flex items-center gap-3 mt-2 font-sans font-black uppercase"><div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 font-black"><Clock size={14} className={!m.time ? "text-rose-500 animate-pulse" : "text-indigo-600"}/><input type="time" className="bg-transparent text-[10px] outline-none font-black uppercase" value={m.time || ""} onChange={(e) => syncToMaster({...activeUser, medicines: activeUser.medicines.map((x:any)=>x.id===m.id?{...x, time: e.target.value}:x)})} /></div><span className="text-[10px] text-slate-400 opacity-50 uppercase tracking-widest font-black">{m.dosage}</span></div></div><button onClick={() => syncToMaster({...activeUser, medicines: activeUser.medicines.filter((x:any) => x.id !== m.id)})} className="p-4 text-rose-500 bg-rose-50 rounded-2xl hover:bg-rose-600 hover:text-white transition-all font-black"><Trash2/></button></div>))}</div>
                </div>
            )}

            {activeTab === "apps" && (
                <div className="space-y-8 uppercase font-black text-left"><div className="bg-white p-12 rounded-[50px] border shadow-sm font-black uppercase"><h3 className="text-2xl mb-8 tracking-widest font-black uppercase">Book Appointment</h3><FeedbackUI /><form onSubmit={bookAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left font-black"><input required placeholder="Reason for Visit" className="p-6 bg-slate-50 border rounded-[30px] outline-none font-black" value={apptForm.reason} onChange={e => setApptForm({...apptForm, reason: e.target.value})} /><input required type="datetime-local" className="p-6 bg-slate-50 border rounded-[30px] outline-none" value={apptForm.date} onChange={e => setApptForm({...apptForm, date: e.target.value})} /><button className="md:col-span-2 py-6 bg-indigo-600 text-white font-black rounded-[30px] shadow-2xl text-xl uppercase tracking-widest">Request Dr. {activeUser.doctorName}</button></form></div><div className="bg-white p-12 rounded-[50px] border shadow-sm uppercase font-black text-left font-sans shadow-sm font-black">
                    <h3 className="text-2xl mb-8 text-slate-400 uppercase font-black">My Requests</h3>
                    {myAppointments.map((a: any) => <div key={a.id} className="p-6 bg-slate-50 border rounded-[30px] mb-4 flex justify-between items-center shadow-sm font-sans"><div><p className="text-lg font-black uppercase font-sans">{a.reason}</p><p className="text-[10px] text-indigo-400 mt-1 uppercase font-sans">Provider: {a.doctorDisplay}</p></div><p className="text-xs text-slate-400 font-sans">{new Date(a.date).toLocaleString()}</p></div>)}
                </div></div>
            )}

            {activeTab === "history" && (
                <div className="bg-white p-12 rounded-[50px] border shadow-sm text-left uppercase font-black font-black uppercase"><h3 className="text-2xl mb-10 tracking-widest uppercase font-black uppercase">Intake Logs</h3><FeedbackUI />{(activeUser.medHistory || []).length === 0 ? <p className="text-center py-24 text-slate-300 italic tracking-widest text-lg opacity-40 uppercase">No history found.</p> : activeUser.medHistory.map((m:any, i:number) => (<div key={i} className="p-8 bg-emerald-50 border border-emerald-100 rounded-[35px] flex justify-between items-center mb-5 uppercase shadow-sm"><div><p className="text-2xl font-black">{m.name}</p><p className="text-[10px] text-slate-400 mt-1 uppercase font-sans">Scheduled: {m.time} | Recorded: {m.dateTaken}</p></div><CheckCircle2 className="text-emerald-500 font-black" size={40} /></div>))}</div>
            )}

            {activeTab === "patients" && (
              <div className="space-y-8 text-left uppercase font-black font-sans uppercase font-black"><div className="bg-white p-12 rounded-[50px] border shadow-sm text-left font-black uppercase font-black"><h3 className="text-2xl mb-8 tracking-widest uppercase font-black font-sans font-black">Directory Entry</h3><FeedbackUI /><form onSubmit={(e) => { e.preventDefault(); if(!isPhoneValid(patientReg.phone)) return notify("Mobile Error."); if(!isBloodValid(patientReg.blood)) return notify("Blood Error."); syncToMaster({...activeUser, patients: [...(activeUser.patients || []), { ...patientReg, id: Date.now().toString() }] }); setPatientReg({ name: "", blood: "", phone: "", condition: "", famName: "", famPhone: "" }); notify("Saved.", "success"); }} className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black uppercase font-sans font-black"><input required placeholder="Patient Full Name" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none font-black" value={patientReg.name} onChange={e => setPatientReg({...patientReg, name: e.target.value})} /><input required placeholder="BLOOD GROUP" className="p-6 bg-slate-50 border rounded-[30px] uppercase outline-none font-black font-black" value={patientReg.blood} onChange={e => setPatientReg({...patientReg, blood: e.target.value})} /><input required maxLength={10} placeholder="Mobile" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none uppercase font-black" value={patientReg.phone} onChange={e => setPatientReg({...patientReg, phone: e.target.value})} /><input required placeholder="Diagnosis" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none uppercase font-black" value={patientReg.condition} onChange={e => setPatientReg({...patientReg, condition: e.target.value})} /><input required placeholder="Backup Support Name" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none uppercase font-black" value={patientReg.famName} onChange={e => setPatientReg({...patientReg, famName: e.target.value})} /><input required maxLength={10} placeholder="Backup Phone" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none uppercase font-black" value={patientReg.famPhone} onChange={e => setPatientReg({...patientReg, famPhone: e.target.value})} /><button className="md:col-span-2 py-6 bg-indigo-600 text-white font-black rounded-[30px] shadow-2xl text-xl uppercase tracking-widest font-sans font-black">Confirm Record</button></form></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8 uppercase font-black">{(activeUser.patients || []).map((p:any) => (<div key={p.id} className="relative group text-left uppercase font-black uppercase"><div onClick={() => setSelectedPatient(p)} className={`p-10 rounded-[45px] border transition-all cursor-pointer shadow-sm ${selectedPatient?.id === p.id ? 'bg-indigo-600 text-white shadow-2xl' : 'bg-white hover:border-indigo-400'}`}><p className="font-black text-2xl mb-1 uppercase tracking-tighter text-left font-black">{p.name}</p><p className={`text-[10px] uppercase tracking-widest ${selectedPatient?.id === p.id ? 'text-white/70' : 'text-slate-400'} font-black`}>{p.condition}</p></div><button onClick={(e) => { e.stopPropagation(); syncToMaster({...activeUser, patients: activeUser.patients.filter((x:any) => x.id !== p.id)}); if(selectedPatient?.id === p.id) setSelectedPatient(null); }} className="absolute -top-3 -right-3 p-4 bg-white text-rose-500 rounded-full shadow-2xl border-4 border-rose-50 hover:bg-rose-500 hover:text-white transition-all font-black uppercase"><Trash2 /></button></div>))}</div>{selectedPatient && (<motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-indigo-900 text-white p-12 rounded-[60px] shadow-2xl space-y-10 uppercase font-black text-left font-black uppercase"><div className="flex justify-between items-start font-sans font-black"><div><h3 className="text-5xl tracking-tighter uppercase font-black font-sans uppercase font-black">{selectedPatient.name}</h3><p className="font-bold opacity-70 mt-3 text-xl flex items-center gap-3 uppercase font-black font-sans font-black"><Phone size={22} /> {selectedPatient.phone}</p></div><button onClick={() => setSelectedPatient(null)} className="px-8 py-3 bg-white/10 rounded-full text-xs border border-white/20 uppercase tracking-widest font-black uppercase">Close File</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left uppercase font-black"><div className="bg-white/10 p-10 rounded-[50px] border border-white/10 text-left uppercase font-black font-black uppercase"><p className="text-[10px] opacity-60 mb-3 tracking-widest font-sans font-black uppercase">Summary</p><p className="text-2xl font-medium leading-relaxed italic font-sans font-black">"{selectedPatient.condition}"</p><div className="mt-8 flex items-center gap-4 text-sm bg-indigo-800/50 w-fit px-6 py-3 rounded-3xl font-sans font-black font-black uppercase"><Droplet size={18} className="text-rose-400 font-black"/> Blood Group {selectedPatient.blood}</div></div><div className="bg-white/10 p-10 rounded-[50px] border border-white/10 text-left font-black uppercase font-black uppercase"><p className="text-[10px] opacity-60 mb-6 tracking-widest font-sans uppercase font-black">Emergency Support</p><div className="flex items-center gap-6 font-black"><div className="w-16 h-16 rounded-[25px] bg-indigo-600 flex items-center justify-center shadow-lg font-black font-black uppercase"><ShieldAlert size={35} className="font-black"/></div><div><p className="text-2xl font-black font-black uppercase">{selectedPatient.famName}</p><p className="text-xl opacity-70 mt-1 uppercase font-sans font-black font-black uppercase">{selectedPatient.famPhone}</p></div></div></div></div></motion.div>)}</div>
            )}

            {activeTab === "profile" && (
               <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-12 rounded-[50px] border shadow-sm text-left uppercase space-y-12 font-black uppercase font-black"><h2 className="text-4xl border-b pb-8 tracking-tighter uppercase font-black font-black">My Profile</h2><FeedbackUI /><div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-black uppercase font-sans font-black"><div><label className="text-[10px] text-slate-400 uppercase tracking-widest font-black uppercase">USERNAME</label><p className="text-2xl mt-1 underline decoration-indigo-200 decoration-4 font-black font-black">{activeUser.name}</p></div><div><label className="text-[10px] text-slate-400 uppercase tracking-widest font-black font-black">ROLE</label><p className="text-2xl text-indigo-600 mt-1 font-black uppercase font-black font-black">{activeUser.role}</p></div>{activeUser.role === 'patient' ? (<><div><label className="text-[10px] text-slate-400 uppercase tracking-widest font-black font-black">CLINICAL DATA</label><p className="text-xl mt-1 font-black uppercase font-black font-black">{activeUser.age} Years • {activeUser.blood}</p></div><div><label className="text-[10px] text-rose-400 uppercase tracking-widest font-black font-black">SOS CONTACT</label><p className="text-xl text-rose-600 mt-1 font-black flex items-center gap-2 uppercase font-sans font-black font-black font-black font-black"><Phone size={18} className="font-black"/> {activeUser.emergencyName} ({activeUser.emergencyPhone})</p></div><div className="md:col-span-2 border-t pt-10 font-black uppercase font-black"><label className="text-[10px] text-slate-400 uppercase tracking-widest font-black font-black">PRIMARY PRACTITIONER</label><p className="text-xl mt-2 font-black flex items-center gap-3 font-sans uppercase font-black font-black font-black"> Dr. {activeUser.doctorName} • {activeUser.doctorPhone}</p></div></>) : (<div className="md:col-span-2 space-y-3 font-black uppercase font-black font-black uppercase font-black"><label className="text-[10px] text-slate-400 uppercase tracking-widest font-black font-black">FACILITY LOCATION</label><p className="text-xl flex items-center gap-4 uppercase font-black font-sans font-black font-black font-black font-black font-black"><MapPin size={32} className="text-indigo-600 shrink-0 font-black font-black uppercase"/> {activeUser.clinicAddress || 'Clinic Hub'}</p></div>)}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20 font-black uppercase font-black font-black uppercase font-black"><button onClick={handleLogout} className="w-full py-8 bg-slate-50 border-2 border-slate-200 text-slate-600 rounded-[35px] hover:bg-slate-200 transition-all uppercase tracking-widest font-black uppercase">Logout</button><button onClick={handleDeleteAccount} className="w-full py-8 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-[35px] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3 uppercase tracking-widest font-black font-black">Permanent Account Delete</button></div></motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}