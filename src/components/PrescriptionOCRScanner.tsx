import React, { useState } from 'react';
import { Upload, X, Loader2, ClipboardCheck, Sparkles } from 'lucide-react';

interface PrescriptionOCRScannerProps {
  onImportMedicines: (medicines: any[]) => void;
}

export default function PrescriptionOCRScanner({ onImportMedicines }: PrescriptionOCRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [extractedMeds, setExtractedMeds] = useState<any[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    
    // Convert to Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;

      try {
        const response = await fetch('http://localhost:3000/api/ocr-prescription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        });

        const data = await response.json();
        // Handle both {medicines: []} and direct array responses
        const medsList = Array.isArray(data) ? data : (data.medicines || []);
        setExtractedMeds(medsList);
      } catch (error) {
        alert("Extraction failed. Please try a clearer photo.");
      } finally {
        setIsScanning(false);
      }
    };
  };

  return (
    <div className="bg-white p-10 rounded-[45px] border shadow-sm space-y-6 font-black uppercase text-left">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="text-indigo-600" />
        <h3 className="font-black text-xl tracking-widest">Prescription Scanner</h3>
      </div>
      
      <p className="text-slate-400 text-[10px] leading-tight font-bold">
        Digitally scan and extract medicine regimes from your doctor's document.
      </p>

      {!isScanning && extractedMeds.length === 0 && (
        <label className="flex flex-col items-center justify-center border-4 border-dashed border-indigo-50 rounded-[35px] p-10 cursor-pointer hover:bg-indigo-50/30 transition-all group">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="text-indigo-600" />
          </div>
          <span className="text-sm font-black text-slate-800">Upload Prescription Photo</span>
          <span className="text-[10px] text-slate-400 mt-1">Drag and drop or tap to choose</span>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </label>
      )}

      {isScanning && (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-slate-50 rounded-[35px] animate-pulse">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <h2 className="text-lg font-black uppercase">Analyzing Prescription...</h2>
          <p className="text-[10px] text-slate-400 text-center">Reading doctor's notes and dosages.</p>
        </div>
      )}

      {extractedMeds.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {/* REMOVED: "Gemini AI OCR Output" label was here */}
            <h4 className="text-[12px] text-indigo-600 font-black">Extracted Meds</h4>
            <button 
              onClick={() => setExtractedMeds([])} 
              className="text-[10px] text-slate-400 hover:text-rose-500 font-black"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2">
            {extractedMeds.map((med, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                <div>
                  <p className="text-sm font-black">{med.name}</p>
                  <p className="text-[9px] text-slate-400">Dosage: {med.dosage}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
              </div>
            ))}
          </div>

          <button 
            onClick={() => {
              onImportMedicines(extractedMeds);
              setExtractedMeds([]);
            }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={16} /> Import all to Reminders
          </button>
        </div>
      )}
    </div>
  );
}