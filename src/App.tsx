import { useState, useEffect, useRef } from "react";
import { 
  Clock, Heart, User, Activity, Trash2,
  Stethoscope, ArrowRight, ArrowLeft, Users, ClipboardList,
  Search, CalendarDays, Phone, ShieldAlert,
   MapPin, Droplet, CheckCircle2, XCircle,
  Zap, BellRing, UserMinus, Calendar, Eye, EyeOff, Mail, Smartphone, ShieldCheck, KeyRound, AlertCircle, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import PrescriptionOCRScanner from "./components/PrescriptionOCRScanner";
import HealthTipsWidget from "./components/HealthTipsWidget";

export default function App() {
  // --- 1. STATE MANAGEMENT ---
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const lastTriggeredMinute = useRef<string>("");

  // --- 2. FORM STATES ---
  const [authForm, setAuthForm] = useState({ name: "", pass: "", email: "", phone: "" });
  const [setupData, setSetupData] = useState({ age: "", blood: "", emergencyName: "", emergencyPhone: "", doctorName: "", doctorPhone: "", clinicAddress: "", clinicPhone: "" });
  const [medForm, setMedForm] = useState({ name: "", dosage: "", time: "" });
  const [apptForm, setApptForm] = useState({ reason: "", date: "" });
  const [patientReg, setPatientReg] = useState({ name: "", blood: "", phone: "", condition: "", famName: "", famPhone: "" });

  // --- 3. PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem("medicare_accounts", JSON.stringify(allAccounts));
    localStorage.setItem("medicare_global_appointments", JSON.stringify(appointments));
    if (activeUser) {
        localStorage.setItem("medicare_active_session", JSON.stringify(activeUser));
    }
  }, [activeUser, appointments, allAccounts]);

  // --- 4. HELPERS ---
  const notify = (msg: string, type: "error" | "success" = "error") => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const playSound = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.play().catch(() => {});
  };

  const isPhoneValid = (p: string) => /^[0-9]{10}$/.test(p?.trim() || "");
  const isOnlyLetters = (s: string) => /^[a-zA-Z\s,.]+$/.test(s?.trim() || "");
  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isBloodValid = (bg: string) => {
    const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "RH-NULL", "BOMBAY", "HH", "GOLDEN BLOOD"];
    return groups.includes(bg?.trim().toUpperCase());
  };
  const normalize = (val: string) => val?.toLowerCase().trim();

  const syncToMaster = (updatedUser: any) => {
    setActiveUser(updatedUser);
    setAllAccounts(prev => prev.map(acc => acc.id === updatedUser.id ? updatedUser : acc));
  };

  // --- 5. CORE ACTIONS ---
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
    if (!isEmailValid(authForm.email)) return notify("Gmail error.");
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
            notify("OTP sent.", "success");
        } else { notify("OTP failed. Is the server running?"); }
    } catch (err) { notify("Server connection failed."); }
    finally { setIsVerifying(false); }
  };

  const handleVerifyOTP = async (isRecovery: boolean) => {
    const email = isRecovery ? recoveryEmail : activeUser.email;
    setIsVerifying(true);
    try {
        const res = await fetch("http://localhost:3000/api/verify-otp", { 
          method: "POST", 
          headers: {"Content-Type":"application/json"}, 
          body: JSON.stringify({ email, otp: otpInput }) 
        });
        if (res.ok) {
            if (isRecovery) {
              const target = allAccounts.find(u => normalize(u.email) === normalize(recoveryEmail));
              setActiveUser(target);
              setAppStep("recover-choice");
            } else {
              setAppStep(activeUser.role === "patient" ? "setup-patient" : "setup-doctor");
            }
            setOtpInput("");
            setFeedback(null);
        } else { notify("Incorrect code."); }
    } catch (err) { notify("Error verifying code."); }
    finally { setIsVerifying(false); }
  };

  const handleForgotPassword = async () => {
    const target = allAccounts.find(u => normalize(u.name) === normalize(recoveryName) && normalize(u.email) === normalize(recoveryEmail));
    if (!target) return notify("Invalid username or email.");
    setIsVerifying(true);
    try {
        const res = await fetch("http://localhost:3000/api/send-otp", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ email: recoveryEmail }) 
        });
        if (res.ok) {
            setAppStep("forgot-otp");
            notify("Recovery OTP sent.", "success");
        } else { notify("Failed to send recovery email."); }
    } catch (err) { notify("Server error."); }
    finally { setIsVerifying(false); }
  };

  const finalizeAccount = () => {
    if (activeUser.role === "patient") {
        if (!isOnlyLetters(setupData.emergencyName) || !isOnlyLetters(setupData.doctorName)) return notify("Letters only.");
        if (!isPhoneValid(setupData.emergencyPhone) || !isPhoneValid(setupData.doctorPhone)) return notify("Phone error.");
        if (!isBloodValid(setupData.blood)) return notify("Invalid Blood Group.");
    } else {
        if (!isPhoneValid(setupData.clinicPhone)) return notify("Clinic phone error.");
    }
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

  const performPermanentDelete = () => {
    setAllAccounts(allAccounts.filter(acc => acc.id !== activeUser.id));
    handleLogout();
    setShowDeleteModal(false);
  };

  const addMedicine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newMeds = [...(activeUser.medicines || []), { id: (Date.now() + Math.random()).toString(), ...medForm }];
    syncToMaster({ ...activeUser, medicines: newMeds });
    setMedForm({ name: "", dosage: "", time: "" });
  };

  const updateMedicineTime = (id: string, newTime: string) => {
    const updatedMeds = activeUser.medicines.map((m: any) =>
      m.id === id ? { ...m, time: newTime } : m
    );
    syncToMaster({ ...activeUser, medicines: updatedMeds });
  };

  const bookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newAppt = { id: Date.now().toString(), ...apptForm, patientId: activeUser.id, patientName: activeUser.name, doctorKey: normalize(activeUser.doctorName), doctorDisplay: activeUser.doctorName };
    setAppointments([...appointments, newAppt]);
    setApptForm({ reason: "", date: "" });
    notify("Request sent.", "success");
  };

  const removeAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const handleMedResponse = (action: "taken" | "skip" | "snooze") => {
    if (action === "taken") {
      const history = [{ name: activeReminder.name, time: activeReminder.time, dateTaken: new Date().toLocaleString() }, ...(activeUser.medHistory || [])];
      syncToMaster({ ...activeUser, medHistory: history });
    } else if (action === "skip") {
      const skipped = [{ name: activeReminder.name, scheduled: activeReminder.time, skippedAt: new Date().toLocaleString() }, ...(activeUser.skippedMeds || [])];
      syncToMaster({ ...activeUser, skippedMeds: skipped });
      notify("Dose Skipped.", "error");
    } else if (action === "snooze") {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 10);
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setSnoozedMeds([...snoozedMeds, { ...activeReminder, triggerTime: time }]);
    }
    setActiveReminder(null);
  };

  // --- 6. REMINDER ENGINE ---
  useEffect(() => {
    const loop = setInterval(() => {
      if (!activeUser || authStep !== 'dashboard' || activeReminder) return;
      const now = new Date();
      const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (lastTriggeredMinute.current === current) return;

      const due = activeUser.medicines?.find((m: any) => m.time === current);
      const snooze = snoozedMeds.find(s => s.triggerTime === current);

      if (due || snooze) {
          setActiveReminder(due || snooze);
          playSound();
          lastTriggeredMinute.current = current;
          if(snooze) setSnoozedMeds(prev => prev.filter(s => s.triggerTime !== current));
      }
    }, 1000);
    return () => clearInterval(loop);
  }, [activeUser, activeReminder, snoozedMeds, authStep]);

  // --- 7. FILTERS & SEARCH ---
  const docApps = appointments.filter(a => a.doctorKey === normalize(activeUser?.doctorName || activeUser?.name));
  const myApps = appointments.filter(a => a.patientId === activeUser?.id);
  
  const patientSearch = (activeUser?.patients || []).filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- 8. UI COMPONENTS ---
  const FeedbackUI = () => (
    <AnimatePresence>
      {feedback && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-xl mb-4 flex items-center gap-3 font-bold text-xs uppercase ${feedback.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
          <AlertCircle size={16}/> {feedback.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const SkippedPanel = () => (
    <div className="bg-rose-50 border border-rose-100 rounded-[35px] p-8 shadow-sm flex flex-col gap-6">
        <div className="flex gap-4 items-center">
            <div className="p-3 bg-white rounded-2xl text-rose-600 border border-rose-100"><AlertCircle size={24} /></div>
            <h3 className="font-bold text-rose-900 text-lg tracking-tighter uppercase">SKIPPED DOSES</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {(!activeUser?.skippedMeds || activeUser.skippedMeds.length === 0) ? (
                <p className="text-[11px] text-rose-300 font-bold uppercase italic text-center py-6">No missed meds.</p>
            ) : (
                activeUser.skippedMeds.map((m: any, i: number) => (
                    <div key={i} className="bg-white p-6 rounded-[30px] flex justify-between items-center shadow-sm border border-rose-100">
                        <div className="text-left font-bold">
                            <p className="text-xl text-slate-800 uppercase mb-2 leading-none">{m.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase">SCHEDULED: {m.scheduled} | SKIPPED: {m.skippedAt}</p>
                        </div>
                        <XCircle className="text-rose-500 shrink-0" size={32} />
                    </div>
                ))
            )}
        </div>
    </div>
  );

  // --- 9. VIEW RENDERING ---
  if (authStep === "landing") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-bold uppercase">
      <div className="bg-white p-12 rounded-[40px] max-w-lg w-full shadow-2xl">
        <Heart className="mx-auto text-indigo-600 mb-8" size={60} />
        <h1 className="text-4xl tracking-tighter mb-10">MediCare</h1>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setAppStep("login")} className="py-6 bg-indigo-600 text-white rounded-2xl shadow-lg">Login</button>
          <button onClick={() => setAppStep("signup")} className="py-6 border-2 border-indigo-600 text-indigo-600 rounded-2xl">Signup</button>
        </div>
      </div>
    </div>
  );

  if (authStep === "login") return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 uppercase font-bold">
        <button onClick={() => setAppStep("landing")} className="mb-6 text-white/50 flex items-center gap-2 transition-all"><ArrowLeft size={18}/> Back</button>
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl space-y-8">
            <h2 className="text-3xl text-center">Login</h2>
            <FeedbackUI />
            <div className="space-y-4">
                <input placeholder="Name or Email" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                <div className="relative">
                    <input type={showPass ? "text" : "password"} placeholder="Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none pr-14" onChange={e => setAuthForm({...authForm, pass: e.target.value})} />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-all">{showPass ? <EyeOff size={22}/> : <Eye size={22}/>}</button>
                </div>
                <button onClick={handleLogin} className="w-full py-5 bg-indigo-600 text-white rounded-2xl shadow-lg">Enter</button>
                <button onClick={() => setAppStep("forgot-email")} className="w-full text-xs text-indigo-600 font-bold uppercase">Forgot Password?</button>
            </div>
        </div>
    </div>
  );

  if (authStep === "signup") return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 uppercase font-bold">
        <button onClick={() => setAppStep("landing")} className="mb-6 text-white/50 flex items-center gap-2"><ArrowLeft size={18}/> Back</button>
        <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-3xl text-center font-bold">Signup</h2>
            <FeedbackUI />
            <div className="space-y-3">
                <input placeholder="Name" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                <input placeholder="Email" type="email" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                <input placeholder="Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
                <div className="relative">
                    <input type={showPass ? "text" : "password"} placeholder="Password" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none pr-14" onChange={e => setAuthForm({...authForm, pass: e.target.value})} />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                </div>
                <div className="grid grid-cols-1 gap-2 pt-4">
                    <button disabled={isVerifying} onClick={() => handleSignupInit("patient")} className="w-full py-4 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 rounded-2xl">{isVerifying ? "Sending..." : "As Patient"}</button>
                    <button disabled={isVerifying} onClick={() => handleSignupInit("doctor")} className="w-full py-4 bg-indigo-600 text-white rounded-2xl">{isVerifying ? "Sending..." : "As Doctor"}</button>
                </div>
            </div>
        </div>
    </div>
  );

  if (authStep === "forgot-email") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-bold text-center">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl space-y-6">
            <Mail size={50} className="mx-auto text-indigo-600" />
            <h2 className="text-2xl">Recovery</h2>
            <FeedbackUI />
            <input placeholder="Name" className="w-full p-5 bg-slate-50 border rounded-2xl" onChange={e => setRecoveryName(e.target.value)} />
            <input placeholder="Gmail" className="w-full p-5 bg-slate-50 border rounded-2xl" onChange={e => setRecoveryEmail(e.target.value)} />
            <button onClick={handleForgotPassword} className="w-full py-5 bg-indigo-600 text-white rounded-2xl">Get OTP</button>
            <button onClick={() => setAppStep("login")} className="text-xs">Back</button>
        </div>
    </div>
  );

  if (authStep === "forgot-otp" || authStep === "otp-verify") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-bold text-center">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl text-center space-y-8">
            <h2 className="text-2xl">Code</h2>
            <FeedbackUI />
            <input maxLength={4} placeholder="0000" className="w-full p-6 bg-slate-50 border rounded-3xl text-center text-4xl outline-none" onChange={e => setOtpInput(e.target.value)} />
            <button onClick={() => handleVerifyOTP(authStep === "forgot-otp")} className="w-full py-5 bg-indigo-600 text-white rounded-2xl">Verify</button>
        </div>
    </div>
  );

  if (authStep === "recover-choice") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-bold text-center">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl space-y-8">
            <ShieldCheck size={60} className="mx-auto text-emerald-500" />
            <h2 className="text-2xl text-emerald-600 uppercase">Verified</h2>
            <div className="space-y-4">
                <button onClick={() => setAppStep("reset-pass")} className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase">New Password</button>
                <button onClick={() => setAppStep("dashboard")} className="w-full py-5 border-2 border-indigo-600 text-indigo-600 rounded-2xl uppercase">Continue</button>
            </div>
        </div>
    </div>
  );

  if (authStep === "reset-pass") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 uppercase font-bold text-center">
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl space-y-6">
            <h2 className="text-2xl">Reset</h2>
            <div className="relative">
                <input type={showPass ? "text" : "password"} placeholder="New Password" value={newPassword} className="w-full p-5 bg-slate-50 border rounded-2xl outline-none pr-14" onChange={e => setNewPassword(e.target.value)} />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={22}/> : <Eye size={22}/>}
                </button>
            </div>
            <button onClick={() => {
                const updated = allAccounts.map(u => normalize(u.name) === normalize(recoveryName) ? {...u, pass: newPassword} : u);
                setAllAccounts(updated);
                setAppStep("dashboard");
                notify("Updated.", "success");
                setShowPass(false);
            }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase font-bold">Save</button>
        </div>
    </div>
  );

  if (authStep === "setup-patient" || authStep === "setup-doctor") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 uppercase font-bold text-left">
        <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-xl space-y-6 font-bold uppercase">
            <h2 className="text-2xl text-center">Setup Profile</h2>
            <FeedbackUI />
            {activeUser.role === "patient" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Age" type="number" className="p-4 bg-slate-50 rounded-2xl border" onChange={e => setSetupData({...setupData, age: e.target.value})} />
                    <input placeholder="Blood Group" className="p-4 bg-slate-50 rounded-2xl border uppercase" onChange={e => setSetupData({...setupData, blood: e.target.value})} />
                </div>
                <input placeholder="Family Member" className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, emergencyName: e.target.value})} />
                <input placeholder="Family Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, emergencyPhone: e.target.value})} />
                <div className="border-t pt-4 font-sans uppercase"><input placeholder="Doctor" className="w-full p-4 bg-slate-50 border rounded-2xl mb-2" onChange={e => setSetupData({...setupData, doctorName: e.target.value})} /> <input placeholder="Doctor Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, doctorPhone: e.target.value})} /></div>
              </>
            ) : (
              <>
                <input placeholder="Clinic Phone Number" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, clinicPhone: e.target.value})} />
                <textarea placeholder="Clinic Address" className="w-full p-4 bg-slate-50 border rounded-2xl min-h-[120px]" onChange={e => setSetupData({...setupData, clinicAddress: e.target.value})} />
              </>
            )}
            <button onClick={finalizeAccount} className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase">Finish Registration</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-bold uppercase relative">
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center border-t-[12px] border-rose-600 space-y-8 shadow-2xl font-bold uppercase">
              <AlertCircle size={40} className="mx-auto text-rose-600" />
              <h2 className="text-xl">Delete your account permanently?</h2>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={performPermanentDelete} className="py-4 bg-rose-600 text-white rounded-2xl shadow-lg">Yes</button>
                 <button onClick={() => setShowDeleteModal(false)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeReminder && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white rounded-[50px] p-12 max-w-sm w-full shadow-2xl space-y-8 border-t-[12px] border-indigo-600 font-bold uppercase">
              <div className="w-20 h-20 bg-indigo-100 rounded-full mx-auto flex items-center justify-center text-indigo-600 animate-bounce font-black uppercase"><Clock size={40} /></div>
              <h2 className="text-3xl tracking-tighter uppercase font-black">Medicine Due!</h2>
              <p className="text-slate-500 italic font-bold uppercase">{activeReminder.name} ({activeReminder.dosage})</p>
              <button onClick={() => handleMedResponse("taken")} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-bold shadow-xl uppercase">Mark Taken</button>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => handleMedResponse("snooze")} className="py-4 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] uppercase font-bold">10 MIN REMIND</button>
                 <button onClick={() => handleMedResponse("skip")} className="py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] uppercase font-bold">SKIP</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b sticky top-0 z-40 p-4 flex items-center justify-between px-10 shadow-sm font-bold uppercase">
        <h1 className="font-extrabold text-lg flex items-center gap-2 font-sans uppercase font-bold"><Heart className="text-indigo-600" /> MediCare</h1>
        <button onClick={() => setActiveTab("profile")} className="bg-slate-50 p-2 rounded-xl border flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center rounded-lg">{activeUser?.name?.[0]}</div>
            <p className="text-sm font-sans">{activeUser?.name}</p>
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left uppercase font-bold">
        <div className="lg:col-span-3 space-y-4 font-sans uppercase">
          <div className="bg-white rounded-3xl p-5 border space-y-1">
            <button onClick={() => setActiveTab("home")} className={`w-full flex items-center gap-3 p-4 rounded-2xl ${activeTab === 'home' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Activity size={18}/> Home</button>
            {activeUser?.role === 'patient' ? (
              <>
                <button onClick={() => setActiveTab("meds")} className={`w-full flex items-center gap-3 p-4 rounded-2xl ${activeTab === 'meds' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Clock size={18}/> Reminders</button>
                <button onClick={() => setActiveTab("apps")} className={`w-full flex items-center gap-3 p-4 rounded-2xl ${activeTab === 'apps' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Calendar size={18}/> Appointments</button>
                <button onClick={() => setActiveTab("history")} className={`w-full flex items-center gap-3 p-4 rounded-2xl ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><ClipboardList size={18}/> History</button>
              </>
            ) : (
              <button onClick={() => setActiveTab("patients")} className={`w-full flex items-center gap-3 p-4 rounded-2xl ${activeTab === 'patients' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Users size={18}/> Directory</button>
            )}
            <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-3 p-4 rounded-2xl ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><User size={18}/> Profile</button>
          </div>
          {activeUser?.role === 'patient' && <SkippedPanel />}
        </div>

        <div className="lg:col-span-9 font-bold">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 uppercase font-bold">
                <div className="bg-indigo-900 text-white p-12 rounded-[50px] shadow-lg relative overflow-hidden">
                    <h2 className="text-4xl font-bold mb-3 uppercase">Hello, {activeUser?.name}!</h2>
                    <p className="opacity-80 font-medium text-lg uppercase">{activeUser?.role === 'doctor' ? activeUser.clinicAddress : ' Your medicine tracking is active.'}</p>
                    <Zap className="absolute right-[-20px] top-[-20px] w-64 h-64 opacity-5 text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 uppercase font-bold">
                  <div className="bg-white p-10 rounded-[45px] border flex flex-col min-h-[400px]">
                    <h3 className="font-bold text-slate-800 mb-8 uppercase tracking-widest font-bold">{activeUser?.role === 'doctor' ? "Requests" : "Today"}</h3>
                    <div className="flex-1 font-bold max-h-[400px] overflow-y-auto pr-2 custom-scrollbar uppercase">
                      {activeUser?.role === 'doctor' ? (
                        docApps.length === 0 ? <p className="text-center py-20 text-slate-300 italic uppercase">No bookings.</p> :
                        docApps.map(a => <div key={a.id} className="p-6 bg-indigo-50 border rounded-3xl mb-4 flex justify-between uppercase"><div><p className="font-bold text-slate-800 uppercase">{a.patientName}</p><p className="text-[10px] text-indigo-500 font-bold uppercase">{a.reason}</p></div><div className="flex flex-col items-end gap-2 uppercase"><p className="text-xs font-bold uppercase">{new Date(a.date).toLocaleDateString()}</p><button onClick={() => removeAppointment(a.id)} className="text-rose-500 font-bold"><Trash2 size={16}/></button></div></div>)
                      ) : (
                        (activeUser?.medicines || []).map((m:any) => <div key={m.id} className="p-6 bg-slate-50 border rounded-3xl mb-4 flex justify-between font-bold uppercase shadow-sm"><span>{m.name}</span><span className={!m.time ? "text-rose-500 animate-pulse font-bold" : "text-indigo-600"}>{m.time || "SET TIME"}</span></div>)
                      )}
                    </div>
                  </div>
                  {activeUser?.role === 'patient' ? <div className="space-y-8 font-bold uppercase"><PrescriptionOCRScanner onImportMedicines={(p:any) => { const withIds = p.map((m:any)=>({...m, id: Math.random(), time: ""})); syncToMaster({...activeUser, medicines: [...(activeUser.medicines || []), ...withIds]}); setActiveTab("meds"); }}/><HealthTipsWidget/></div> : 
                  <div className="bg-white p-10 rounded-[45px] border text-left font-bold uppercase font-bold"><h3 className="mb-6 uppercase font-bold flex items-center gap-3 font-bold"><Search className="text-indigo-600 font-bold"/> Clinic Search</h3><input placeholder="Search name..." className="w-full p-6 bg-slate-50 border rounded-3xl outline-none font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <div className="mt-4 space-y-2 uppercase">
                        {searchTerm && patientSearch.map((p: any) => (<button key={p.id} onClick={() => { setActiveTab("patients"); setSelectedPatient(p); }} className="w-full p-4 flex justify-between items-center bg-white border rounded-2xl hover:border-indigo-400 transition-all font-bold uppercase">{p.name} <ArrowRight size={16}/></button>))}
                    </div>
                  </div>}
                </div>
              </motion.div>
            )}

            {activeTab === "meds" && (
                <div key="meds" className="space-y-8 text-left uppercase font-bold">
                    <div className="bg-white p-10 rounded-[45px] border font-bold uppercase"><h3 className="font-bold text-xl uppercase tracking-widest mb-8 font-bold">Add Reminder</h3><FeedbackUI /><form onSubmit={addMedicine} className="grid grid-cols-3 gap-6 uppercase"><input required placeholder="Med Name" className="p-5 bg-slate-50 border rounded-3xl outline-none font-bold" value={medForm.name} onChange={e => setMedForm({...medForm, name: e.target.value})} /><input required placeholder="Dosage" className="p-5 bg-slate-50 border rounded-3xl outline-none font-bold" value={medForm.dosage} onChange={e => setMedForm({...medForm, dosage: e.target.value})} /><input required type="time" className="p-5 bg-slate-50 border rounded-3xl outline-none font-bold" value={medForm.time} onChange={e => setMedForm({...medForm, time: e.target.value})} /><button className="col-span-3 py-6 bg-indigo-600 text-white font-bold rounded-3xl shadow-xl uppercase">Create Alert</button></form></div>
                    <div className="grid grid-cols-1 gap-4 font-bold">{(activeUser?.medicines || []).map((m:any) => (<div key={m.id} className="p-8 bg-white border rounded-[35px] shadow-sm flex justify-between items-center uppercase font-bold"><div className="text-left font-bold uppercase"><p className="text-2xl font-bold">{m.name}</p><div className="flex items-center gap-3 mt-2 font-sans font-bold uppercase"><div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 font-bold uppercase"><Clock size={14} className={!m.time ? "text-rose-500 animate-pulse" : "text-indigo-600"}/><input type="time" className="bg-transparent text-[10px] outline-none font-bold uppercase" value={m.time || ""} onChange={(e) => updateMedicineTime(m.id, e.target.value)} /></div><span className="text-[10px] text-slate-400 opacity-50 uppercase tracking-widest font-bold">{m.dosage}</span></div></div><button onClick={() => syncToMaster({...activeUser, medicines: activeUser.medicines.filter((x:any) => x.id !== m.id)})} className="p-4 text-rose-500 bg-rose-50 rounded-2xl hover:bg-rose-600 hover:text-white transition-all font-bold uppercase"><Trash2/></button></div>))}</div>
                </div>
            )}

            {activeTab === "apps" && (
                <div key="apps" className="space-y-8 uppercase font-bold text-left uppercase font-bold">
                   <div className="bg-white p-12 rounded-[50px] border shadow-sm font-bold uppercase">
                       <h3 className="text-2xl mb-8 tracking-widest uppercase font-bold">Book Appointment</h3>
                       <FeedbackUI />
                       <form onSubmit={bookAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left font-bold uppercase">
                           <input required placeholder="Reason" className="p-6 bg-slate-50 border rounded-[30px] outline-none font-bold" value={apptForm.reason} onChange={e => setApptForm({...apptForm, reason: e.target.value})} />
                           <input required type="datetime-local" className="p-6 bg-slate-50 border rounded-[30px] outline-none font-bold uppercase" value={apptForm.date} onChange={e => setApptForm({...apptForm, date: e.target.value})} />
                           <button className="md:col-span-2 py-6 bg-indigo-600 text-white font-bold rounded-[30px] shadow-2xl text-xl uppercase uppercase">Confirm Request with Dr. {activeUser.doctorName}</button>
                       </form>
                   </div>
                   <div className="bg-white p-12 rounded-[50px] border shadow-sm uppercase font-bold text-left font-sans shadow-sm font-bold">
                       <h3 className="text-2xl mb-8 text-slate-400 uppercase font-bold uppercase font-bold">Pending Requests</h3>
                       {myApps.map((a: any) => <div key={a.id} className="p-6 bg-slate-50 border rounded-[30px] mb-4 flex justify-between items-center shadow-sm font-sans font-bold uppercase font-bold"><div><p className="text-lg font-bold uppercase uppercase">{a.reason}</p><p className="text-[10px] text-indigo-400 mt-1 uppercase font-sans font-bold">Provider: {a.doctorDisplay}</p></div><div className="flex flex-col items-end gap-2 font-bold uppercase"><p className="text-xs text-slate-400 font-bold uppercase">{new Date(a.date).toLocaleString()}</p><button onClick={() => removeAppointment(a.id)} className="text-rose-500 font-bold uppercase"><Trash2 size={16}/></button></div></div>)}
                   </div>
                </div>
            )}

            {activeTab === "history" && (
                <div key="history" className="bg-white p-12 rounded-[50px] border shadow-sm text-left uppercase font-bold font-bold uppercase"><h3 className="text-2xl mb-10 tracking-widest uppercase font-bold">Intake Logs</h3><FeedbackUI />{(activeUser?.medHistory || []).length === 0 ? <p className="text-center py-24 text-slate-300 italic tracking-widest text-lg opacity-40 uppercase font-bold">No records.</p> : activeUser.medHistory.map((m:any, i:number) => (<div key={i} className="p-8 bg-emerald-50 border border-emerald-100 rounded-[35px] flex justify-between items-center mb-5 uppercase shadow-sm font-bold"><div><p className="text-2xl font-bold font-bold uppercase">{m.name}</p><p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Scheduled: {m.time} | Recorded: {m.dateTaken}</p></div><CheckCircle2 className="text-emerald-500 font-bold uppercase" size={40} /></div>))}</div>
            )}

            {activeTab === "patients" && (
              <div key="patients" className="space-y-8 text-left uppercase font-bold font-sans uppercase font-bold font-bold"><div className="bg-white p-12 rounded-[50px] border shadow-sm text-left font-bold uppercase font-bold font-bold"><h3 className="text-2xl mb-8 tracking-widest uppercase font-bold font-sans font-bold uppercase">Directory Entry</h3><FeedbackUI /><form onSubmit={(e) => { e.preventDefault(); if(!isPhoneValid(patientReg.phone)) return notify("Mobile Error."); if(!isBloodValid(patientReg.blood)) return notify("Blood Error."); syncToMaster({...activeUser, patients: [...(activeUser?.patients || []), { ...patientReg, id: Date.now().toString() }] }); setPatientReg({ name: "", blood: "", phone: "", condition: "", famName: "", famPhone: "" }); notify("Saved.", "success"); }} className="grid grid-cols-1 md:grid-cols-2 gap-8 font-bold uppercase font-sans font-bold font-bold"><input required placeholder="Patient Full Name" className="p-6 bg-slate-50 border rounded-[30px] font-bold outline-none uppercase font-bold" value={patientReg.name} onChange={e => setPatientReg({...patientReg, name: e.target.value})} /><input required placeholder="BLOOD GROUP" className="p-6 bg-slate-50 border rounded-[30px] uppercase outline-none font-bold uppercase font-bold" value={patientReg.blood} onChange={e => setPatientReg({...patientReg, blood: e.target.value})} /><input required maxLength={10} placeholder="Mobile" className="p-6 bg-slate-50 border rounded-[30px] font-bold outline-none uppercase font-bold" value={patientReg.phone} onChange={e => setPatientReg({...patientReg, phone: e.target.value})} /><input required placeholder="Diagnosis" className="p-6 bg-slate-50 border rounded-[30px] font-bold outline-none uppercase font-bold font-bold" value={patientReg.condition} onChange={e => setPatientReg({...patientReg, condition: e.target.value})} /><input required placeholder="Backup Support Name" className="p-6 bg-slate-50 border rounded-[30px] font-bold outline-none uppercase font-bold font-bold" value={patientReg.famName} onChange={e => setPatientReg({...patientReg, famName: e.target.value})} /><input required maxLength={10} placeholder="Backup Phone" className="p-6 bg-slate-50 border rounded-[30px] font-bold outline-none uppercase font-bold font-bold" value={patientReg.famPhone} onChange={e => setPatientReg({...patientReg, famPhone: e.target.value})} /><button className="md:col-span-2 py-6 bg-indigo-600 text-white font-bold rounded-[30px] shadow-2xl text-xl uppercase tracking-widest font-sans font-bold font-bold">Confirm Record</button></form></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8 uppercase font-bold">{(activeUser?.patients || []).map((p:any) => (<div key={p.id} className="relative group text-left uppercase font-bold uppercase font-bold"><div onClick={() => setSelectedPatient(p)} className={`p-10 rounded-[45px] border transition-all cursor-pointer shadow-sm ${selectedPatient?.id === p.id ? 'bg-indigo-600 text-white shadow-2xl' : 'bg-white hover:border-indigo-400'}`}><p className="font-bold text-2xl mb-1 uppercase tracking-tighter text-left font-bold font-bold uppercase">{p.name}</p><p className={`text-[10px] uppercase tracking-widest ${selectedPatient?.id === p.id ? 'text-white/70' : 'text-slate-400'} font-bold font-bold uppercase`}>{p.condition}</p></div><button onClick={(e) => { e.stopPropagation(); syncToMaster({...activeUser, patients: activeUser.patients.filter((x:any) => x.id !== p.id)}); if(selectedPatient?.id === p.id) setSelectedPatient(null); }} className="absolute -top-3 -right-3 p-4 bg-white text-rose-500 rounded-full shadow-2xl border-4 border-rose-50 hover:bg-rose-500 hover:text-white transition-all font-bold uppercase font-bold uppercase"><Trash2 /></button></div>))}</div>{selectedPatient && (<motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-indigo-900 text-white p-12 rounded-[60px] shadow-2xl space-y-10 uppercase font-bold text-left font-bold uppercase font-bold uppercase"><div className="flex justify-between items-start font-sans font-bold"><div><h3 className="text-5xl tracking-tighter uppercase font-bold font-sans uppercase font-bold font-bold uppercase">{selectedPatient.name}</h3><p className="font-bold opacity-70 mt-3 text-xl flex items-center gap-3 uppercase font-bold font-sans font-bold font-bold uppercase font-bold uppercase"><Phone size={22} /> {selectedPatient.phone}</p></div><button onClick={() => setSelectedPatient(null)} className="px-8 py-3 bg-white/10 rounded-full text-xs border border-white/20 uppercase tracking-widest font-bold uppercase font-bold font-bold uppercase">Close File</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left uppercase font-bold"><div className="bg-white/10 p-10 rounded-[50px] border border-white/10 text-left uppercase font-bold font-bold font-bold uppercase"><p className="text-[10px] opacity-60 mb-3 tracking-widest font-sans font-bold uppercase font-bold uppercase font-bold uppercase">Summary</p><p className="text-2xl font-medium leading-relaxed italic font-sans font-bold uppercase font-bold uppercase font-bold uppercase">"{selectedPatient.condition}"</p><div className="mt-8 flex items-center gap-4 text-sm bg-indigo-800/50 w-fit px-6 py-3 rounded-3xl font-sans font-bold font-bold uppercase"><Droplet size={18} className="text-rose-400 font-bold"/> Blood Group {selectedPatient.blood}</div></div><div className="bg-white/10 p-10 rounded-[50px] border border-white/10 text-left font-bold uppercase font-bold uppercase font-bold uppercase"><p className="text-[10px] opacity-60 mb-6 tracking-widest font-sans uppercase font-bold uppercase">Emergency Support</p><div className="flex items-center gap-6 font-bold uppercase"><div className="w-16 h-16 rounded-[25px] bg-indigo-600 flex items-center justify-center shadow-lg font-bold font-bold font-bold uppercase"><ShieldAlert size={35} className="font-bold uppercase"/></div><div><p className="text-2xl font-bold font-bold uppercase font-bold">{selectedPatient.famName}</p><p className="text-xl opacity-70 mt-1 uppercase font-sans font-bold font-bold font-bold">{selectedPatient.famPhone}</p></div></div></div></div></motion.div>)}</div>
            )}

            {activeTab === "profile" && (
               <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-12 rounded-[50px] border shadow-sm text-left uppercase space-y-12 font-bold uppercase font-bold"><h2 className="text-4xl border-b pb-8 tracking-tighter uppercase font-bold font-bold">My Profile</h2><FeedbackUI /><div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-bold uppercase font-sans font-bold font-bold"><div><label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold uppercase font-bold">USERNAME</label><p className="text-2xl mt-1 underline decoration-indigo-200 decoration-4 font-bold font-bold font-bold uppercase">{activeUser?.name}</p></div><div><label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold uppercase font-bold font-bold">ROLE</label><p className="text-2xl text-indigo-600 mt-1 font-bold uppercase font-bold font-bold font-bold uppercase">{activeUser?.role}</p></div>{activeUser?.role === 'patient' ? (<><div><label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold uppercase font-bold font-bold font-bold uppercase">CLINICAL DATA</label><p className="text-xl mt-1 font-bold uppercase font-bold font-bold font-bold uppercase">{activeUser.age} Years • {activeUser.blood}</p></div><div><label className="text-[10px] text-rose-400 uppercase tracking-widest font-bold uppercase font-bold font-bold font-bold uppercase">SOS CONTACT</label><p className="text-xl text-rose-600 mt-1 font-black flex items-center gap-2 uppercase font-sans font-bold uppercase font-bold font-bold font-bold uppercase font-bold"><Phone size={18} className="font-bold font-bold font-bold uppercase font-bold font-bold font-bold uppercase font-bold"/> {activeUser.emergencyName} ({activeUser.emergencyPhone})</p></div><div className="md:col-span-2 border-t pt-10 font-bold uppercase font-bold font-bold font-bold font-bold"><label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold uppercase font-bold font-bold font-bold font-bold">PRIMARY PRACTITIONER</label><p className="text-xl mt-2 font-bold flex items-center gap-3 font-sans uppercase font-bold font-bold font-bold font-bold font-bold font-bold font-bold"> Dr. {activeUser.doctorName} • {activeUser.doctorPhone}</p></div></>) : (
                   <div className="md:col-span-2 space-y-6 font-bold uppercase font-bold font-bold font-bold font-bold">
                       <div><label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold uppercase font-bold font-bold font-bold font-bold">FACILITY LOCATION</label><p className="text-xl flex items-center gap-4 uppercase font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold"><MapPin size={32} className="text-indigo-600 shrink-0 font-bold font-bold font-bold uppercase font-bold font-bold font-bold uppercase"/> {activeUser?.clinicAddress || 'Clinic Hub'}</p></div>
                       <div><label className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold uppercase font-bold font-bold font-bold font-bold">CLINIC CONTACT</label><p className="text-xl flex items-center gap-4 uppercase font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold"><Phone size={32} className="text-indigo-600 shrink-0 font-bold font-bold font-bold uppercase font-bold font-bold font-bold uppercase"/> {activeUser?.clinicPhone || 'No phone set'}</p></div>
                   </div>
               )}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20 font-bold uppercase font-bold font-bold font-bold font-bold"><button onClick={handleLogout} className="w-full py-8 bg-slate-50 border-2 border-slate-200 text-slate-600 rounded-[35px] hover:bg-slate-200 transition-all uppercase tracking-widest font-bold uppercase font-bold">Logout</button><button onClick={() => setShowDeleteModal(true)} className="w-full py-8 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-[35px] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3 uppercase tracking-widest font-bold font-bold">Permanent Account Delete</button></div></motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}