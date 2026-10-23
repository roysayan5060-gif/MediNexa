const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'doctor_x.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

db.serialize(() => {
  // Create Doctors table
  db.run(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      qualification TEXT,
      experience INTEGER DEFAULT 1,
      fee REAL NOT NULL,
      clinic_name TEXT,
      location TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      avatar TEXT,
      bio TEXT,
      available_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri',
      available_hours TEXT DEFAULT '09:00 AM - 05:00 PM',
      rating REAL DEFAULT 4.8,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Appointments table
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      patient_phone TEXT NOT NULL,
      patient_email TEXT,
      patient_age INTEGER,
      patient_gender TEXT,
      symptoms TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'Confirmed',
      doctor_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  // Seed sample doctors if table is empty
  db.get("SELECT COUNT(*) as count FROM doctors", (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      console.log('Seeding initial doctor directory...');
      const seedDoctors = [
        {
          name: "Dr. Alexander Cross",
          specialty: "Cardiology",
          qualification: "MD, DM (Cardiology), FACC",
          experience: 16,
          fee: 80,
          clinic_name: "Metropolis Heart & Vascular Center",
          location: "742 Evergreen Terrace, Suite 300",
          city: "New York",
          phone: "+1 (555) 234-5678",
          email: "alexander.cross@doctorx.health",
          avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
          bio: "Senior Consultant Cardiologist specializing in preventive cardiology, coronary interventions, arrhythmias, and hypertension management.",
          available_days: "Mon,Wed,Fri",
          available_hours: "09:00 AM - 02:00 PM",
          rating: 4.9
        },
        {
          name: "Dr. Elena Rostova",
          specialty: "Dermatology",
          qualification: "MD (Dermatology), Board Certified",
          experience: 11,
          fee: 65,
          clinic_name: "DermaCare Skin & Laser Institute",
          location: "128 Fifth Avenue",
          city: "New York",
          phone: "+1 (555) 345-6789",
          email: "elena.rostova@doctorx.health",
          avatar: "https://images.unsplash.com/photo-1594824813583-162b32f11652?w=400&auto=format&fit=crop&q=80",
          bio: "Specialist in clinical dermatology, skin infections, eczema, psoriasis, acne therapy, and aesthetic treatments.",
          available_days: "Mon,Tue,Thu,Sat",
          available_hours: "10:00 AM - 06:00 PM",
          rating: 4.8
        },
        {
          name: "Dr. Marcus Vance",
          specialty: "Neurology",
          qualification: "MD (Neurology), PhD, FAAN",
          experience: 19,
          fee: 100,
          clinic_name: "NeuroAdvance Clinical Hospital",
          location: "450 Medical Heights Blvd",
          city: "Boston",
          phone: "+1 (555) 456-7890",
          email: "marcus.vance@doctorx.health",
          avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
          bio: "Leading specialist in complex migraines, nerve disorders, epilepsy, dizziness, Parkinson's disease, and stroke rehabilitation.",
          available_days: "Tue,Wed,Thu",
          available_hours: "09:30 AM - 04:30 PM",
          rating: 5.0
        },
        {
          name: "Dr. Sarah Jenkins",
          specialty: "General Medicine",
          qualification: "MBBS, MD (Internal Medicine)",
          experience: 8,
          fee: 45,
          clinic_name: "CityCare Family Clinic",
          location: "89 Greenway Street",
          city: "Chicago",
          phone: "+1 (555) 567-8901",
          email: "sarah.jenkins@doctorx.health",
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
          bio: "Primary care physician focusing on infectious illness, viral fevers, fatigue, diabetes control, and preventive lifestyle healthcare.",
          available_days: "Mon,Tue,Wed,Thu,Fri,Sat",
          available_hours: "08:30 AM - 05:00 PM",
          rating: 4.7
        },
        {
          name: "Dr. David Chen",
          specialty: "Orthopedics",
          qualification: "MS (Orthopedics), MCh, Arthroscopy Fellow",
          experience: 14,
          fee: 75,
          clinic_name: "Apex Bone & Joint Specialty Center",
          location: "310 Pioneer Way",
          city: "San Francisco",
          phone: "+1 (555) 678-9012",
          email: "david.chen@doctorx.health",
          avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80",
          bio: "Expert orthopedic surgeon treating joint pains, sports injuries, ligament tears, spine disorders, and arthritis.",
          available_days: "Mon,Tue,Thu,Fri",
          available_hours: "10:00 AM - 04:00 PM",
          rating: 4.9
        },
        {
          name: "Dr. Maya Patel",
          specialty: "Pediatrics",
          qualification: "MD (Pediatrics), DCH",
          experience: 12,
          fee: 55,
          clinic_name: "Little Stars Children Hospital",
          location: "204 Sunrise Circle",
          city: "Austin",
          phone: "+1 (555) 789-0123",
          email: "maya.patel@doctorx.health",
          avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80",
          bio: "Compassionate pediatrician dedicated to child nutrition, infant development, vaccinations, pediatric allergies, and fever care.",
          available_days: "Mon,Wed,Fri,Sat",
          available_hours: "09:00 AM - 03:00 PM",
          rating: 4.9
        },
        {
          name: "Dr. Robert Sterling",
          specialty: "Psychiatry & Mental Health",
          qualification: "MD (Psychiatry), MRCPsych",
          experience: 15,
          fee: 90,
          clinic_name: "MindWell Wellness Center",
          location: "512 Harmony Square",
          city: "Seattle",
          phone: "+1 (555) 890-1234",
          email: "robert.sterling@doctorx.health",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          bio: "Specialist in anxiety disorders, clinical depression, insomnia, stress management, and cognitive behavioral psychotherapy.",
          available_days: "Tue,Wed,Thu,Sat",
          available_hours: "11:00 AM - 07:00 PM",
          rating: 4.8
        },
        {
          name: "Dr. Olivia Miller",
          specialty: "ENT & Otolaryngology",
          qualification: "MS (ENT), Head & Neck Fellow",
          experience: 9,
          fee: 50,
          clinic_name: "SoundEar & Throat Health",
          location: "67 Oak Ridge Road",
          city: "Denver",
          phone: "+1 (555) 901-2345",
          email: "olivia.miller@doctorx.health",
          avatar: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&auto=format&fit=crop&q=80",
          bio: "Diagnosing and treating chronic sinus, throat pain, voice problems, ear infections, tinnitus, and hearing issues.",
          available_days: "Mon,Tue,Thu,Fri",
          available_hours: "09:00 AM - 04:30 PM",
          rating: 4.7
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO doctors (
          name, specialty, qualification, experience, fee, clinic_name, location, city, phone, email, avatar, bio, available_days, available_hours, rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      seedDoctors.forEach(doc => {
        stmt.run([
          doc.name, doc.specialty, doc.qualification, doc.experience, doc.fee, doc.clinic_name, doc.location, doc.city,
          doc.phone, doc.email, doc.avatar, doc.bio, doc.available_days, doc.available_hours, doc.rating
        ]);
      });
      stmt.finalize();
      console.log('Seeded doctors successfully.');
    }
  });
});

module.exports = db;
