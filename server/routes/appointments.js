const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { isMongoConnected, memoryStore } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// Helper to extract authenticated user from Authorization header if present
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// GET /api/appointments - Retrieve appointments with query filters and doctor scoping
router.get('/', async (req, res) => {
  try {
    const { patient_phone, doctor_id, status } = req.query;
    const authUser = getAuthUser(req);

    if (isMongoConnected()) {
      let query = {};

      // If requested by an authenticated doctor, scope STRICTLY to this doctor
      if (authUser && authUser.role === 'doctor') {
        const doc = await Doctor.findOne({ userId: authUser.id }) ||
                    await Doctor.findById(authUser.id).catch(() => null) ||
                    await Doctor.findOne({ email: authUser.email ? authUser.email.toLowerCase() : '' }) ||
                    await Doctor.findOne({ name: authUser.name });
        
        if (doc) {
          const docConditions = [{ doctor_id: doc._id }, { doctor_name: doc.name }];
          if (doc.legacy_id) docConditions.push({ doctor_id: doc.legacy_id });
          query.$or = docConditions;
        } else {
          // If no doctor profile exists yet for this user, query by doctor name
          query.doctor_name = authUser.name;
        }
      } else if (doctor_id) {
        query.doctor_id = doctor_id;
      }

      if (patient_phone) {
        query.patient_phone = new RegExp(patient_phone.trim(), 'i');
      }
      if (status && status !== 'All') {
        query.status = status;
      }

      const appointments = await Appointment.find(query).sort({ created_at: -1 });
      const mapped = appointments.map(a => ({
        ...a.toObject(),
        id: a.legacy_id || a._id.toString()
      }));
      return res.json(mapped);

    } else {
      let results = [...memoryStore.appointments];

      // If requested by an authenticated doctor, scope to this doctor
      if (authUser && authUser.role === 'doctor') {
        const doc = memoryStore.doctors.find(d => 
          d.userId === authUser.id || 
          d.email === authUser.email || 
          d.name === authUser.name
        );
        if (doc) {
          results = results.filter(a => 
            (doc._id && a.doctor_id == doc._id) ||
            (doc.id && a.doctor_id == doc.id) ||
            (a.doctor_name && a.doctor_name.toLowerCase() === doc.name.toLowerCase())
          );
        } else {
          results = results.filter(a => a.doctor_name && a.doctor_name.toLowerCase() === authUser.name.toLowerCase());
        }
      } else if (doctor_id) {
        results = results.filter(a => a.doctor_id == doctor_id || (a.doctor_id && a.doctor_id.toString() === doctor_id.toString()));
      }

      if (patient_phone) {
        const q = patient_phone.trim().toLowerCase();
        results = results.filter(a => a.patient_phone && a.patient_phone.toLowerCase().includes(q));
      }

      if (status && status !== 'All') {
        results = results.filter(a => a.status === status);
      }

      results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return res.json(results);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve appointments: ' + err.message });
  }
});

// POST /api/appointments - Book a new consultation appointment
router.post('/', async (req, res) => {
  try {
    const {
      doctor_id, patient_name, patient_phone, patient_email,
      patient_age, patient_gender, symptoms, appointment_date,
      appointment_time, requires_payment
    } = req.body;

    if (!doctor_id || !patient_name || !patient_phone || !symptoms || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'Doctor, patient name, phone, symptoms, date, and time slot are required.' });
    }

    let doctorInfo = null;

    if (isMongoConnected()) {
      if (doctor_id.toString().match(/^[0-9a-fA-F]{24}$/)) {
        doctorInfo = await Doctor.findById(doctor_id);
      }
      if (!doctorInfo && !isNaN(doctor_id)) {
        doctorInfo = await Doctor.findOne({ legacy_id: parseInt(doctor_id) });
      }
      if (!doctorInfo) {
        doctorInfo = await Doctor.findOne();
      }
    } else {
      doctorInfo = memoryStore.doctors.find(d => d._id === doctor_id || d.id == doctor_id) || memoryStore.doctors[0];
    }

    if (!doctorInfo) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const appointmentRecord = {
      doctor_id: doctorInfo._id || doctorInfo.id,
      doctor_name: doctorInfo.name,
      doctor_specialty: doctorInfo.specialty,
      doctor_fee: doctorInfo.fee,
      doctor_location: `${doctorInfo.location}, ${doctorInfo.city}`,
      clinic_name: doctorInfo.clinic_name || 'MediNexa Clinic',
      patient_name: patient_name.trim(),
      patient_phone: patient_phone.trim(),
      patient_email: patient_email ? patient_email.trim() : '',
      patient_age: patient_age ? parseInt(patient_age) : null,
      patient_gender: patient_gender || 'Not specified',
      symptoms: symptoms.trim(),
      appointment_date,
      appointment_time,
      status: requires_payment ? 'Pending Payment' : 'Confirmed',
      payment_status: requires_payment ? 'pending' : 'verified',
      doctor_notes: '',
      created_at: new Date()
    };

    if (isMongoConnected()) {
      const apt = new Appointment(appointmentRecord);
      await apt.save();
      return res.status(201).json({ ...apt.toObject(), id: apt._id.toString() });
    } else {
      const newApt = {
        _id: `mem_apt_${Date.now()}`,
        id: memoryStore.appointments.length + 1,
        ...appointmentRecord
      };
      memoryStore.appointments.push(newApt);
      return res.status(201).json(newApt);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to book appointment: ' + err.message });
  }
});

// PATCH /api/appointments/:id/status - Update appointment status or attach doctor notes
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, doctor_notes } = req.body;

    if (isMongoConnected()) {
      let updateFields = {};
      if (status) updateFields.status = status;
      if (doctor_notes !== undefined) updateFields.doctor_notes = doctor_notes;

      let apt = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        apt = await Appointment.findByIdAndUpdate(id, updateFields, { new: true });
      }
      if (!apt && !isNaN(id)) {
        apt = await Appointment.findOneAndUpdate({ legacy_id: parseInt(id) }, updateFields, { new: true });
      }

      if (!apt) return res.status(404).json({ error: 'Appointment not found' });
      return res.json({ ...apt.toObject(), id: apt.legacy_id || apt._id.toString() });

    } else {
      const apt = memoryStore.appointments.find(a => a._id === id || a.id == id || a.legacy_id == id);
      if (!apt) return res.status(404).json({ error: 'Appointment not found' });

      if (status) apt.status = status;
      if (doctor_notes !== undefined) apt.doctor_notes = doctor_notes;

      return res.json(apt);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appointment: ' + err.message });
  }
});

module.exports = router;
