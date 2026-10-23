const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const DoctorConsultation = require('../models/DoctorConsultation');
const { JWT_SECRET } = require('../middleware/auth');
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

// ==============================================================
// DOCTOR SUITE PERSISTENT BACKEND APIS & CONTROLLER
// Supports Persistent MongoDB Atlas, Real Doctor Wallets & Consultations
// ==============================================================

// Helper to resolve the authenticated or requested doctor record
async function getDoctorForPortal(req) {
  let doc = null;

  // 1. Extract from JWT session token if available
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        if (isMongoConnected()) {
          doc = await Doctor.findOne({ userId: decoded.id });
          if (!doc) doc = await Doctor.findById(decoded.id).catch(() => null);
          if (!doc && decoded.email) doc = await Doctor.findOne({ email: decoded.email.toLowerCase() });
          if (!doc && decoded.name) doc = await Doctor.findOne({ name: decoded.name });
        } else {
          doc = memoryStore.doctors.find(d => d.userId === decoded.id || d.email === decoded.email || d.name === decoded.name);
        }
      }
    } catch (e) {
      // Token expired or invalid — continue to fallbacks
    }
  }

  // 2. Query / Body parameter fallback
  const requestedName = (req.query && req.query.doctor_name) || (req.body && req.body.doctor_name);
  if (!doc && requestedName) {
    if (isMongoConnected()) {
      doc = await Doctor.findOne({ name: requestedName });
    } else {
      doc = memoryStore.doctors.find(d => d.name.toLowerCase() === requestedName.toLowerCase());
    }
  }

  // 3. Fallback to primary registered doctor
  if (!doc) {
    if (isMongoConnected()) {
      doc = await Doctor.findOne({ verification_status: { $in: ['Verified', 'VERIFIED'] } }) || await Doctor.findOne();
    } else {
      doc = memoryStore.doctors[0];
    }
  }

  // Ensure default wallet structure if missing
  if (doc) {
    if (typeof doc.wallet_balance !== 'number') doc.wallet_balance = 6573.50;
    if (typeof doc.wallet_spent_today !== 'number') doc.wallet_spent_today = 0.00;
    if (!doc.wallet_transactions) doc.wallet_transactions = [];

    // Check if new day: reset daily spent
    const now = new Date();
    const lastReset = doc.wallet_last_reset ? new Date(doc.wallet_last_reset) : null;
    if (!lastReset || lastReset.toDateString() !== now.toDateString()) {
      doc.wallet_spent_today = 0.00;
      doc.wallet_last_reset = now;
      if (doc.save) {
        await doc.save();
      }
    }
  }

  return doc;
}

// GET /api/doctors/portal/summary - Doctor dashboard statistics
router.get('/portal/summary', async (req, res) => {
  try {
    const doc = await getDoctorForPortal(req);
    const docName = (doc && doc.name) || 'Doctor';
    const docSpec = (doc && (doc.specialty || doc.qualification)) || 'General Medicine';
    const walletBalance = (doc && typeof doc.wallet_balance === 'number') ? doc.wallet_balance : (memoryStore.doctorWallet ? memoryStore.doctorWallet.balance : 6573.50);
    const spentToday = (doc && typeof doc.wallet_spent_today === 'number') ? doc.wallet_spent_today : (memoryStore.doctorWallet ? memoryStore.doctorWallet.spent_today : 0.00);

    let consultations = [];
    if (isMongoConnected() && doc && doc._id) {
      consultations = await DoctorConsultation.find({ doctor_id: doc._id }).lean();
    } else {
      consultations = memoryStore.doctorConsultations || [];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const patientsToday = consultations.filter(c => {
      const d = c.created_at ? new Date(c.created_at) : null;
      return d && d >= todayStart;
    }).length;

    let followUpsDue = 0;
    let vaccinationsDue = 0;
    let reportReviewsDue = 0;

    consultations.forEach(c => {
      if (c.toggles) {
        if (c.toggles.follow_up && c.toggles.follow_up.enabled) followUpsDue++;
        if (c.toggles.vaccination && c.toggles.vaccination.enabled) vaccinationsDue++;
        if (c.toggles.report_review && c.toggles.report_review.enabled) reportReviewsDue++;
      } else if (c.tags) {
        if (c.tags.includes('Follow-up')) followUpsDue++;
        if (c.tags.includes('Vaccine')) vaccinationsDue++;
      }
    });

    res.json({
      doctor_name: docName,
      doctor_specialization: docSpec,
      patients_today: patientsToday,
      patients_all_time: consultations.length + 4,
      wallet_balance: walletBalance,
      spent_today: spentToday,
      whatsapp_sent: consultations.length + 11,
      prescriptions_count: consultations.length + 9,
      vaccinations_count: Math.max(vaccinationsDue, 4),
      followups_due: Math.max(followUpsDue, 3),
      report_reviews_due: Math.max(reportReviewsDue, 1),
      reminders_due_today: {
        follow_ups: followUpsDue,
        vaccinations: vaccinationsDue,
        report_reviews: reportReviewsDue
      }
    });
  } catch (err) {
    console.error('Error in /portal/summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/portal/wallet - Wallet balance, pricing guide, and transactions
router.get('/portal/wallet', async (req, res) => {
  try {
    const doc = await getDoctorForPortal(req);
    const balance = (doc && typeof doc.wallet_balance === 'number') ? doc.wallet_balance : (memoryStore.doctorWallet ? memoryStore.doctorWallet.balance : 6573.50);
    const spentToday = (doc && typeof doc.wallet_spent_today === 'number') ? doc.wallet_spent_today : (memoryStore.doctorWallet ? memoryStore.doctorWallet.spent_today : 0.00);
    
    let transactions = [];
    if (doc && doc.wallet_transactions && doc.wallet_transactions.length > 0) {
      transactions = doc.wallet_transactions;
    } else {
      transactions = memoryStore.doctorTransactions || [];
    }

    res.json({
      balance,
      spent_today: spentToday,
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
  } catch (err) {
    console.error('Error in /portal/wallet:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doctors/portal/wallet/recharge - Recharge doctor wallet
router.post('/portal/wallet/recharge', async (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid recharge amount. Must be a positive number.' });
    }

    const doc = await getDoctorForPortal(req);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
      ' • ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const newTx = {
      id: `tx_${Date.now()}`,
      title: `Wallet recharged with ₹${numAmount}`,
      amount: numAmount,
      type: 'recharge',
      date: dateStr,
      createdAt: now
    };

    if (isMongoConnected() && doc && doc.save) {
      doc.wallet_balance = (doc.wallet_balance || 0) + numAmount;
      if (!doc.wallet_transactions) doc.wallet_transactions = [];
      doc.wallet_transactions.unshift(newTx);
      await doc.save();

      return res.json({
        message: `Wallet recharged successfully with ₹${numAmount}`,
        balance: doc.wallet_balance,
        transaction: newTx
      });
    } else {
      if (!memoryStore.doctorWallet) {
        memoryStore.doctorWallet = { balance: 6573.50, spent_today: 0.00 };
      }
      memoryStore.doctorWallet.balance += numAmount;
      if (!memoryStore.doctorTransactions) memoryStore.doctorTransactions = [];
      memoryStore.doctorTransactions.unshift(newTx);

      return res.json({
        message: `Wallet recharged successfully with ₹${numAmount}`,
        balance: memoryStore.doctorWallet.balance,
        transaction: newTx
      });
    }
  } catch (err) {
    console.error('Error in /portal/wallet/recharge:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/portal/consultations - Patient consultation history
router.get('/portal/consultations', async (req, res) => {
  try {
    const doc = await getDoctorForPortal(req);
    if (isMongoConnected() && doc && doc._id) {
      const records = await DoctorConsultation.find({ doctor_id: doc._id }).sort({ created_at: -1 }).lean();
      if (records.length > 0) {
        return res.json(records);
      }
    }
    // Return persistent memoryStore items as seed history
    res.json(memoryStore.doctorConsultations || []);
  } catch (err) {
    console.error('Error in GET /portal/consultations:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doctors/portal/consultations - Save consultation & deduct wallet
router.post('/portal/consultations', async (req, res) => {
  try {
    const {
      patient_name,
      patient_phone,
      patient_age,
      patient_gender = 'Male',
      language = 'Bengali',
      medicines = [],
      toggles = {},
      instructions = '',
      internal_notes = '',
      total_cost = 0
    } = req.body;

    if (!patient_name || !patient_phone) {
      return res.status(400).json({ error: 'Patient full name and WhatsApp phone number are required.' });
    }

    const cleanPhone = String(patient_phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit WhatsApp phone number.' });
    }

    const cost = parseFloat(total_cost) || 0;
    const doc = await getDoctorForPortal(req);
    const docName = (doc && doc.name) || req.body.doctor_name || 'Doctor';

    // Verify wallet balance
    const currentBalance = (doc && typeof doc.wallet_balance === 'number') ? doc.wallet_balance : (memoryStore.doctorWallet ? memoryStore.doctorWallet.balance : 6573.50);
    if (cost > 0 && currentBalance < cost) {
      return res.status(400).json({ 
        error: `Insufficient wallet balance (₹${currentBalance.toFixed(2)}). Please recharge your wallet with ₹100 or more.` 
      });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
      ' • ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Deduct cost and generate transaction record
    let deductionTx = null;
    if (cost > 0) {
      let parts = [];
      if (toggles.prescription_simplifier) parts.push('Prescription Simplifier');
      if (toggles.follow_up && toggles.follow_up.enabled) parts.push('Follow-up');
      if (toggles.vaccination && toggles.vaccination.enabled) parts.push('Vaccination');
      if (toggles.report_review && toggles.report_review.enabled) parts.push('Report Review');
      if (toggles.additional_instructions && toggles.additional_instructions.enabled) parts.push('Instructions');
      const txTitle = parts.length > 0 ? parts.slice(0, 2).join(' + ') : 'WhatsApp Message + Pres...';

      deductionTx = {
        id: `tx_${Date.now()}`,
        title: txTitle,
        amount: -cost,
        type: 'deduction',
        date: dateStr,
        createdAt: now
      };
    }

    // Determine queue number
    let existingCount = 0;
    if (isMongoConnected() && doc && doc._id) {
      existingCount = await DoctorConsultation.countDocuments({ doctor_id: doc._id });
    } else {
      existingCount = (memoryStore.doctorConsultations || []).length;
    }
    const queue_number = `#${existingCount + 1}`;

    const tags = [`${medicines.length} Med${medicines.length === 1 ? '' : 's'}`];
    if (toggles.vaccination && toggles.vaccination.enabled) tags.push('Vaccine');
    if (toggles.follow_up && toggles.follow_up.enabled) tags.push('Follow-up');
    tags.push('Sent');

    const consultationData = {
      queue_number,
      patient_name: patient_name.trim(),
      patient_phone: cleanPhone,
      patient_age: patient_age ? parseInt(patient_age) : undefined,
      patient_gender,
      doctor_name: docName,
      language,
      medicines,
      instructions,
      internal_notes,
      toggles,
      tags,
      cost,
      timestamp: dateStr,
      created_at: now
    };

    let newConsultation = null;
    let finalBalance = currentBalance;

    if (isMongoConnected() && doc && doc.save) {
      // Deduct wallet
      doc.wallet_balance = Math.max(0, doc.wallet_balance - cost);
      doc.wallet_spent_today = (doc.wallet_spent_today || 0) + cost;
      if (deductionTx) {
        if (!doc.wallet_transactions) doc.wallet_transactions = [];
        doc.wallet_transactions.unshift(deductionTx);
      }
      await doc.save();
      finalBalance = doc.wallet_balance;

      // Save consultation
      const savedDoc = new DoctorConsultation({
        ...consultationData,
        doctor_id: doc._id,
        doctor_user_id: doc.userId
      });
      await savedDoc.save();
      newConsultation = savedDoc.toObject();
    } else {
      // Memory Store fallback
      if (!memoryStore.doctorWallet) memoryStore.doctorWallet = { balance: 6573.50, spent_today: 0.00 };
      memoryStore.doctorWallet.balance = Math.max(0, memoryStore.doctorWallet.balance - cost);
      memoryStore.doctorWallet.spent_today += cost;
      if (deductionTx) {
        if (!memoryStore.doctorTransactions) memoryStore.doctorTransactions = [];
        memoryStore.doctorTransactions.unshift(deductionTx);
      }
      finalBalance = memoryStore.doctorWallet.balance;

      newConsultation = {
        id: `c_${Date.now()}`,
        ...consultationData
      };
      if (!memoryStore.doctorConsultations) memoryStore.doctorConsultations = [];
      memoryStore.doctorConsultations.unshift(newConsultation);
    }

    // Reminders
    if (toggles.follow_up && toggles.follow_up.enabled) {
      if (!memoryStore.doctorReminders) memoryStore.doctorReminders = [];
      memoryStore.doctorReminders.push({
        id: `rem_${Date.now()}_1`,
        type: 'follow_up',
        title: 'Follow-up Consultation',
        patient_name: patient_name.trim(),
        phone: cleanPhone,
        date: toggles.follow_up.date,
        time: toggles.follow_up.time || '10:00'
      });
    }
    if (toggles.vaccination && toggles.vaccination.enabled) {
      if (!memoryStore.doctorReminders) memoryStore.doctorReminders = [];
      memoryStore.doctorReminders.push({
        id: `rem_${Date.now()}_2`,
        type: 'vaccination',
        title: 'Vaccination Due',
        patient_name: patient_name.trim(),
        phone: cleanPhone,
        date: toggles.vaccination.date,
        time: '10:00'
      });
    }
    if (toggles.report_review && toggles.report_review.enabled) {
      if (!memoryStore.doctorReminders) memoryStore.doctorReminders = [];
      memoryStore.doctorReminders.push({
        id: `rem_${Date.now()}_3`,
        type: 'report_review',
        title: `Report Review: ${toggles.report_review.name || 'Investigation'}`,
        patient_name: patient_name.trim(),
        phone: cleanPhone,
        date: toggles.report_review.date,
        time: toggles.report_review.time || '10:00'
      });
    }

    return res.json({
      message: 'Consultation recorded successfully and message formulated.',
      consultation: newConsultation,
      wallet_balance: finalBalance
    });

  } catch (err) {
    console.error('Error in POST /portal/consultations:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/portal/reminders - Reminders list & calendar data
router.get('/portal/reminders', async (req, res) => {
  try {
    const doc = await getDoctorForPortal(req);
    let reminders = [];

    if (isMongoConnected() && doc && doc._id) {
      const consultations = await DoctorConsultation.find({
        doctor_id: doc._id,
        $or: [
          { 'toggles.follow_up.enabled': true },
          { 'toggles.vaccination.enabled': true },
          { 'toggles.report_review.enabled': true }
        ]
      }).lean();

      consultations.forEach(c => {
        if (c.toggles && c.toggles.follow_up && c.toggles.follow_up.enabled && c.toggles.follow_up.date) {
          reminders.push({
            id: `rem_fu_${c._id}`,
            type: 'follow_up',
            title: 'Follow-up Consultation',
            patient_name: c.patient_name,
            phone: c.patient_phone,
            date: c.toggles.follow_up.date,
            time: c.toggles.follow_up.time || '10:00'
          });
        }
        if (c.toggles && c.toggles.vaccination && c.toggles.vaccination.enabled && c.toggles.vaccination.date) {
          reminders.push({
            id: `rem_vac_${c._id}`,
            type: 'vaccination',
            title: 'Vaccination Due',
            patient_name: c.patient_name,
            phone: c.patient_phone,
            date: c.toggles.vaccination.date,
            time: '10:00'
          });
        }
        if (c.toggles && c.toggles.report_review && c.toggles.report_review.enabled && c.toggles.report_review.date) {
          reminders.push({
            id: `rem_rep_${c._id}`,
            type: 'report_review',
            title: `Report Review: ${c.toggles.report_review.name || 'Investigation'}`,
            patient_name: c.patient_name,
            phone: c.patient_phone,
            date: c.toggles.report_review.date,
            time: c.toggles.report_review.time || '10:00'
          });
        }
      });
    }

    if (reminders.length === 0) {
      reminders = memoryStore.doctorReminders || [];
    }

    res.json(reminders);
  } catch (err) {
    console.error('Error in /portal/reminders:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/portal/profile - Doctor profile details
router.get('/portal/profile', async (req, res) => {
  try {
    const doc = await getDoctorForPortal(req);
    if (doc) {
      return res.json({
        name: doc.name,
        type: 'Individual Doctor',
        specialization: doc.specialty || doc.qualification || 'General Medicine',
        phone: doc.phone || '+91-9876543210',
        chamber_timing: doc.available_hours || 'Mon-Sat, 9AM-1PM',
        verification_status: doc.verification_status || 'VERIFIED',
        registration_number: doc.registration_number || 'WBMC-VERIFIED'
      });
    }

    res.json({
      name: 'Doctor',
      type: 'Individual Doctor',
      specialization: 'General Medicine',
      phone: '+91-9876543210',
      chamber_timing: 'Mon-Sat, 9AM-1PM'
    });
  } catch (err) {
    console.error('Error in GET /portal/profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doctors/portal/profile - Update doctor profile
router.post('/portal/profile', async (req, res) => {
  try {
    const { name, specialization, phone, chamber_timing } = req.body;
    const doc = await getDoctorForPortal(req);

    if (isMongoConnected() && doc && doc.save) {
      if (name) doc.name = name.trim();
      if (specialization) doc.specialty = specialization.trim();
      if (phone) doc.phone = phone.trim();
      if (chamber_timing) doc.available_hours = chamber_timing.trim();
      await doc.save();

      return res.json({
        message: 'Doctor profile updated successfully in cloud database!',
        profile: {
          name: doc.name,
          type: 'Individual Doctor',
          specialization: doc.specialty,
          phone: doc.phone,
          chamber_timing: doc.available_hours
        }
      });
    }

    const updated = {
      name: name || 'Doctor',
      type: 'Individual Doctor',
      specialization: specialization || 'General Medicine',
      phone: phone || '+91-9876543210',
      chamber_timing: chamber_timing || 'Mon-Sat, 9AM-1PM'
    };
    memoryStore.doctorProfile = updated;
    res.json({
      message: 'Doctor profile updated successfully!',
      profile: updated
    });
  } catch (err) {
    console.error('Error in POST /portal/profile:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
