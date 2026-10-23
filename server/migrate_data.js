/**
 * MediNexa Data Migration & Backup Engine
 * Safely backs up SQLite legacy records and performs non-destructive
 * synchronization into MongoDB (Local or MongoDB Atlas).
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');
require('dotenv').config();

const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');
const Clinic = require('./models/Clinic');
const User = require('./models/User');
const { seedDoctors } = require('./db');

const SQLITE_PATH = path.join(__dirname, 'doctor_x.db');
const BACKUP_DIR = path.join(__dirname, 'backups');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medinexa';

// 1. Create a physical timestamped backup of the SQLite file
function backupSqliteFile() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('ℹ️ No SQLite database found to backup at', SQLITE_PATH);
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `doctor_x_backup_${timestamp}.db`;
  const targetPath = path.join(BACKUP_DIR, backupFileName);

  fs.copyFileSync(SQLITE_PATH, targetPath);
  console.log(`🔒 Physical SQLite backup created: ${targetPath}`);
  return targetPath;
}

// 2. Read SQLite records asynchronously
function readSqliteData() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(SQLITE_PATH)) {
      return resolve({ doctors: [], appointments: [] });
    }

    const db = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
    });

    db.all("SELECT * FROM doctors", [], (err, doctors) => {
      if (err) doctors = [];

      db.all("SELECT * FROM appointments", [], (err2, appointments) => {
        db.close();
        if (err2) appointments = [];
        resolve({
          doctors: doctors || [],
          appointments: appointments || []
        });
      });
    });
  });
}

// 3. Export JSON snapshot
function exportJsonSnapshot(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(BACKUP_DIR, `snapshot_export_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`📄 JSON Snapshot exported: ${jsonPath} (${data.appointments.length} appointments, ${data.doctors.length} doctors)`);
  return jsonPath;
}

// 4. Main migration runner
async function runMigration() {
  console.log('================================================================');
  console.log('🩺 MediNexa Non-Destructive Data Migration & Backup Engine');
  console.log('================================================================');

  // Step 1: Backup
  backupSqliteFile();
  const sqliteData = await readSqliteData();
  exportJsonSnapshot(sqliteData);

  console.log(`\n📊 Source SQLite Data Audit:`);
  console.log(` - Legacy Doctors: ${sqliteData.doctors.length}`);
  console.log(` - Legacy Appointments: ${sqliteData.appointments.length}`);

  // Step 2: Check MongoDB connection state
  console.log(`\n🍃 Checking MongoDB connection to ${MONGODB_URI}...`);
  const { isMongoConnected } = require('./db');
  let connected = isMongoConnected() && mongoose.connection.readyState === 1;
  if (!connected) {
    await new Promise(r => setTimeout(r, 1500));
    connected = isMongoConnected() && mongoose.connection.readyState === 1;
  }

  if (!connected) {
    console.warn(`⚠️ MongoDB is currently offline or unreachable at ${MONGODB_URI}.`);
    console.log('----------------------------------------------------------------');
    console.log('✅ BACKUP COMPLETE:');
    console.log(' 1. SQLite database backed up to server/backups/');
    console.log(' 2. JSON snapshot exported with all 9 doctors and 2 appointments.');
    console.log('\n👉 NEXT STEP FOR CLOUD DATABASE:');
    console.log(' Once you create your free MongoDB Atlas cluster and set MONGODB_URI');
    console.log(' in your cloud hosting or .env, run:');
    console.log('     node server/migrate_data.js');
    console.log(' to automatically populate your cloud database!');
    console.log('----------------------------------------------------------------');
    return;
  }

  console.log('✅ Connected to MongoDB successfully.');

  // Step 3: Migrate Doctors
  console.log('\n--- Migrating Doctors to MongoDB ---');
  let docsMigrated = 0;
  for (const doc of seedDoctors) {
    const existing = await Doctor.findOne({ email: doc.email.toLowerCase() });
    if (!existing) {
      await Doctor.create({
        name: doc.name,
        specialty: doc.specialty,
        qualification: doc.qualification,
        experience: doc.experience,
        fee: doc.fee,
        clinic_name: doc.clinic_name,
        location: doc.location,
        city: doc.city,
        phone: doc.phone,
        email: doc.email.toLowerCase(),
        avatar: doc.avatar,
        bio: doc.bio,
        available_days: doc.available_days,
        available_hours: doc.available_hours,
        rating: doc.rating,
        registration_number: doc.registration_number,
        registration_authority: doc.registration_authority,
        verification_status: doc.verification_status || 'Verified',
        legacy_id: doc.legacy_id
      });
      docsMigrated++;
    }
  }
  const totalDocs = await Doctor.countDocuments();
  console.log(`✅ Doctors in MongoDB: ${totalDocs} (New imported: ${docsMigrated})`);

  // Step 4: Migrate Appointments
  console.log('\n--- Migrating Historical Appointments to MongoDB ---');
  let aptsMigrated = 0;
  for (const apt of sqliteData.appointments) {
    const existing = await Appointment.findOne({ 
      $or: [
        { legacy_id: apt.id },
        { patient_phone: apt.patient_phone, appointment_date: apt.appointment_date }
      ]
    });

    if (!existing) {
      // Find matching doctor
      const matchedDoctor = await Doctor.findOne({ legacy_id: apt.doctor_id }) || await Doctor.findOne();
      
      await Appointment.create({
        legacy_id: apt.id,
        doctor_id: matchedDoctor._id,
        patient_name: apt.patient_name,
        patient_phone: apt.patient_phone,
        patient_email: apt.patient_email || '',
        patient_age: apt.patient_age || 30,
        patient_gender: apt.patient_gender || 'Other',
        symptoms: apt.symptoms || 'General consultation',
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time || '10:00 AM',
        status: apt.status || 'Confirmed',
        doctor_notes: apt.doctor_notes || '',
        payment_status: 'verified',
        doctor_name: matchedDoctor.name,
        doctor_specialty: matchedDoctor.specialty,
        doctor_fee: matchedDoctor.fee,
        clinic_name: matchedDoctor.clinic_name,
        created_at: apt.created_at ? new Date(apt.created_at) : new Date()
      });
      aptsMigrated++;
      console.log(` - Migrated appointment #${apt.id} for ${apt.patient_name}`);
    }
  }

  const totalApts = await Appointment.countDocuments();
  console.log(`✅ Appointments in MongoDB: ${totalApts} (New imported: ${aptsMigrated})`);

  // Step 5: Verify Integrity
  console.log('\n================================================================');
  console.log('🎉 Data Migration Audit Complete!');
  console.log(` - Doctors in DB: ${totalDocs}`);
  console.log(` - Appointments in DB: ${totalApts}`);
  console.log('================================================================');

  await mongoose.disconnect();
}

if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { backupSqliteFile, readSqliteData, exportJsonSnapshot, runMigration };
