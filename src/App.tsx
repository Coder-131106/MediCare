import { useState, useEffect, useRef } from "react";
import { 
  Clock, Heart, User, Activity, Trash2, PlusCircle,
  Stethoscope, ArrowRight, ArrowLeft, Users, ClipboardList,
  Search, CalendarDays, Phone, ShieldAlert,
  Calendar, MapPin, Droplet, RefreshCw, CheckCircle2,
  Zap, LogIn, UserPlus, BellRing
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import EmergencySOSPanel from "./components/EmergencySOSPanel";
import PrescriptionOCRScanner from "./components/PrescriptionOCRScanner";
import HealthTipsWidget from "./components/HealthTipsWidget";

export default function App() {
  // --- AUTH & PERSISTENCE ---
  const [authStep, setAppStep] = useState<"landing" | "login" | "signup" | "setup-patient" | "setup-doctor" | "dashboard">(() => {
    return localStorage.getItem("medicare_active_session") ? "dashboard" : "landing";
  });

  const [allAccounts, setAllAccounts] = useState<any[]>(() => 
    JSON.parse(localStorage.getItem("medicare_accounts") || "[]")
  );

  const [activeUser, setActiveUser] = useState<any>(() => {
    const saved = localStorage.getItem("medicare_active_session");
    return saved ? JSON.parse(saved) : null;
  });

  const [appointments, setAppointments] = useState<any[]>(() => 
    JSON.parse(localStorage.getItem("medicare_global_appointments") || "[]")
  );

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeReminder, setActiveReminder] = useState<any>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [snoozedMeds, setSnoozedMeds] = useState<any[]>([]);
  const lastTriggeredMinute = useRef<string>("");
  const reminderTimeoutRef = useRef<any>(null);

  // --- FORM STATES ---
  const [authForm, setAuthForm] = useState({ name: "", pass: "" });
  const [setupData, setSetupData] = useState({ age: "", blood: "", emergencyName: "", emergencyPhone: "", doctorName: "", doctorPhone: "", clinicAddress: "" });
  const [medForm, setMedForm] = useState({ name: "", dosage: "", time: "" });
  const [apptForm, setApptForm] = useState({ reason: "", date: "" });
  const [patientReg, setPatientReg] = useState({ name: "", blood: "", phone: "", condition: "", famName: "", famPhone: "" });

  // --- PERSISTENCE SYNC ---
  useEffect(() => {
    localStorage.setItem("medicare_accounts", JSON.stringify(allAccounts));
    localStorage.setItem("medicare_global_appointments", JSON.stringify(appointments));
    if (activeUser) {
        localStorage.setItem("medicare_active_session", JSON.stringify(activeUser));
        const updated = allAccounts.map(acc => acc.id === activeUser.id ? activeUser : acc);
        if(JSON.stringify(updated) !== JSON.stringify(allAccounts)) setAllAccounts(updated);
    }
  }, [activeUser, appointments]);

  // --- HELPERS ---
  const isPhoneValid = (p: string) => /^[0-9]{10}$/.test(p?.trim() || "");
  const isOnlyLetters = (s: string) => /^[a-zA-Z\s]+$/.test(s?.trim() || "");
  const isBloodValid = (bg: string) => /^(A|B|AB|O)[+-]$/i.test(bg?.trim() || "");
  const normalize = (name: string) => name?.toLowerCase().replace(/dr\.?\s+/i, "").replace(/[^a-z]/g, "").trim();

  // --- ACTION FUNCTIONS ---
  const handleLogin = () => {
    const user = allAccounts.find(u => normalize(u.name) === normalize(authForm.name) && u.password === authForm.pass);
    if (!user) return alert("Invalid Name or Password.");
    setActiveUser(user);
    setAppStep("dashboard");
  };

  const handleSignup = (role: "patient" | "doctor") => {
    if (!isOnlyLetters(authForm.name)) return alert("Letters only for username.");
    const newUser = { id: Date.now().toString(), name: authForm.name, password: authForm.pass, role, medicines: [], medHistory: [], patients: [], profileComplete: false };
    setAllAccounts([...allAccounts, newUser]);
    setActiveUser(newUser);
    setAppStep(role === "patient" ? "setup-patient" : "setup-doctor");
  };

  const handleLogout = () => {
    localStorage.removeItem("medicare_active_session");
    setActiveUser(null);
    setAppStep("landing");
  };

  const addMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    const newMeds = [...(activeUser.medicines || []), { id: (Date.now() + Math.random()).toString(), ...medForm }];
    setActiveUser({ ...activeUser, medicines: newMeds });
    setMedForm({ name: "", dosage: "", time: "" });
  };

  const updateMedicineTime = (id: string, newTime: string) => {
    const updatedMeds = activeUser.medicines.map((m: any) => m.id === id ? { ...m, time: newTime } : m);
    setActiveUser({ ...activeUser, medicines: updatedMeds });
  };

  const addPatientByDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnlyLetters(patientReg.name) || !isOnlyLetters(patientReg.famName)) return alert("Letters only for names.");
    const newPatients = [...(activeUser.patients || []), { id: Date.now().toString(), ...patientReg }];
    setActiveUser({ ...activeUser, patients: newPatients });
    setPatientReg({ name: "", blood: "", phone: "", condition: "", famName: "", famPhone: "" });
    alert("Record Saved.");
  };

  const bookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newAppt = { id: Date.now().toString(), ...apptForm, doctorKey: normalize(activeUser.doctorName), doctorDisplay: activeUser.doctorName, patientName: activeUser.name };
    setAppointments([...appointments, newAppt]);
    setApptForm({ reason: "", date: "" });
    alert("Request Sent.");
  };

  const handleMedResponse = (action: "taken" | "skip" | "snooze") => {
    clearTimeout(reminderTimeoutRef.current);
    if (action === "taken") {
      const history = [{ name: activeReminder.name, dateTaken: new Date().toLocaleString() }, ...(activeUser.medHistory || [])];
      setActiveUser({ ...activeUser, medHistory: history });
    } 
    else if (action === "skip") {
      setEmergencyAlert(`SMS sent to ${activeUser.emergencyName}: Patient skipped dose of ${activeReminder.name}.`);
      setTimeout(() => setEmergencyAlert(null), 10000);
    } 
    else if (action === "snooze") {
      const future = new Date();
      future.setMinutes(future.getMinutes() + 5);
      const timeStr = `${future.getHours().toString().padStart(2, '0')}:${future.getMinutes().toString().padStart(2, '0')}`;
      setSnoozedMeds([...snoozedMeds, { id: activeReminder.id, triggerTime: timeStr }]);
    }
    setActiveReminder(null);
  };

  // --- AUTOMATIC REMINDER ENGINE ---
  useEffect(() => {
    const loop = setInterval(() => {
      if (activeUser?.role !== 'patient' || activeReminder) return;
      const now = new Date();
      const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (lastTriggeredMinute.current === current) return;

      const due = activeUser.medicines?.find((m: any) => m.time === current);
      const snoozed = snoozedMeds.find(s => s.triggerTime === current);

      if (due || snoozed) {
        const med = due || activeUser.medicines.find((m:any) => m.id === snoozed.id);
        if(med) {
            setActiveReminder(med);
            lastTriggeredMinute.current = current;
            if (snoozed) setSnoozedMeds(prev => prev.filter(s => s.triggerTime !== current));
            reminderTimeoutRef.current = setTimeout(() => {
                setEmergencyAlert(`Missed Dose Alert: Family contact notified.`);
            }, 15 * 60 * 1000);
        }
      }
    }, 1000);
    return () => clearInterval(loop);
  }, [activeUser, activeReminder, snoozedMeds]);

  const myAppointments = appointments.filter(a => a.patientName === activeUser?.name);
  const doctorAppointments = appointments.filter(a => a.doctorKey === normalize(activeUser?.name));
  const searchResults = searchTerm.trim() === "" ? [] : (activeUser?.patients || []).filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- UI SCREENS ---
  if (authStep === "landing") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] p-12 max-w-lg w-full shadow-2xl">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-xl"><Heart className="text-white animate-pulse" /></div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 uppercase">MediCare</h1>
          <div className="grid grid-cols-2 gap-4 mt-10">
            <button onClick={() => setAppStep("login")} className="py-6 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg tracking-widest"><LogIn size={20}/> LOGIN</button>
            <button onClick={() => setAppStep("signup")} className="py-6 border-2 border-indigo-600 text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 tracking-widest"><UserPlus size={20}/> SIGNUP</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (authStep === "login" || authStep === "signup") {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
            <button onClick={() => setAppStep("landing")} className="mb-6 text-white/50 hover:text-white flex items-center gap-2 transition-all font-black uppercase"><ArrowLeft size={18}/> Back</button>
            <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl space-y-8 uppercase font-black">
                <h2 className="text-3xl font-black text-center text-slate-800 tracking-tighter">{authStep}</h2>
                <div className="space-y-4">
                    <input placeholder="Username" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                    <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" value={authForm.pass} onChange={e => setAuthForm({...authForm, pass: e.target.value})} />
                    {authStep === "login" ? <button onClick={handleLogin} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black">START PORTAL</button> :
                        <div className="grid grid-cols-1 gap-3 pt-2">
                             <button onClick={() => handleSignup("patient")} className="w-full py-4 bg-indigo-50 text-indigo-700 border-2 border-indigo-200 rounded-2xl font-bold flex items-center justify-between px-8">As Patient <User size={20}/></button>
                             <button onClick={() => handleSignup("doctor")} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-between px-8">As Doctor <Stethoscope size={20}/></button>
                        </div>
                    }
                </div>
            </div>
        </div>
    );
  }

  if (authStep === "setup-patient" || authStep === "setup-doctor") {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans uppercase font-black text-left">
            <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-xl space-y-6">
                <h2 className="text-2xl font-black text-center uppercase tracking-tight">Complete Setup</h2>
                {authStep === "setup-patient" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Age" type="number" className="p-4 bg-slate-50 rounded-2xl border" onChange={e => setSetupData({...setupData, age: e.target.value})} />
                        <input placeholder="Blood (O+)" className="p-4 bg-slate-50 rounded-2xl border uppercase" onChange={e => setSetupData({...setupData, blood: e.target.value})} />
                    </div>
                    <input placeholder="Family Member Name" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setSetupData({...setupData, emergencyName: e.target.value})} />
                    <input placeholder="Emergency Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setSetupData({...setupData, emergencyPhone: e.target.value})} />
                    <div className="border-t pt-4 font-sans text-left"><p className="text-[10px] text-slate-400 mb-2">Physician</p><input placeholder="Doctor's Name" className="w-full p-4 bg-slate-50 border rounded-2xl mb-3 outline-none" onChange={e => setSetupData({...setupData, doctorName: e.target.value})} /></div>
                  </>
                ) : (
                  <>
                    <input placeholder="Practice Number" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" onChange={e => setSetupData({...setupData, doctorPhone: e.target.value})} />
                    <textarea placeholder="Facility Address" className="w-full p-4 bg-slate-50 border rounded-2xl min-h-[120px] outline-none" onChange={e => setSetupData({...setupData, clinicAddress: e.target.value})} />
                  </>
                )}
                <button onClick={() => { 
                    if(authStep === "setup-patient" && (!isBloodValid(setupData.blood) || !isPhoneValid(setupData.emergencyPhone))) return alert("Check formats.");
                    setActiveUser({...activeUser, ...setupData, profileComplete: true}); setAppStep("dashboard"); 
                }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">FINALIZE</button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans uppercase font-black">
      <AnimatePresence>
        {activeReminder && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-6 text-center font-sans">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white rounded-[50px] p-12 max-w-sm w-full shadow-2xl space-y-8 border-t-[12px] border-indigo-600 font-sans">
              <div className="w-20 h-20 bg-indigo-100 rounded-full mx-auto flex items-center justify-center text-indigo-600"><Clock size={40} className="animate-bounce" /></div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">Medicine Due!</h2>
              <p className="text-slate-500 font-bold italic uppercase">{activeReminder.name} ({activeReminder.dosage})</p>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleMedResponse("taken")} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest"><CheckCircle2 /> MARK AS TAKEN</button>
                <div className="flex gap-4">
                    <button onClick={() => handleMedResponse("snooze")} className="flex-1 py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-xs uppercase">Remind 5m</button>
                    <button onClick={() => handleMedResponse("skip")} className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase">Skip</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {emergencyAlert && (
            <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-10 left-1/2 -translate-x-1/2 z-[600] w-full max-w-lg">
                <div className="bg-rose-600 text-white p-6 rounded-3xl shadow-2xl flex items-center gap-5 border-4 border-white animate-pulse">
                    <ShieldAlert size={40} className="shrink-0" />
                    <p className="text-sm leading-tight uppercase font-sans font-black">{emergencyAlert}</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b sticky top-0 z-40 p-4 flex items-center justify-between px-10 shadow-sm">
        <div className="flex items-center gap-3 font-sans font-black tracking-tighter"><div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md"><Heart size={20} className="text-white" /></div><div><h1 className="text-lg uppercase">MediCare Portal</h1><p className="text-[10px] text-indigo-600 uppercase tracking-widest leading-none font-sans font-black">{activeUser.role}</p></div></div>
        <div className="flex gap-4">
            <button onClick={() => { setAppointments(JSON.parse(localStorage.getItem("medicare_global_appointments") || "[]")); alert("Refreshed."); }} className="px-5 py-2.5 bg-slate-100 rounded-xl text-[10px] flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><RefreshCw size={14}/> Sync Data</button>
            <button onClick={() => setActiveTab("profile")} className="bg-slate-50 p-2 rounded-xl border flex items-center gap-3 hover:bg-white transition-all"><div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center rounded-lg font-black uppercase font-sans">{activeUser.name?.[0]}</div><div className="hidden sm:block text-left uppercase tracking-tighter font-sans"><p className="text-[10px] font-black text-slate-400 leading-none">Account</p><p className="text-sm font-black text-slate-700 uppercase tracking-tighter">{activeUser.name}</p></div></button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left font-black">
        <div className="lg:col-span-3 flex flex-col gap-6 font-sans">
          <div className="bg-white rounded-3xl p-5 shadow-sm border space-y-1">
            <button onClick={() => setActiveTab("home")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 transition-all uppercase'}`}><Activity size={20}/> Dashboard</button>
            {activeUser.role === 'patient' ? (
              <>
                <button onClick={() => setActiveTab("meds")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${activeTab === 'meds' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 uppercase'}`}><Clock size={20}/> Med Reminders</button>
                <button onClick={() => setActiveTab("apps")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${activeTab === 'apps' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 uppercase'}`}><CalendarDays size={20}/> Appointments</button>
                <button onClick={() => setActiveTab("history")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 uppercase'}`}><ClipboardList size={20}/> Intake History</button>
              </>
            ) : (
              <button onClick={() => setActiveTab("patients")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${activeTab === 'patients' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 uppercase'}`}><Users size={20}/> Directory</button>
            )}
            <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 uppercase'}`}><User size={20}/> My Profile</button>
          </div>
          {activeUser.role === 'patient' && <EmergencySOSPanel familyName={activeUser.emergencyName} familyPhone={activeUser.emergencyPhone} />}
        </div>

        <div className="lg:col-span-9 font-sans font-black">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-indigo-900 text-white p-12 rounded-[50px] shadow-lg relative overflow-hidden text-left font-black">
                    <h2 className="text-4xl font-black mb-3 tracking-tighter uppercase">Hello, {activeUser.name}!</h2>
                    <p className="opacity-80 font-medium text-lg uppercase tracking-tight">{activeUser.role === 'doctor' ? activeUser.clinicAddress : 'Vitals and medicine tracking is active.'}</p>
                  <Zap className="absolute right-[-20px] top-[-20px] w-64 h-64 opacity-5 text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left uppercase">
                  <div className="bg-white p-10 rounded-[45px] border shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3 text-lg uppercase tracking-widest">{activeUser.role === 'doctor' ? "Appointments" : "Today"}</h3>
                    <div className="flex-1">
                      {activeUser.role === 'doctor' ? (
                        doctorAppointments.length === 0 ? <p className="text-center py-20 text-slate-300 italic uppercase">No bookings.</p> :
                        doctorAppointments.map(a => <div key={a.id} className="p-6 bg-indigo-50 border rounded-3xl mb-4 flex justify-between uppercase font-black shadow-sm"><div><p className="font-black text-slate-800">{a.patientName}</p><p className="text-[10px] font-bold text-indigo-500">{a.reason}</p></div><p className="text-xs font-black">{new Date(a.date).toLocaleDateString()}</p></div>)
                      ) : (
                        (activeUser.medicines || []).slice(0,4).map((m:any) => <div key={m.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl mb-4 flex justify-between font-black text-sm uppercase shadow-sm"><p>{m.name}</p><span className="text-indigo-600">{m.time || '--:--'}</span></div>)
                      )}
                    </div>
                  </div>
                  {activeUser.role === 'patient' ? <div className="space-y-8 uppercase"><PrescriptionOCRScanner onImportMedicines={(p:any) => {
                    const data = Array.isArray(p) ? p : (p.medicines || []);
                    const withIds = data.map((m:any) => ({ ...m, id: (Date.now() + Math.random()).toString(), time: "" }));
                    setActiveUser({...activeUser, medicines: [...(activeUser.medicines || []), ...withIds]});
                  }} /><HealthTipsWidget /></div> : 
                  <div className="bg-white p-10 rounded-[45px] border shadow-sm h-full flex flex-col text-left font-sans">
                    <h3 className="mb-8 flex items-center gap-3 tracking-widest uppercase font-black font-sans"><Search className="text-indigo-600" /> Clinic Search</h3>
                    <input type="text" placeholder="Search name..." className="w-full p-6 bg-slate-50 border rounded-3xl outline-none font-black text-lg shadow-inner font-sans" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <div className="mt-6 flex-1 overflow-y-auto space-y-3">
                        {searchTerm && searchResults.map((p: any) => (
                            <button key={p.id} onClick={() => { setActiveTab("patients"); setSelectedPatient(p); }} className="w-full p-5 flex justify-between bg-white border rounded-[25px] shadow-sm hover:border-indigo-400 transition-all uppercase font-black text-sm text-left">{p.name}<ArrowRight size={18} /></button>
                        ))}
                    </div>
                  </div>}
                </div>
              </motion.div>
            )}

            {activeTab === "meds" && (
                <div className="space-y-8 text-left uppercase font-black">
                    <div className="bg-white p-10 rounded-[45px] border shadow-sm font-sans font-black">
                        <div className="flex justify-between items-center mb-8 font-sans"><h3 className="font-black text-xl uppercase tracking-widest font-sans">New Reminder</h3>
                        {(activeUser.medicines || []).length > 0 && <button onClick={() => setActiveReminder(activeUser.medicines[0])} className="px-6 py-2 bg-indigo-50 text-indigo-700 rounded-full font-black text-[10px] uppercase flex items-center gap-2">TRIGGER TEST <BellRing size={14} /></button>}
                        </div>
                        <form onSubmit={addMedicine} className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black uppercase">
                            <input required placeholder="Med Name" className="p-5 bg-slate-50 border rounded-3xl outline-none font-black font-sans" value={medForm.name} onChange={e => setMedForm({...medForm, name: e.target.value})} />
                            <input required placeholder="Dosage" className="p-5 bg-slate-50 border rounded-3xl outline-none font-black font-sans" value={medForm.dosage} onChange={e => setMedForm({...medForm, dosage: e.target.value})} />
                            <input required type="time" className="p-5 bg-slate-50 border rounded-3xl outline-none font-black font-sans" value={medForm.time} onChange={e => setMedForm({...medForm, time: e.target.value})} />
                            <button className="md:col-span-3 py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl uppercase font-sans">Create Reminder</button>
                        </form>
                    </div>
                    <div className="grid grid-cols-1 gap-4 uppercase font-black">
                        {(activeUser.medicines || []).map((m:any) => (
                            <div key={m.id} className="flex justify-between items-center p-8 bg-white border rounded-[35px] shadow-sm">
                                <div className="flex-1 text-left font-black">
                                    <p className="text-2xl tracking-tighter uppercase">{m.name}</p>
                                    <div className="flex items-center gap-3 mt-3 font-sans">
                                        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                                            <Clock size={14} className={!m.time ? "text-rose-500 animate-pulse" : "text-indigo-600"} />
                                            <input type="time" className="bg-transparent text-[10px] outline-none font-black uppercase font-sans" value={m.time || ""} onChange={(e) => updateMedicineTime(m.id, e.target.value)} />
                                        </div>
                                        {!m.time && <p className="text-[10px] text-rose-500 animate-pulse uppercase tracking-widest font-sans">Set Time</p>}
                                        <span className="text-[10px] text-slate-400 opacity-50 ml-4 tracking-[0.2em] font-sans uppercase">{m.dosage}</span>
                                    </div>
                                </div>
                                <button onClick={() => setActiveUser({...activeUser, medicines: activeUser.medicines.filter((x:any) => x.id !== m.id)})} className="p-4 text-rose-400 bg-rose-50 rounded-3xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="bg-white p-12 rounded-[50px] border shadow-sm text-left uppercase font-black">
                    <h3 className="text-2xl mb-10 tracking-widest uppercase font-black">Intake Logs</h3>
                    {(activeUser.medHistory || []).length === 0 ? <p className="text-center py-24 text-slate-300 italic tracking-widest text-lg opacity-40 text-center font-black">No confirmed records.</p> :
                    activeUser.medHistory.map((m:any, i:number) => (
                      <div key={i} className="p-8 bg-emerald-50 border border-emerald-100 rounded-[35px] flex justify-between items-center mb-5 uppercase shadow-sm">
                         <div><p className="text-2xl tracking-tighter font-black uppercase">{m.name}</p><p className="text-[10px] text-slate-400 mt-1 uppercase font-sans tracking-widest">Recorded at: {m.dateTaken}</p></div>
                         <CheckCircle2 className="text-emerald-500" size={40} />
                      </div>
                    ))}
                </div>
            )}

            {activeTab === "apps" && (
                <div className="space-y-8 uppercase font-black text-left">
                    <div className="bg-white p-12 rounded-[50px] border shadow-sm">
                        <h3 className="text-2xl mb-8 tracking-widest uppercase font-black">Schedule Visit</h3>
                        <form onSubmit={bookAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left font-black uppercase font-sans">
                            <input required placeholder="Reason" className="p-6 bg-slate-50 border rounded-[30px] w-full outline-none font-black font-sans" value={apptForm.reason} onChange={e => setApptForm({...apptForm, reason: e.target.value})} />
                            <input required type="datetime-local" className="p-6 bg-slate-50 border rounded-[30px] w-full outline-none font-bold font-sans" value={apptForm.date} onChange={e => setApptForm({...apptForm, date: e.target.value})} />
                            <button className="md:col-span-2 py-6 bg-indigo-600 text-white font-black rounded-[30px] shadow-2xl text-xl font-sans uppercase">Book Request</button>
                        </form>
                    </div>
                    <div className="bg-white p-12 rounded-[50px] border shadow-sm uppercase font-black text-left font-sans">
                        <h3 className="text-2xl mb-8 uppercase font-black">My Requests</h3>
                        {myAppointments.map((a: any) => <div key={a.id} className="p-6 bg-slate-50 border rounded-[30px] mb-4 flex justify-between items-center shadow-sm uppercase font-black font-sans"><div><p className="text-lg font-black uppercase">{a.reason}</p><p className="text-[10px] text-indigo-400 mt-1 uppercase font-sans tracking-widest">Physician: {a.doctorDisplay}</p></div><p className="text-xs text-slate-400 font-sans">{new Date(a.date).toLocaleString()}</p></div>)}
                    </div>
                </div>
            )}

            {activeTab === "profile" && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-12 rounded-[50px] border shadow-sm text-left uppercase font-black font-sans">
                  <h2 className="text-4xl font-black mb-12 text-slate-900 border-b pb-10 tracking-tighter uppercase font-black font-sans">Account</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-black uppercase font-sans">
                     <div className="space-y-3"><label className="text-[10px] text-slate-400 tracking-widest uppercase font-sans">Name</label><p className="text-3xl underline decoration-indigo-200 decoration-4 uppercase font-black font-sans">{activeUser.name}</p></div>
                     <div className="space-y-3"><label className="text-[10px] text-slate-400 tracking-widest uppercase font-sans">Role</label><p className="text-3xl text-indigo-600 uppercase font-black font-sans">{activeUser.role}</p></div>
                     {activeUser.role === 'patient' ? (
                       <>
                         <div className="space-y-3"><label className="text-[10px] text-slate-400 tracking-widest uppercase font-sans">Clinical</label><p className="text-2xl text-slate-700 font-black uppercase font-sans">{activeUser.age} Years • Blood {activeUser.blood}</p></div>
                         <div className="space-y-3"><label className="text-[10px] text-rose-400 tracking-widest uppercase font-black font-sans">Backup Support</label><p className="text-2xl text-rose-600 flex items-center gap-3 tracking-tighter font-black uppercase font-sans"><Phone size={22} /> {activeUser.emergencyName}</p><p className="text-lg text-slate-400 ml-9 font-black font-sans">{activeUser.emergencyPhone}</p></div>
                       </>
                     ) : (
                        <div className="md:col-span-2 space-y-3 font-sans font-black"><label className="text-[10px] text-slate-400 tracking-widest uppercase tracking-widest font-sans">HQ Address</label><p className="text-2xl text-slate-700 flex items-center gap-4 leading-snug font-black font-sans uppercase"><MapPin size={32} className="text-indigo-600 shrink-0 font-sans"/> {activeUser.clinicAddress || 'Clinic Hub'}</p></div>
                     )}
                  </div>
                  <button onClick={handleLogout} className="mt-20 w-full py-8 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-[35px] uppercase shadow-sm hover:bg-rose-600 hover:text-white transition-all tracking-[0.3em] font-black font-sans">LOGOUT SECURELY</button>
               </motion.div>
            )}

            {activeTab === "patients" && (
              <div className="space-y-8 text-left uppercase font-black font-sans">
                <div className="bg-white p-12 rounded-[50px] border shadow-sm text-left font-sans font-black uppercase">
                  <h3 className="text-2xl mb-8 tracking-widest uppercase font-black font-sans">Register Entry</h3>
                  <form onSubmit={addPatientByDoctor} className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans font-black">
                      <input required placeholder="Patient Full Name" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none font-sans" value={patientReg.name} onChange={e => setPatientReg({...patientReg, name: e.target.value})} />
                      <input required placeholder="Blood Group" className="p-6 bg-slate-50 border rounded-[30px] uppercase outline-none font-black font-sans" value={patientReg.blood} onChange={e => setPatientReg({...patientReg, blood: e.target.value})} />
                      <input required maxLength={10} placeholder="Mobile" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none font-sans" value={patientReg.phone} onChange={e => setPatientReg({...patientReg, phone: e.target.value})} />
                      <input required placeholder="Diagnosis" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none font-sans" value={patientReg.condition} onChange={e => setPatientReg({...patientReg, condition: e.target.value})} />
                      <input required placeholder="Backup Support Name" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none font-sans" value={patientReg.famName} onChange={e => setPatientReg({...patientReg, famName: e.target.value})} />
                      <input required maxLength={10} placeholder="Backup Phone" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none font-sans" value={patientReg.famPhone} onChange={e => setPatientReg({...patientReg, famPhone: e.target.value})} />
                      <button className="md:col-span-2 py-6 bg-indigo-600 text-white font-black rounded-[30px] shadow-2xl text-xl font-sans uppercase">Confirm Record</button>
                  </form>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-sans font-black">
                    {(activeUser.patients || []).map((p:any) => (
                       <div key={p.id} className="relative group text-left uppercase font-black font-sans">
                          <div onClick={() => setSelectedPatient(p)} className={`p-10 rounded-[45px] border transition-all cursor-pointer shadow-sm font-sans font-black uppercase ${selectedPatient?.id === p.id ? 'bg-indigo-600 text-white shadow-2xl' : 'bg-white hover:border-indigo-400'}`}>
                             <p className="font-black text-2xl mb-1 uppercase tracking-tighter text-left font-sans">{p.name}</p>
                             <p className={`text-[10px] uppercase tracking-widest font-sans font-black ${selectedPatient?.id === p.id ? 'text-white/70' : 'text-slate-400'}`}>{p.condition}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setActiveUser({...activeUser, patients: activeUser.patients.filter((x:any) => x.id !== p.id)}); if(selectedPatient?.id === p.id) setSelectedPatient(null); }} className="absolute -top-3 -right-3 p-4 bg-white text-rose-500 rounded-full shadow-2xl border-4 border-rose-50 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 transition-all uppercase"><Trash2 /></button>
                       </div>
                    ))}
                 </div>
                 {selectedPatient && (
                   <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-indigo-900 text-white p-12 rounded-[60px] shadow-2xl space-y-10 uppercase font-black text-left font-sans">
                      <div className="flex justify-between items-start font-sans font-black">
                        <div><h3 className="text-5xl tracking-tighter font-black uppercase tracking-tighter font-sans">{selectedPatient.name}</h3><p className="font-bold opacity-70 mt-3 text-xl flex items-center gap-3 uppercase font-black tracking-tighter font-sans"><Phone size={22} /> {selectedPatient.phone}</p></div>
                        <button onClick={() => setSelectedPatient(null)} className="px-8 py-3 bg-white/10 rounded-full text-xs border border-white/20 uppercase tracking-widest font-black font-sans">Close Record</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left uppercase font-black">
                         <div className="bg-white/10 p-10 rounded-[50px] border border-white/10 text-left font-black uppercase"><p className="text-[10px] opacity-60 mb-3 tracking-widest font-sans uppercase font-black">Data History</p><p className="text-2xl font-medium leading-relaxed italic uppercase font-black">"{selectedPatient.condition}"</p><div className="mt-8 flex items-center gap-4 text-sm bg-indigo-800/50 w-fit px-6 py-3 rounded-3xl"><Droplet size={18} className="text-rose-400"/> Blood Type {selectedPatient.blood}</div></div>
                         <div className="bg-white/10 p-10 rounded-[50px] border border-white/10 text-left font-black uppercase"><p className="text-[10px] opacity-60 mb-6 tracking-widest font-sans uppercase">Backup support</p><div className="flex items-center gap-6"><div className="w-16 h-16 rounded-[25px] bg-indigo-600 flex items-center justify-center shadow-lg"><ShieldAlert size={35}/></div><div><p className="text-2xl tracking-tighter uppercase font-black">{selectedPatient.famName}</p><p className="text-xl opacity-70 mt-1 uppercase font-black font-sans">{selectedPatient.famPhone}</p></div></div></div>
                      </div>
                   </motion.div>
                 )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}