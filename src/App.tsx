import { useState, useEffect, useRef } from "react";
import { 
  Clock, Heart, User, Activity, Trash2,
  Stethoscope, ArrowRight, ArrowLeft, Users, ClipboardList,
  Search, CalendarDays, Phone, ShieldAlert,
   MapPin, Droplet, CheckCircle2,
  Zap, BellRing, UserMinus, Calendar
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

  // --- UI & REMINDER STATES ---
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

  // --- PERSISTENCE EFFECT ---
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

  // --- ACTIONS ---
  const handleLogin = () => {
    const user = allAccounts.find(u => normalize(u.name) === normalize(authForm.name) && u.password === authForm.pass);
    if (!user) return alert("Invalid Name or Password.");
    setActiveUser(user);
    setAppStep("dashboard");
  };

  const handleSignupInit = (role: "patient" | "doctor") => {
    if (!isOnlyLetters(authForm.name)) return alert("Username must be letters only.");
    if (allAccounts.find(u => normalize(u.name) === normalize(authForm.name))) return alert("Username taken.");
    const newUser = { id: Date.now().toString(), name: authForm.name, password: authForm.pass, role, medicines: [], medHistory: [], patients: [], profileComplete: false };
    setActiveUser(newUser);
    setAppStep(role === "patient" ? "setup-patient" : "setup-doctor");
  };

  const finalizeAccount = () => {
    if (activeUser.role === "patient") {
        if (!isOnlyLetters(setupData.emergencyName) || !isOnlyLetters(setupData.doctorName)) return alert("Names must be letters.");
        if (!isPhoneValid(setupData.emergencyPhone) || !isPhoneValid(setupData.doctorPhone)) return alert("Phones must be 10 digits.");
        if (!isBloodValid(setupData.blood)) return alert("Invalid blood group.");
    } else {
        if (!isPhoneValid(setupData.doctorPhone)) return alert("Phone must be 10 digits.");
    }
    const finalized = { ...activeUser, ...setupData, profileComplete: true };
    setAllAccounts([...allAccounts, finalized]);
    setActiveUser(finalized);
    setAppStep("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("medicare_active_session");
    setActiveUser(null);
    setAppStep("landing");
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Permanently delete account?")) {
        setAllAccounts(allAccounts.filter(acc => acc.id !== activeUser.id));
        handleLogout();
    }
  };

  // --- ADD MEDICINE FUNCTION ---
  const addMedicine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newMeds = [...(activeUser.medicines || []), { id: (Date.now() + Math.random()).toString(), ...medForm }];
    setActiveUser({ ...activeUser, medicines: newMeds });
    setMedForm({ name: "", dosage: "", time: "" });
  };

  const handleMedResponse = (action: "taken" | "skip" | "snooze") => {
    if (action === "taken") {
      const history = [{ name: activeReminder.name, time: activeReminder.time, dateTaken: new Date().toLocaleString() }, ...(activeUser.medHistory || [])];
      setActiveUser({ ...activeUser, medHistory: history });
    } else if (action === "skip") {
      setEmergencyAlert(`ALERT: family notified about dose of ${activeReminder.name} skipped.`);
      setTimeout(() => setEmergencyAlert(null), 10000);
    } else if (action === "snooze") {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 10);
      const snoozeTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setSnoozedMeds([...snoozedMeds, { ...activeReminder, triggerTime: snoozeTime }]);
    }
    setActiveReminder(null);
  };

  const bookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newAppt = { id: Date.now().toString(), ...apptForm, patientName: activeUser.name, doctorKey: normalize(activeUser.doctorName), doctorDisplay: activeUser.doctorName };
    setAppointments([...appointments, newAppt]);
    setApptForm({ reason: "", date: "" });
    alert("Request Sent.");
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
          lastTriggeredMinute.current = current;
          if(snooze) setSnoozedMeds(prev => prev.filter(s => s.triggerTime !== current));
      }
    }, 1000);
    return () => clearInterval(loop);
  }, [activeUser, activeReminder, snoozedMeds]);

  // --- DATA FILTERING ---
  const docAppointments = appointments.filter(a => a.doctorKey === normalize(activeUser?.name));
  const clinicSearchResults = allAccounts.filter(acc => acc.role === 'patient' && acc.name.toLowerCase().includes(searchTerm.toLowerCase()));

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

  if (authStep === "login" || authStep === "signup") return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 uppercase font-black">
        <button onClick={() => setAppStep("landing")} className="mb-6 text-white/50 flex items-center gap-2"><ArrowLeft size={18}/> Back</button>
        <div className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl space-y-8">
            <h2 className="text-3xl text-center">{authStep}</h2>
            <div className="space-y-4">
                <input placeholder="Username" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, pass: e.target.value})} />
                {authStep === "login" ? <button onClick={handleLogin} className="w-full py-5 bg-indigo-600 text-white rounded-2xl shadow-lg">Enter Portal</button> :
                    <div className="grid grid-cols-1 gap-3 pt-2">
                         <button onClick={() => handleSignupInit("patient")} className="w-full py-4 bg-indigo-50 text-indigo-700 border-2 border-indigo-200 rounded-2xl flex justify-between px-8">As Patient <User size={20}/></button>
                         <button onClick={() => handleSignupInit("doctor")} className="w-full py-4 bg-indigo-600 text-white rounded-2xl flex justify-between px-8">As Doctor <Stethoscope size={20}/></button>
                    </div>
                }
            </div>
        </div>
    </div>
  );

  if (authStep === "setup-patient" || authStep === "setup-doctor") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 uppercase font-black text-left">
        <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-xl space-y-6">
            <h2 className="text-2xl text-center">Verify Details</h2>
            {authStep === "setup-patient" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Age" type="number" className="p-4 bg-slate-50 rounded-2xl border" onChange={e => setSetupData({...setupData, age: e.target.value})} />
                    <input placeholder="Blood (O+)" className="p-4 bg-slate-50 rounded-2xl border uppercase" onChange={e => setSetupData({...setupData, blood: e.target.value})} />
                </div>
                <input placeholder="Family Member Name" className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, emergencyName: e.target.value})} />
                <input placeholder="Emergency Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, emergencyPhone: e.target.value})} />
                <div className="border-t pt-4 space-y-2"><input placeholder="Consulting Doctor's Name" className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, doctorName: e.target.value})} /> <input placeholder="Doctor's Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, doctorPhone: e.target.value})} /></div>
              </>
            ) : (
              <>
                <input placeholder="Professional Phone" maxLength={10} className="w-full p-4 bg-slate-50 border rounded-2xl" onChange={e => setSetupData({...setupData, doctorPhone: e.target.value})} />
                <textarea placeholder="Facility Hub Address" className="w-full p-4 bg-slate-50 border rounded-2xl min-h-[120px]" onChange={e => setSetupData({...setupData, clinicAddress: e.target.value})} />
              </>
            )}
            <button onClick={finalizeAccount} className="w-full py-4 bg-indigo-600 text-white rounded-2xl shadow-lg uppercase">Finalize Account</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-black uppercase">
      <AnimatePresence>
        {activeReminder && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white rounded-[50px] p-12 max-w-sm w-full shadow-2xl space-y-8 border-t-[12px] border-indigo-600">
              <Clock size={40} className="mx-auto text-indigo-600 animate-bounce" />
              <h2 className="text-3xl tracking-tighter">MEDICINE DUE!</h2>
              <p className="text-slate-500 italic font-bold">{activeReminder.name} ({activeReminder.dosage})</p>
              <button onClick={() => handleMedResponse("taken")} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl">MARK AS TAKEN</button>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => handleMedResponse("snooze")} className="py-4 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px]">REMIND IN 10M</button>
                 <button onClick={() => handleMedResponse("skip")} className="py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px]">SKIP</button>
              </div>
            </motion.div>
          </div>
        )}
        {emergencyAlert && (
            <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-10 left-1/2 -translate-x-1/2 z-[600] w-full max-w-lg p-4">
                <div className="bg-rose-600 text-white p-6 rounded-3xl shadow-2xl flex items-center gap-5 border-4 border-white animate-pulse"><ShieldAlert size={40} /><p className="text-sm font-black uppercase">{emergencyAlert}</p></div>
            </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b sticky top-0 z-40 p-4 flex items-center justify-between px-10 shadow-sm">
        <h1 className="font-extrabold text-lg flex items-center gap-2"><Heart className="text-indigo-600" /> MediCare Portal</h1>
        <button onClick={() => setActiveTab("profile")} className="bg-slate-50 p-2 rounded-xl border flex items-center gap-3"><div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center rounded-lg">{activeUser.name?.[0]}</div><p className="text-sm">{activeUser.name}</p></button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border space-y-1">
            <button onClick={() => setActiveTab("home")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm ${activeTab==='home'?'bg-indigo-600 text-white shadow-md':'text-slate-600'}`}><Activity size={18}/> Home</button>
            {activeUser.role==='patient'?(<><button onClick={() => setActiveTab("meds")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm ${activeTab==='meds'?'bg-indigo-600 text-white shadow-md':'text-slate-600'}`}><Clock size={18}/> Reminders</button><button onClick={() => setActiveTab("apps")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm ${activeTab==='apps'?'bg-indigo-600 text-white shadow-md':'text-slate-600'}`}><Calendar size={18}/> Appointments</button><button onClick={() => setActiveTab("history")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm ${activeTab==='history'?'bg-indigo-600 text-white shadow-md':'text-slate-600'}`}><ClipboardList size={18}/> History</button></>):(<button onClick={() => setActiveTab("patients")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm ${activeTab==='patients'?'bg-indigo-600 text-white shadow-md':'text-slate-600'}`}><Users size={18}/> Directory</button>)}
            <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm ${activeTab==='profile'?'bg-indigo-600 text-white shadow-md':'text-slate-600'}`}><User size={18}/> My Profile</button>
          </div>
          {activeUser.role==='patient'&&<EmergencySOSPanel familyName={activeUser.emergencyName} familyPhone={activeUser.emergencyPhone}/>}
        </div>

        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-indigo-900 text-white p-12 rounded-[50px] shadow-lg relative overflow-hidden"><h2 className="text-4xl font-black mb-3">Hello, {activeUser.name}!</h2><p className="opacity-80 font-medium text-lg uppercase tracking-tight">{activeUser.role==='doctor'?activeUser.clinicAddress:'Vitals and medicine tracking is active.'}</p><Zap className="absolute right-[-20px] top-[-20px] w-64 h-64 opacity-5 text-white" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[45px] border shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="font-black text-slate-800 mb-8 uppercase tracking-widest">{activeUser.role==='doctor'?"Appointments":"Today"}</h3>
                    <div className="flex-1">
                      {activeUser.role==='doctor'?(docAppointments.length===0?<p className="text-center py-20 text-slate-300 italic uppercase">No bookings.</p>:docAppointments.map(a=><div key={a.id} className="p-6 bg-indigo-50 border rounded-3xl mb-4 flex justify-between uppercase"><div><p className="font-black text-slate-800">{a.patientName}</p><p className="text-[10px] text-indigo-500 font-bold">{a.reason}</p></div><p className="text-xs font-black">{new Date(a.date).toLocaleDateString()}</p></div>)):(activeUser.medicines||[]).slice(0,4).map((m:any)=><div key={m.id} className="p-6 bg-slate-50 border rounded-3xl mb-4 flex justify-between font-black uppercase shadow-sm"><span>{m.name}</span><span className={!m.time?"text-rose-500 animate-pulse font-bold":"text-indigo-600"}>{m.time||"SET TIME"}</span></div>)}
                    </div>
                  </div>
                  {activeUser.role==='patient'?(<div className="space-y-8"><PrescriptionOCRScanner onImportMedicines={(p:any)=>{const withIds=p.map((m:any)=>({...m,id:Math.random(),time:""}));setActiveUser({...activeUser,medicines:[...(activeUser.medicines||[]),...withIds]});setActiveTab("meds")}}/><HealthTipsWidget/></div>):(<div className="bg-white p-10 rounded-[45px] border shadow-sm text-left"><h3 className="mb-8 uppercase font-black font-sans flex items-center gap-3"><Search className="text-indigo-600"/> Clinic Search</h3><input placeholder="Search patient name..." className="w-full p-6 bg-slate-50 border rounded-3xl outline-none text-lg shadow-inner font-black" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />{searchTerm && <div className="mt-4 space-y-2">{clinicSearchResults.map((p: any) => (<button key={p.id} onClick={() => {setActiveTab("patients");setSelectedPatient(p)}} className="w-full p-4 flex justify-between bg-white border rounded-2xl hover:border-indigo-400 font-black text-sm uppercase">{p.name}<ArrowRight size={16}/></button>))}</div>}</div>)}
                </div>
              </motion.div>
            )}

            {activeTab === "meds" && (
                <div className="space-y-8 text-left uppercase">
                    <div className="bg-white p-10 rounded-[45px] border shadow-sm"><h3 className="font-black text-xl uppercase tracking-widest mb-8">Add Reminder</h3><form onSubmit={addMedicine} className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black uppercase"><input required placeholder="Med Name" className="p-5 bg-slate-50 border rounded-3xl outline-none" value={medForm.name} onChange={e=>setMedForm({...medForm,name:e.target.value})} /><input required placeholder="Dosage" className="p-5 bg-slate-50 border rounded-3xl outline-none" value={medForm.dosage} onChange={e=>setMedForm({...medForm,dosage:e.target.value})} /><input required type="time" className="p-5 bg-slate-50 border rounded-3xl outline-none" value={medForm.time} onChange={e=>setMedForm({...medForm,time:e.target.value})} /><button className="md:col-span-3 py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl uppercase">Create Alert</button></form></div>
                    <div className="grid grid-cols-1 gap-4 font-black">{(activeUser.medicines||[]).map((m:any)=>(<div key={m.id} className="p-8 bg-white border rounded-[35px] shadow-sm flex justify-between items-center uppercase"><div className="text-left font-black"><p className="text-2xl font-black">{m.name}</p><div className="flex items-center gap-3 mt-2 font-sans"><div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100"><Clock size={14} className={!m.time?"text-rose-500 animate-pulse":"text-indigo-600"}/><input type="time" className="bg-transparent text-[10px] outline-none font-black uppercase" value={m.time||""} onChange={(e)=>setActiveUser({...activeUser,medicines:activeUser.medicines.map((x:any)=>x.id===m.id?{...x,time:e.target.value}:x)})}/></div><span className="text-[10px] text-slate-400 opacity-50 uppercase tracking-widest">{m.dosage}</span></div></div><button onClick={()=>setActiveUser({...activeUser,medicines:activeUser.medicines.filter((x:any)=>x.id!==m.id)})} className="p-4 text-rose-500 bg-rose-50 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2/></button></div>))}</div>
                </div>
            )}

            {activeTab === "apps" && (
                <div className="space-y-8 uppercase font-black text-left"><div className="bg-white p-12 rounded-[50px] border shadow-sm"><h3 className="text-2xl mb-8 tracking-widest">Book Appointment</h3><form onSubmit={bookAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left font-black"><input required placeholder="Reason for Visit" className="p-6 bg-slate-50 border rounded-[30px] outline-none" value={apptForm.reason} onChange={e=>setApptForm({...apptForm,reason:e.target.value})} /><input required type="datetime-local" className="p-6 bg-slate-50 border rounded-[30px] outline-none" value={apptForm.date} onChange={e=>setApptForm({...apptForm,date:e.target.value})} /><button className="md:col-span-2 py-6 bg-indigo-600 text-white font-black rounded-[30px] shadow-2xl text-xl uppercase">Request Dr. {activeUser.doctorName}</button></form></div><div className="bg-white p-12 rounded-[50px] border shadow-sm uppercase font-black text-left font-sans"><h3 className="text-2xl mb-8 text-slate-400 uppercase font-black">My Requests</h3>{appointments.map((a: any)=><div key={a.id} className="p-6 bg-slate-50 border rounded-[30px] mb-4 flex justify-between items-center shadow-sm"><div><p className="text-lg font-black uppercase font-sans">{a.reason}</p><p className="text-[10px] text-indigo-400 mt-1 font-sans">Provider: {a.doctorDisplay}</p></div><p className="text-xs text-slate-400">{new Date(a.date).toLocaleString()}</p></div>)}</div></div>
            )}

            {activeTab === "history" && (
                <div className="bg-white p-12 rounded-[50px] border shadow-sm text-left uppercase font-black"><h3 className="text-2xl mb-10 tracking-widest uppercase">Confirmed Logs</h3>{(activeUser.medHistory||[]).length===0?<p className="text-center py-24 text-slate-300 italic opacity-40 uppercase">No intake records.</p>:activeUser.medHistory.map((m:any,i:number)=>(<div key={i} className="p-8 bg-emerald-50 border border-emerald-100 rounded-[35px] flex justify-between items-center mb-5 uppercase shadow-sm"><div><p className="text-2xl font-black">{m.name}</p><p className="text-[10px] text-slate-400 mt-1 uppercase">Confirmed for: {m.time} | Taken at: {m.dateTaken}</p></div><CheckCircle2 className="text-emerald-500" size={40}/></div>))}</div>
            )}

            {activeTab === "patients" && (
              <div className="space-y-8 text-left uppercase font-black">
                <div className="bg-white p-12 rounded-[50px] border shadow-sm text-left"><h3 className="text-2xl mb-8 tracking-widest uppercase font-black">Register Entry</h3><form onSubmit={(e)=>{e.preventDefault();if(!isPhoneValid(patientReg.phone))return alert("Invalid Phone.");setActiveUser({...activeUser,patients:[...(activeUser.patients||[]),{...patientReg,id:Date.now().toString()}]});setPatientReg({name:"",blood:"",phone:"",condition:"",famName:"",famPhone:""});alert("Saved.");}} className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black uppercase font-sans"><input required placeholder="Patient Full Name" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none" value={patientReg.name} onChange={e=>setPatientReg({...patientReg,name:e.target.value})} /><input required placeholder="BLOOD GROUP" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none uppercase" value={patientReg.blood} onChange={e=>setPatientReg({...patientReg,blood:e.target.value})} /><input required maxLength={10} placeholder="Mobile" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none" value={patientReg.phone} onChange={e=>setPatientReg({...patientReg,phone:e.target.value})} /><input required placeholder="Diagnosis" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none" value={patientReg.condition} onChange={e=>setPatientReg({...patientReg,condition:e.target.value})} /><input required placeholder="Backup Support Name" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none" value={patientReg.famName} onChange={e=>setPatientReg({...patientReg,famName:e.target.value})} /><input required maxLength={10} placeholder="Backup Phone" className="p-6 bg-slate-50 border rounded-[30px] font-black outline-none" value={patientReg.famPhone} onChange={e=>setPatientReg({...patientReg,famPhone:e.target.value})} /><button className="md:col-span-2 py-6 bg-indigo-600 text-white font-black rounded-[30px] shadow-2xl text-xl uppercase tracking-widest">Confirm Record</button></form></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 uppercase">{(activeUser.patients||[]).map((p:any)=>(<div key={p.id} className="relative group text-left uppercase"><div onClick={()=>setSelectedPatient(p)} className={`p-10 rounded-[45px] border transition-all cursor-pointer shadow-sm ${selectedPatient?.id===p.id?'bg-indigo-600 text-white shadow-2xl':'bg-white hover:border-indigo-400'}`}><p className="font-black text-2xl mb-1 uppercase tracking-tighter text-left">{p.name}</p><p className={`text-[10px] uppercase tracking-widest ${selectedPatient?.id===p.id?'text-white/70':'text-slate-400'}`}>{p.condition}</p></div><button onClick={(e)=>{e.stopPropagation();setActiveUser({...activeUser,patients:activeUser.patients.filter((x:any)=>x.id!==p.id)});if(selectedPatient?.id===p.id)setSelectedPatient(null);}} className="absolute -top-3 -right-3 p-4 bg-white text-rose-500 rounded-full shadow-2xl hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Trash2/></button></div>))}</div>
                 {selectedPatient && (<motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-indigo-900 text-white p-12 rounded-[60px] shadow-2xl space-y-10 uppercase font-black text-left"><div className="flex justify-between items-start font-sans"><div><h3 className="text-5xl tracking-tighter uppercase font-black font-sans">{selectedPatient.name}</h3><p className="font-bold opacity-70 mt-3 text-xl flex items-center gap-3 uppercase font-black"><Phone size={22} /> {selectedPatient.phone}</p></div><button onClick={()=>setSelectedPatient(null)} className="px-8 py-3 bg-white/10 rounded-full text-xs border border-white/20 uppercase tracking-widest">Close File</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left uppercase"><div className="bg-white/10 p-10 rounded-[50px] border border-white/10 text-left uppercase font-black"><p className="text-[10px] opacity-60 mb-3 tracking-widest font-sans">History Details</p><p className="text-2xl font-medium leading-relaxed italic font-black">"{selectedPatient.condition}"</p><div className="mt-8 flex items-center gap-4 text-sm bg-indigo-800/50 w-fit px-6 py-3 rounded-3xl"><Droplet size={18} className="text-rose-400"/> Blood Group {selectedPatient.blood}</div></div><div className="bg-white/10 p-10 rounded-[50px] border border-white/10 text-left uppercase font-black"><p className="text-[10px] opacity-60 mb-6 tracking-widest font-sans">Emergency Backup</p><div className="flex items-center gap-6"><div className="w-16 h-16 rounded-[25px] bg-indigo-600 flex items-center justify-center shadow-lg"><ShieldAlert size={35}/></div><div><p className="text-2xl font-black">{selectedPatient.famName}</p><p className="text-xl opacity-70 mt-1 uppercase font-sans font-black">{selectedPatient.famPhone}</p></div></div></div></div></motion.div>)}
              </div>
            )}

            {activeTab === "profile" && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-12 rounded-[50px] border shadow-sm text-left uppercase space-y-12"><h2 className="text-4xl border-b pb-8 tracking-tighter uppercase font-black">My Profile</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-black uppercase"><div><label className="text-[10px] text-slate-400 uppercase tracking-widest">USERNAME</label><p className="text-2xl mt-1 underline decoration-indigo-200 decoration-4 font-black">{activeUser.name}</p></div><div><label className="text-[10px] text-slate-400 uppercase tracking-widest">PORTAL ROLE</label><p className="text-2xl text-indigo-600 mt-1 font-black uppercase">{activeUser.role}</p></div>{activeUser.role === 'patient' ? (<><div><label className="text-[10px] text-slate-400 uppercase tracking-widest font-black">CLINICAL DATA</label><p className="text-xl mt-1 font-black uppercase">{activeUser.age} Years • {activeUser.blood}</p></div><div><label className="text-[10px] text-rose-400 uppercase tracking-widest font-black">SOS CONTACT</label><p className="text-xl text-rose-600 mt-1 font-black flex items-center gap-2 uppercase font-sans"><Phone size={18}/> {activeUser.emergencyName} ({activeUser.emergencyPhone})</p></div><div className="md:col-span-2 border-t pt-10"><label className="text-[10px] text-slate-400 uppercase tracking-widest">ASSIGNED DOCTOR</label><p className="text-xl mt-2 font-black flex items-center gap-3 font-sans uppercase font-black"><Stethoscope size={22} className="text-indigo-600"/> Dr. {activeUser.doctorName} • {activeUser.doctorPhone}</p></div></>) : (<div className="md:col-span-2 space-y-3 font-black"><label className="text-[10px] text-slate-400 uppercase tracking-widest">FACILITY ADDRESS</label><p className="text-xl flex items-center gap-4 uppercase font-black font-sans"><MapPin size={32} className="text-indigo-600 shrink-0"/> {activeUser.clinicAddress || 'Clinic Hub'}</p></div>)}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20 font-black"><button onClick={handleLogout} className="w-full py-8 bg-slate-50 border-2 border-slate-200 text-slate-600 rounded-[35px] hover:bg-slate-200 transition-all uppercase tracking-widest font-black">Logout</button><button onClick={handleDeleteAccount} className="w-full py-8 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-[35px] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3 uppercase tracking-widest font-black">Delete Account Permanently</button></div></motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}