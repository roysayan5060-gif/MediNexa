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
  clinicSettlements: [],

  // Dedicated Doctor Suite features (Wallet, Transactions, Consultations, Reminders)
  doctorWallet: {
    balance: 6573.50,
    spent_today: 0.00
  },
  doctorTransactions: [
    { id: 'tx_1', title: 'Wallet recharged with ₹500', amount: 500.00, type: 'recharge', date: 'May 25, 2026 • 3:39 PM' },
    { id: 'tx_2', title: 'Prescription Simplifier + Follow-up', amount: -3.50, type: 'deduction', date: 'May 16, 2026 • 5:33 PM' },
    { id: 'tx_3', title: 'Prescription Simplifier + Follow-up', amount: -3.50, type: 'deduction', date: 'May 16, 2026 • 5:33 PM' },
    { id: 'tx_4', title: 'WhatsApp Message + Prescription', amount: -3.00, type: 'deduction', date: 'May 4, 2026 • 3:02 PM' },
    { id: 'tx_5', title: 'WhatsApp Message + Vaccination', amount: -4.50, type: 'deduction', date: 'May 4, 2026 • 3:01 PM' },
    { id: 'tx_6', title: 'Wallet recharged with ₹1000', amount: 1000.00, type: 'recharge', date: 'May 2, 2026 • 11:44 PM' },
    { id: 'tx_7', title: 'WhatsApp Message + Prescription', amount: -3.00, type: 'deduction', date: 'May 2, 2026 • 11:42 PM' },
    { id: 'tx_8', title: 'Wallet recharged with ₹1000', amount: 1000.00, type: 'recharge', date: 'May 2, 2026 • 10:58 AM' },
    { id: 'tx_9', title: 'Wallet recharged with ₹300', amount: 300.00, type: 'recharge', date: 'May 2, 2026 • 10:58 AM' },
    { id: 'tx_10', title: 'WhatsApp Message + Vaccination', amount: -4.50, type: 'deduction', date: 'May 2, 2026 • 10:57 AM' },
    { id: 'tx_11', title: 'Wallet recharged with ₹1000', amount: 1000.00, type: 'recharge', date: 'May 1, 2026 • 10:50 PM' },
    { id: 'tx_12', title: 'Wallet recharged with ₹100', amount: 100.00, type: 'recharge', date: 'May 1, 2026 • 10:50 PM' },
    { id: 'tx_13', title: 'Wallet recharged with ₹100', amount: 100.00, type: 'recharge', date: 'May 1, 2026 • 9:30 PM' },
    { id: 'tx_14', title: 'Wallet recharged with ₹100', amount: 100.00, type: 'recharge', date: 'May 1, 2026 • 9:30 PM' },
    { id: 'tx_15', title: 'WhatsApp Message + Vaccination', amount: -4.50, type: 'deduction', date: 'May 1, 2026 • 5:11 PM' }
  ],
  doctorConsultations: [
    {
      id: 'c_3',
      queue_number: '#3',
      patient_name: 'Atanu',
      patient_phone: '9876543212',
      patient_age: 21,
      patient_gender: 'male',
      doctor_name: 'Dr. Priya Sharma',
      language: 'Bengali',
      tags: ['2 Meds', 'Sent'],
      cost: 3.00,
      timestamp: 'May 2, 2026 • 11:42 PM',
      medicines: [
        { name: 'Clonazepam', dose: '0.5', unit: 'mg', form: 'Tablet', frequency: 'OD', timing: 'PC', time_slot: 'Bedtime', duration: '3 days', simplified: 'Clonazepam 0.5 mg tablet: Take once daily after food in the bedtime for 3 days' },
        { name: 'Pantoprazole', dose: '40', unit: 'mg', form: 'Tablet', frequency: 'OD', timing: 'AC', time_slot: 'Early Morning', duration: '15 days', simplified: 'Pantoprazole 40 mg tablet: Take once daily before food in the early morning for 15 days' }
      ],
      instructions: 'Take light meals. Drink plenty of water.',
      internal_notes: 'Patient feels anxious about work.'
    },
    {
      id: 'c_2',
      queue_number: '#2',
      patient_name: 'Atri',
      patient_phone: '9876543211',
      patient_age: 26,
      patient_gender: 'male',
      doctor_name: 'Dr. Priya Sharma',
      language: 'English',
      tags: ['1 Med', 'Vaccine', 'Sent'],
      cost: 4.50,
      timestamp: 'May 2, 2026 • 10:57 AM',
      medicines: [
        { name: 'Amoxicillin', dose: '500', unit: 'mg', form: 'Capsule', frequency: 'TDS', timing: 'PC', time_slot: 'Morning', duration: '5 days', simplified: 'Amoxicillin 500 mg capsule: Take thrice daily after food in the morning, noon, and night for 5 days' }
      ],
      instructions: 'Complete antibiotic course.',
      vaccination_date: '2026-06-30'
    },
    {
      id: 'c_1',
      queue_number: '#1',
      patient_name: 'Satadru',
      patient_phone: '9876543210',
      patient_age: 21,
      patient_gender: 'male',
      doctor_name: 'Dr. Priya Sharma',
      language: 'Bengali',
      tags: ['2 Meds', 'Vaccine', 'Sent'],
      cost: 4.50,
      timestamp: 'May 1, 2026 • 5:11 PM',
      medicines: [
        { name: 'Pantoprazole', dose: '40', unit: 'mg', form: 'Tablet', frequency: 'OD', timing: 'AC', time_slot: 'Early Morning', duration: '15 days', simplified: 'Pantoprazole 40 mg tablet: Take once daily before food in the early morning for 15 days' },
        { name: 'Paracetamol', dose: '650', unit: 'mg', form: 'Tablet', frequency: 'SOS', timing: 'PC', time_slot: 'Bedtime', duration: '3 days', simplified: 'Paracetamol 650 mg tablet: Take as needed after food for 3 days' }
      ],
      instructions: "Don't take tea or coffee spicy foods ... Drink more water",
      vaccination_date: '2026-06-30',
      followup_date: '2026-06-30',
      followup_time: '10:00',
      report_review_name: 'CBC, Blood Sugar',
      report_review_date: '2026-06-26',
      report_review_time: '10:00'
    }
  ],
  doctorReminders: [
    { id: 'rem_1', type: 'follow_up', title: 'Follow-up Consultation', patient_name: 'Satadru', phone: '9876543210', date: '2026-06-30', time: '10:00' },
    { id: 'rem_2', type: 'vaccination', title: 'Vaccination Due', patient_name: 'Satadru', phone: '9876543210', date: '2026-06-30', time: '11:00' },
    { id: 'rem_3', type: 'vaccination', title: 'Vaccination Due', patient_name: 'Atri', phone: '9876543211', date: '2026-06-30', time: '12:00' },
    { id: 'rem_4', type: 'report_review', title: 'Report Review: CBC, Blood Sugar', patient_name: 'Satadru', phone: '9876543210', date: '2026-06-26', time: '10:00' }
  ]
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
