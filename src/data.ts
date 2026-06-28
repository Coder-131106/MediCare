import { HealthTip, Medicine, Appointment, UserProfile } from "./types";

export const HEALTH_TIPS: HealthTip[] = [
  {
    id: "tip-1",
    tip: "Drink at least 8 ounces of water with your tablets unless your doctor advised otherwise.",
    category: "hydration"
  },
  {
    id: "tip-2",
    tip: "A short 20-30 minute walk daily can significantly improve cardiovascular health and boost medicine efficacy.",
    category: "activity"
  },
  {
    id: "tip-3",
    tip: "Aim for 7 to 8 hours of sleep. Resting well helps your immune system work hand-in-hand with your medications.",
    category: "sleep"
  },
  {
    id: "tip-4",
    tip: "Always check if your medicine should be taken before or after meals. Food can greatly alter absorption rates.",
    category: "diet"
  },
  {
    id: "tip-5",
    tip: "Organize your medications in a weekly pill organizer box on Sundays to avoid double-dosing mistakes.",
    category: "adherence"
  },
  {
    id: "tip-6",
    tip: "Never skip medication doses even if you feel completely fine, especially for chronic conditions like hypertension.",
    category: "adherence"
  },
  {
    id: "tip-7",
    tip: "Limit caffeine and alcohol intake as they can interfere with sleep, hydration, and various common therapies.",
    category: "diet"
  }
];

export const INITIAL_USER: UserProfile = {
  name: "Madhumitha Kumar",
  age: 68,
  bloodGroup: "O+",
  emergencyName: "Anjali (Daughter)",
  emergencyPhone: "+1 (555) 019-2834",
  medicalConditions: "Hypertension, Mild Arthritis",
  isLoggedIn: true
};

export const INITIAL_MEDICINES: Medicine[] = [
  {
    id: "med-1",
    name: "Amlodipine (BP Tablet)",
    dosage: "1 Tablet (5mg)",
    time: "08:00",
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    isActive: true
  },
  {
    id: "med-2",
    name: "Glucosamine (Arthritis)",
    dosage: "1 Capsule (500mg)",
    time: "14:00",
    startDate: "2026-06-01",
    endDate: "2026-09-30",
    isActive: true
  },
  {
    id: "med-3",
    name: "Atorvastatin (Cholesterol)",
    dosage: "1 Tablet (10mg)",
    time: "20:00",
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    isActive: true
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "app-1",
    doctorName: "Dr. Kumar (Cardiologist)",
    hospitalName: "Apollo Hospital, Clinic A",
    date: "2026-07-20",
    time: "10:30",
    purpose: "Routine blood pressure and heart rate follow-up check."
  }
];
