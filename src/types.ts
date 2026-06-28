export interface UserProfile {
  name: string;
  age: number;
  bloodGroup: string;
  emergencyName: string;
  emergencyPhone: string;
  medicalConditions?: string;
  isLoggedIn: boolean;
}

export type AdherenceStatus = "taken" | "skipped" | "missed" | "pending";

export interface AdherenceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  medicineId: string;
  medicineName: string;
  dosage: string;
  status: AdherenceStatus;
  timestamp?: string; // Actual action time
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string; // e.g., "1 Tablet", "2 Capsules"
  time: string; // "08:00", "20:00"
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  doctorName: string;
  hospitalName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  purpose: string;
}

export interface ParsedMedication {
  name: string;
  dosage: string;
  timing: string;
  durationDays?: number;
}

export interface ScannedPrescription {
  id: string;
  imageUrl: string;
  date: string;
  doctorName?: string;
  hospitalName?: string;
  medicines: {
    name: string;
    dosage: string;
    timing: string;
    durationDays?: number;
  }[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: "pill" | "appointment" | "family" | "system";
  read: boolean;
  metadata?: {
    medicineId?: string;
    appointmentId?: string;
    scheduledTime?: string;
  };
}

export interface HealthTip {
  id: string;
  tip: string;
  category: "hydration" | "activity" | "sleep" | "diet" | "adherence";
}
