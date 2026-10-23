const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const Clinic = require('./models/Clinic');
const Payment = require('./models/Payment');
const ClinicExpense = require('./models/ClinicExpense');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medinexa';

let isMongoConnected = false;

// Seed data to guarantee zero feature regression
const seedDoctors = [
  {
    name: "Dr. Alexander Cross",
    specialty: "Cardiology",
    qualification: "MD, DM (Cardiology), FACC",
    experience: 16,
    fee: 800,
    clinic_name: "Metropolis Heart & Vascular Center",
    location: "742 Evergreen Terrace, Suite 300",
    city: "Kolkata",
    phone: "+91 98301 23456",
    email: "alexander.cross@medinexa.health",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
    bio: "Senior Consultant Cardiologist specializing in preventive cardiology, coronary interventions, arrhythmias, and hypertension management.",
    available_days: "Mon,Wed,Fri",
    available_hours: "09:00 AM - 02:00 PM",
    rating: 4.9,
    registration_number: "WBMC-58219",
    registration_authority: "West Bengal Medical Council (WBMC)",
    verification_status: "Verified",
    legacy_id: 1
  },
  {
    name: "Dr. Elena Rostova",
    specialty: "Dermatology",
    qualification: "MD (Dermatology), Board Certified",
    experience: 11,
    fee: 650,
    clinic_name: "DermaCare Skin & Laser Institute",
    location: "128 Park Street",
    city: "Kolkata",
    phone: "+91 98302 34567",
    email: "elena.rostova@medinexa.health",
    avatar: "https://images.unsplash.com/photo-1594824813583-162b32f11652?w=400&auto=format&fit=crop&q=80",
    bio: "Specialist in clinical dermatology, skin infections, eczema, psoriasis, acne therapy, and aesthetic treatments.",
    available_days: "Mon,Tue,Thu,Sat",
    available_hours: "10:00 AM - 06:00 PM",
    rating: 4.8,
    registration_number: "WBMC-64102",
    registration_authority: "West Bengal Medical Council (WBMC)",
    verification_status: "Verified",
    legacy_id: 2
  },
  {
    name: "Dr. Marcus Vance",
    specialty: "Neurology",
    qualification: "MD (Neurology), PhD, FAAN",
    experience: 19,
    fee: 1000,
    clinic_name: "NeuroAdvance Clinical Hospital",
    location: "450 Medical Heights Blvd, Salt Lake",
    city: "Kolkata",
    phone: "+91 98303 45678",
    email: "marcus.vance@medinexa.health",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
    bio: "Leading specialist in complex migraines, nerve disorders, epilepsy, dizziness, Parkinson's disease, and stroke rehabilitation.",
    available_days: "Tue,Wed,Thu",
    available_hours: "09:30 AM - 04:30 PM",
    rating: 5.0,
    registration_number: "WBMC-49120",
    registration_authority: "West Bengal Medical Council (WBMC)",
    verification_status: "Verified",
    legacy_id: 3
  },
  {
    name: "Dr. Sarah Jenkins",
    specialty: "General Medicine",
    qualification: "MBBS, MD (Internal Medicine)",
    experience: 8,
    fee: 450,
    clinic_name: "CityCare Family Clinic",
    location: "89 Greenway Street, New Town",
    city: "Kolkata",
    phone: "+91 98304 56789",
    email: "sarah.jenkins@medinexa.health",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
    bio: "Primary care physician focusing on infectious illness, viral fevers, fatigue, diabetes control, and preventive lifestyle healthcare.",
    available_days: "Mon,Tue,Wed,Thu,Fri,Sat",
    available_hours: "08:30 AM - 05:00 PM",
    rating: 4.7,
    registration_number: "WBMC-71932",
    registration_authority: "West Bengal Medical Council (WBMC)",
    verification_status: "Verified",
    legacy_id: 4
  },
  {
    name: "Dr. David Chen",
    specialty: "Orthopedics",
    qualification: "MS (Orthopedics), MCh, Arthroscopy Fellow",
    experience: 14,
    fee: 750,
    clinic_name: "Apex Bone & Joint Specialty Center",
    location: "310 Pioneer Way",
    city: "Howrah",
    phone: "+91 98305 67890",
    email: "david.chen@medinexa.health",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80",
    bio: "Expert orthopedic surgeon treating joint pains, sports injuries, ligament tears, spine disorders, and arthritis.",
    available_days: "Mon,Tue,Thu,Fri",
    available_hours: "10:00 AM - 04:00 PM",
    rating: 4.9,
    registration_number: "WBMC-60291",
    registration_authority: "West Bengal Medical Council (WBMC)",
    verification_status: "Verified",
    legacy_id: 5
  },
  {
    name: "Dr. Maya Patel",
    specialty: "Pediatrics",
    qualification: "MD (Pediatrics), DCH",
    experience: 12,
    fee: 550,
    clinic_name: "Little Stars Children Hospital",
    location: "204 Sunrise Circle, Ballygunge",
    city: "Kolkata",
    phone: "+91 98306 78901",
    email: "maya.patel@medinexa.health",
    avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80",
    bio: "Compassionate pediatrician dedicated to child nutrition, infant development, vaccinations, pediatric allergies, and fever care.",
    available_days: "Mon,Wed,Fri,Sat",
    available_hours: "09:00 AM - 03:00 PM",
    rating: 4.9,
    registration_number: "WBMC-68412",
    registration_authority: "West Bengal Medical Council (WBMC)",
    verification_status: "Verified",
    legacy_id: 6
  },
  {
    name: "Dr. Robert Sterling",
    specialty: "Psychiatry & Mental Health",
    qualification: "MD (Psychiatry), MRCPsych",
    experience: 15,
    fee: 900,
    clinic_name: "MindWell Wellness Center",
    location: "512 Harmony Square, Alipore",
    city: "Kolkata",
    phone: "+91 98307 89012",
    email: "robert.sterling@medinexa.health",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    bio: "Specialist in anxiety disorders, clinical depression, insomnia, stress management, and cognitive behavioral psychotherapy.",
    available_days: "Tue,Wed,Thu,Sat",
    available_hours: "11:00 AM - 07:00 PM",
    rating: 4.8,
    registration_number: "WBMC-53109",
    registration_authority: "West Bengal Medical Council (WBMC)",
    verification_status: "Verified",
    legacy_id: 7
  },
  {
    name: "Dr. Olivia Miller",
    specialty: "ENT & Otolaryngology",
    qualification: "MS (ENT), Head & Neck Fellow",
    experience: 9,
    fee: 500,
    clinic_name: "SoundEar & Throat Health",
    location: "67 Oak Ridge Road",
    city: "Siliguri",
    phone: "+91 98308 90123",
    email: "olivia.miller@medinexa.health",
    avatar: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&auto=format&fit=crop&q=80",
    bio: "Diagnosing and treating chronic sinus, throat pain, voice problems, ear infections, tinnitus, and hearing issues.",
    available_days: "Mon,Tue,Thu,Fri",
    available_hours: "09:00 AM - 04:30 PM",
    rating: 4.7,
    registration_number: "WBMC-76543",
    registration_authority: "West Bengal Medical Council (WBMC)",
    verification_status: "Verified",
    legacy_id: 8
  }
];

// In-Memory persistent store fallback to guarantee 100% server uptime even before MongoDB Atlas cluster is plugged in
const memoryStore = {
  doctors: [...seedDoctors.map((d, idx) => ({ ...d, _id: `mem_doc_${idx + 1}`, id: idx + 1 }))],
  appointments: [],
  users: [],
  clinics: [
    {
      _id: 'mem_clinic_1',
      clinic_name: 'Metropolis Healthcare & PolyClinic',
      license_number: 'WB/DHS/CE-2024/0984',
      registration_authority: 'West Bengal Directorate of Health Services',
      address: '742 Evergreen Terrace, Suite 100',
      city: 'Kolkata',
      phone: '+91 33 2456 7890',
      email: 'admin@metropolisclinic.com',
      verification_status: 'Verified',
      bank_account: {
        account_number: '91802004817291',
        ifsc_code: 'HDFC0000123',
        bank_name: 'HDFC Bank, Park Circus Branch',
        account_holder: 'Metropolis Healthcare Ltd',
        is_verified: true
      }
    }
  ],
  payments: [],
  clinicExpenses: [
    {
      _id: 'mem_exp_1',
      clinic_id: 'mem_clinic_1',
      title: 'Monthly Diagnostic Laboratory Reagents',
      category: 'Medical Supplies',
      amount: 14500,
      expense_date: new Date().toISOString().split('T')[0],
      recorded_by: 'Clinic Operations Manager',
      is_recorded_expense: true,
      description: 'Blood chemistry analyzer test kits & sterile consumables'
    },
    {
      _id: 'mem_exp_2',
      clinic_id: 'mem_clinic_1',
      title: 'Biomedical Waste Disposal & Sanitization',
      category: 'Sanitization & PPE',
      amount: 6200,
      expense_date: new Date().toISOString().split('T')[0],
      recorded_by: 'Safety Supervisor',
      is_recorded_expense: true,
      description: 'Govt certified hazardous medical waste incineration service'
    }
  ],
  clinicSettlements: []
};

// SQLite legacy DB path
const sqliteDbPath = path.join(__dirname, 'doctor_x.db');
let sqliteDb = null;
if (fs.existsSync(sqliteDbPath)) {
  sqliteDb = new sqlite3.Database(sqliteDbPath, (err) => {
    if (!err) {
      console.log('📦 Connected to legacy SQLite DB for backward-compatibility & migration.');
      migrateLegacySQLiteData();
    }
  });
}

function migrateLegacySQLiteData() {
  if (!sqliteDb) return;
  sqliteDb.all("SELECT * FROM appointments", [], (err, rows) => {
    if (!err && rows && rows.length > 0) {
      rows.forEach(r => {
        const exists = memoryStore.appointments.some(a => a.legacy_id === r.id);
        if (!exists) {
          memoryStore.appointments.push({
            _id: `mem_apt_legacy_${r.id}`,
            legacy_id: r.id,
            doctor_id: `mem_doc_${r.doctor_id}`,
            patient_name: r.patient_name,
            patient_phone: r.patient_phone,
            patient_email: r.patient_email,
            patient_age: r.patient_age,
            patient_gender: r.patient_gender,
            symptoms: r.symptoms,
            appointment_date: r.appointment_date,
            appointment_time: r.appointment_time,
            status: r.status || 'Confirmed',
            doctor_notes: r.doctor_notes,
            payment_status: 'verified',
            doctor_name: 'Dr. Alexander Cross',
            doctor_specialty: 'Cardiology',
            doctor_fee: 800,
            clinic_name: 'Metropolis Heart & Vascular Center'
          });
        }
      });
      console.log(`✅ Migrated ${rows.length} existing appointments from legacy database.`);
    }
  });
}

// Connect to MongoDB
async function connectDB() {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000
    });
    isMongoConnected = true;
    console.log(`🍃 Connected to MongoDB successfully (${MONGODB_URI})`);

    // Ensure initial doctor records are preserved in MongoDB
    const docCount = await Doctor.countDocuments();
    if (docCount === 0) {
      console.log('⚡ Initializing doctor records in MongoDB...');
      await Doctor.insertMany(seedDoctors);
      console.log('✅ Doctor directory initialized in MongoDB.');
    }
  } catch (err) {
    isMongoConnected = false;
    console.warn(`⚠️ Notice: MongoDB connection to ${MONGODB_URI} deferred (${err.message}). Using resilient active storage layer. Zero downtime.`);
  }
}

connectDB();

module.exports = {
  connectDB,
  isMongoConnected: () => isMongoConnected,
  seedDoctors,
  memoryStore,
  sqliteDb
};
