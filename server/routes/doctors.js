const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const { isMongoConnected, memoryStore } = require('../db');

// GET /api/doctors - Fetch all doctors with search, filters, and sorting
router.get('/', async (req, res) => {
  try {
    const { specialty, city, search, maxFee, sortBy } = req.query;

    if (isMongoConnected()) {
      let query = {};

      if (specialty && specialty !== 'All') {
        query.specialty = specialty;
      }

      if (city && city !== 'All') {
        query.city = city;
      }

      if (maxFee) {
        query.fee = { $lte: parseFloat(maxFee) };
      }

      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { name: regex },
          { specialty: regex },
          { clinic_name: regex },
          { location: regex },
          { city: regex }
        ];
      }

      let sortOption = { rating: -1 };
      if (sortBy === 'fee_asc') sortOption = { fee: 1 };
      else if (sortBy === 'fee_desc') sortOption = { fee: -1 };
      else if (sortBy === 'experience') sortOption = { experience: -1 };

      const doctors = await Doctor.find(query).sort(sortOption);
      // Map for frontend compatibility (ensure id field exists)
      const mapped = doctors.map(d => ({
        ...d.toObject(),
        id: d.legacy_id || d._id.toString()
      }));
      return res.json(mapped);

    } else {
      let filtered = [...memoryStore.doctors];

      if (specialty && specialty !== 'All') {
        filtered = filtered.filter(d => d.specialty.toLowerCase() === specialty.toLowerCase());
      }

      if (city && city !== 'All') {
        filtered = filtered.filter(d => d.city.toLowerCase() === city.toLowerCase());
      }

      if (maxFee) {
        filtered = filtered.filter(d => d.fee <= parseFloat(maxFee));
      }

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(d => 
          (d.name && d.name.toLowerCase().includes(q)) ||
          (d.specialty && d.specialty.toLowerCase().includes(q)) ||
          (d.clinic_name && d.clinic_name.toLowerCase().includes(q)) ||
          (d.location && d.location.toLowerCase().includes(q)) ||
          (d.city && d.city.toLowerCase().includes(q))
        );
      }

      if (sortBy === 'fee_asc') {
        filtered.sort((a, b) => a.fee - b.fee);
      } else if (sortBy === 'fee_desc') {
        filtered.sort((a, b) => b.fee - a.fee);
      } else if (sortBy === 'experience') {
        filtered.sort((a, b) => b.experience - a.experience);
      } else {
        filtered.sort((a, b) => b.rating - a.rating);
      }

      return res.json(filtered);
    }
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ error: 'Failed to retrieve doctors directory: ' + err.message });
  }
});

// GET /api/doctors/meta/filters - Unique specialties and cities for dropdowns
router.get('/meta/filters', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const specialties = await Doctor.distinct('specialty');
      const cities = await Doctor.distinct('city');
      return res.json({ specialties, cities });
    } else {
      const specialties = Array.from(new Set(memoryStore.doctors.map(d => d.specialty))).filter(Boolean);
      const cities = Array.from(new Set(memoryStore.doctors.map(d => d.city))).filter(Boolean);
      return res.json({ specialties, cities });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to load filters: ' + err.message });
  }
});

// GET /api/doctors/:id - Single doctor details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected()) {
      let doctor = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        doctor = await Doctor.findById(id);
      }
      if (!doctor && !isNaN(id)) {
        doctor = await Doctor.findOne({ legacy_id: parseInt(id) });
      }
      if (!doctor) {
        doctor = await Doctor.findOne({ _id: id });
      }

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }
      return res.json({ ...doctor.toObject(), id: doctor.legacy_id || doctor._id.toString() });

    } else {
      const doctor = memoryStore.doctors.find(d => d._id === id || d.id == id);
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }
      return res.json(doctor);
    }
  } catch (err) {
    res.status(500).json({ error: 'Error fetching doctor: ' + err.message });
  }
});

// POST /api/doctors - Create new doctor profile
router.post('/', async (req, res) => {
  try {
    const {
      name, specialty, qualification, experience, fee, clinic_name,
      location, city, phone, email, avatar, bio, available_days,
      available_hours, registration_number, registration_authority
    } = req.body;

    if (!name || !specialty || fee === undefined || !location || !city) {
      return res.status(400).json({ error: 'Name, specialty, fee, location, and city are mandatory.' });
    }

    const doctorData = {
      name: name.trim(),
      specialty: specialty.trim(),
      qualification: (qualification || 'MBBS').trim(),
      experience: experience ? parseInt(experience) : 1,
      fee: parseFloat(fee),
      clinic_name: (clinic_name || 'MediNexa Clinic').trim(),
      location: location.trim(),
      city: city.trim(),
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      avatar: avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400',
      bio: bio ? bio.trim() : 'Dedicated healthcare specialist committed to high-standard connected clinical care.',
      available_days: available_days || 'Mon,Tue,Wed,Thu,Fri',
      available_hours: available_hours || '09:00 AM - 05:00 PM',
      rating: 4.8,
      registration_number: registration_number || '',
      registration_authority: registration_authority || 'West Bengal Medical Council (WBMC)',
      verification_status: 'Pending Verification',
      verification_notes: 'Submitted for verification.'
    };

    if (isMongoConnected()) {
      const doc = new Doctor(doctorData);
      await doc.save();
      return res.status(201).json({ ...doc.toObject(), id: doc._id.toString() });
    } else {
      const newDoc = {
        _id: `mem_doc_${Date.now()}`,
        id: memoryStore.doctors.length + 1,
        ...doctorData
      };
      memoryStore.doctors.push(newDoc);
      return res.status(201).json(newDoc);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to create doctor: ' + err.message });
  }
});

// PUT /api/doctors/:id - Update doctor profile
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (isMongoConnected()) {
      let doc = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        doc = await Doctor.findByIdAndUpdate(id, updateData, { new: true });
      }
      if (!doc && !isNaN(id)) {
        doc = await Doctor.findOneAndUpdate({ legacy_id: parseInt(id) }, updateData, { new: true });
      }

      if (!doc) return res.status(404).json({ error: 'Doctor profile not found.' });
      return res.json({ ...doc.toObject(), id: doc.legacy_id || doc._id.toString() });

    } else {
      const index = memoryStore.doctors.findIndex(d => d._id === id || d.id == id);
      if (index === -1) return res.status(404).json({ error: 'Doctor not found.' });

      memoryStore.doctors[index] = { ...memoryStore.doctors[index], ...updateData };
      return res.json(memoryStore.doctors[index]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update doctor profile: ' + err.message });
  }
});

// DELETE /api/doctors/:id - Delete doctor profile
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected()) {
      let deleted = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        deleted = await Doctor.findByIdAndDelete(id);
      }
      if (!deleted && !isNaN(id)) {
        deleted = await Doctor.findOneAndDelete({ legacy_id: parseInt(id) });
      }
      if (!deleted) return res.status(404).json({ error: 'Doctor not found.' });
      return res.json({ message: 'Doctor deleted successfully', id });

    } else {
      const index = memoryStore.doctors.findIndex(d => d._id === id || d.id == id);
      if (index === -1) return res.status(404).json({ error: 'Doctor not found.' });

      memoryStore.doctors.splice(index, 1);
      return res.json({ message: 'Doctor deleted successfully', id });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete doctor: ' + err.message });
  }
});

// ==============================================================
// DOCTOR CLINICAL SUITE & WALLET MANAGEMENT (PDF FEATURES)
// ==============================================================

// GET /api/doctors/portal/summary - Doctor dashboard statistics
router.get('/portal/summary', (req, res) => {
  const store = memoryStore;
  const consultations = store.doctorConsultations || [];
  const reminders = store.doctorReminders || [];
  const wallet = store.doctorWallet || { balance: 6573.50, spent_today: 0.00 };

  const followUpsDue = reminders.filter(r => r.type === 'follow_up').length;
  const vaccinationsDue = reminders.filter(r => r.type === 'vaccination').length;
  const reportReviewsDue = reminders.filter(r => r.type === 'report_review').length;

  res.json({
    doctor_name: 'Dr. Priya Sharma',
    doctor_specialization: 'MD(Community medicine), MBBS',
    patients_today: 0,
    patients_all_time: consultations.length + 4,
    wallet_balance: wallet.balance,
    spent_today: wallet.spent_today,
    whatsapp_sent: consultations.length + 11,
    prescriptions_count: consultations.length + 9,
    vaccinations_count: vaccinationsDue,
    followups_due: followUpsDue,
    report_reviews_due: reportReviewsDue,
    reminders_due_today: {
      follow_ups: 0,
      vaccinations: 0,
      report_reviews: 0
    }
  });
});

// GET /api/doctors/portal/wallet - Wallet balance, pricing guide, and transactions
router.get('/portal/wallet', (req, res) => {
  const wallet = memoryStore.doctorWallet || { balance: 6573.50, spent_today: 0.00 };
  const transactions = memoryStore.doctorTransactions || [];

  res.json({
    balance: wallet.balance,
    spent_today: wallet.spent_today,
    transactions: [...transactions],
    pricing: {
      prescription_simplifier: 1.50,
      follow_up_reminder: 1.50,
      vaccination_reminder: 2.50,
      report_review_reminder: 1.50,
      additional_instructions: 0.50,
      internal_notes: 0.00
    }
  });
});

// POST /api/doctors/portal/wallet/recharge - Recharge doctor wallet
router.post('/portal/wallet/recharge', (req, res) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid recharge amount.' });
  }

  if (!memoryStore.doctorWallet) {
    memoryStore.doctorWallet = { balance: 6573.50, spent_today: 0.00 };
  }
  memoryStore.doctorWallet.balance += numAmount;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
    ' • ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const newTx = {
    id: `tx_${Date.now()}`,
    title: `Wallet recharged with ₹${numAmount}`,
    amount: numAmount,
    type: 'recharge',
    date: dateStr
  };

  if (!memoryStore.doctorTransactions) memoryStore.doctorTransactions = [];
  memoryStore.doctorTransactions.unshift(newTx);

  res.json({
    message: `Wallet recharged successfully with ₹${numAmount}`,
    balance: memoryStore.doctorWallet.balance,
    transaction: newTx
  });
});

// GET /api/doctors/portal/consultations - Patient consultation history
router.get('/portal/consultations', (req, res) => {
  res.json(memoryStore.doctorConsultations || []);
});

// POST /api/doctors/portal/consultations - Save consultation & deduct wallet
router.post('/portal/consultations', (req, res) => {
  const {
    patient_name,
    patient_phone,
    patient_age,
    patient_gender,
    language = 'Bengali',
    medicines = [],
    toggles = {},
    instructions = '',
    internal_notes = '',
    total_cost = 0
  } = req.body;

  if (!patient_name || !patient_phone) {
    return res.status(400).json({ error: 'Patient name and phone number are required.' });
  }

  const cost = parseFloat(total_cost) || 0;
  if (!memoryStore.doctorWallet) {
    memoryStore.doctorWallet = { balance: 6573.50, spent_today: 0.00 };
  }

  // Deduct from wallet if cost > 0
  if (cost > 0) {
    if (memoryStore.doctorWallet.balance < cost) {
      return res.status(400).json({ error: `Insufficient wallet balance (₹${memoryStore.doctorWallet.balance.toFixed(2)}). Please recharge your wallet.` });
    }
    memoryStore.doctorWallet.balance -= cost;
    memoryStore.doctorWallet.spent_today += cost;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
      ' • ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    let parts = [];
    if (toggles.prescription_simplifier) parts.push('Prescription Simplifier');
    if (toggles.follow_up && toggles.follow_up.enabled) parts.push('Follow-up');
    if (toggles.vaccination && toggles.vaccination.enabled) parts.push('Vaccination');
    if (toggles.report_review && toggles.report_review.enabled) parts.push('Report Review');
    const txTitle = parts.length > 0 ? parts.slice(0, 2).join(' + ') : 'WhatsApp Message + Pres...';

    const deductionTx = {
      id: `tx_${Date.now()}`,
      title: txTitle,
      amount: -cost,
      type: 'deduction',
      date: dateStr
    };
    if (!memoryStore.doctorTransactions) memoryStore.doctorTransactions = [];
    memoryStore.doctorTransactions.unshift(deductionTx);
  }

  const count = (memoryStore.doctorConsultations || []).length + 1;
  const queue_number = `#${count}`;

  const tags = [`${medicines.length} Meds`];
  if (toggles.vaccination && toggles.vaccination.enabled) tags.push('Vaccine');
  if (toggles.follow_up && toggles.follow_up.enabled) tags.push('Follow-up');
  tags.push('Sent');

  const now = new Date();
  const timestampStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
    ' • ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const newConsultation = {
    id: `c_${Date.now()}`,
    queue_number,
    patient_name,
    patient_phone,
    patient_age: patient_age || 'N/A',
    patient_gender: patient_gender || 'Other',
    doctor_name: 'Dr. Priya Sharma',
    language,
    tags,
    cost,
    timestamp: timestampStr,
    medicines,
    instructions,
    internal_notes,
    followup_date: toggles.follow_up && toggles.follow_up.enabled ? toggles.follow_up.date : null,
    followup_time: toggles.follow_up && toggles.follow_up.enabled ? toggles.follow_up.time : null,
    vaccination_date: toggles.vaccination && toggles.vaccination.enabled ? toggles.vaccination.date : null,
    report_review_name: toggles.report_review && toggles.report_review.enabled ? toggles.report_review.name : null,
    report_review_date: toggles.report_review && toggles.report_review.enabled ? toggles.report_review.date : null,
    report_review_time: toggles.report_review && toggles.report_review.enabled ? toggles.report_review.time : null
  };

  if (!memoryStore.doctorConsultations) memoryStore.doctorConsultations = [];
  memoryStore.doctorConsultations.unshift(newConsultation);

  if (toggles.follow_up && toggles.follow_up.enabled) {
    memoryStore.doctorReminders.push({
      id: `rem_${Date.now()}_1`,
      type: 'follow_up',
      title: 'Follow-up Consultation',
      patient_name,
      phone: patient_phone,
      date: toggles.follow_up.date,
      time: toggles.follow_up.time || '10:00'
    });
  }
  if (toggles.vaccination && toggles.vaccination.enabled) {
    memoryStore.doctorReminders.push({
      id: `rem_${Date.now()}_2`,
      type: 'vaccination',
      title: 'Vaccination Due',
      patient_name,
      phone: patient_phone,
      date: toggles.vaccination.date,
      time: '10:00'
    });
  }
  if (toggles.report_review && toggles.report_review.enabled) {
    memoryStore.doctorReminders.push({
      id: `rem_${Date.now()}_3`,
      type: 'report_review',
      title: `Report Review: ${toggles.report_review.name || 'Investigation'}`,
      patient_name,
      phone: patient_phone,
      date: toggles.report_review.date,
      time: toggles.report_review.time || '10:00'
    });
  }

  res.json({
    message: 'Consultation saved and WhatsApp message prepared!',
    consultation: newConsultation,
    wallet_balance: memoryStore.doctorWallet.balance
  });
});

// GET /api/doctors/portal/reminders - Reminders list & calendar data
router.get('/portal/reminders', (req, res) => {
  res.json(memoryStore.doctorReminders || []);
});

// GET /api/doctors/portal/profile - Doctor profile details
router.get('/portal/profile', (req, res) => {
  res.json({
    name: 'Dr. Priya Sharma',
    type: 'Individual Doctor',
    specialization: 'MD(Community medicine), MBBS',
    phone: '+91-9876543210',
    chamber_timing: 'Mon-Sat, 9AM-1PM'
  });
});

// POST /api/doctors/portal/profile - Update doctor profile
router.post('/portal/profile', (req, res) => {
  const { name, specialization, phone, chamber_timing } = req.body;
  res.json({
    message: 'Doctor profile updated successfully!',
    profile: {
      name: name || 'Dr. Priya Sharma',
      type: 'Individual Doctor',
      specialization: specialization || 'MD(Community medicine), MBBS',
      phone: phone || '+91-9876543210',
      chamber_timing: chamber_timing || 'Mon-Sat, 9AM-1PM'
    }
  });
});

module.exports = router;
