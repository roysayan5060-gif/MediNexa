const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { isMongoConnected, memoryStore } = require('../db');

// In-memory prescriptions fallback
if (!memoryStore.prescriptions) memoryStore.prescriptions = [];

// GET /api/prescriptions - Get prescriptions for an appointment or patient
router.get('/', async (req, res) => {
  try {
    const { appointment_id, patient_phone, doctor_id } = req.query;

    if (isMongoConnected()) {
      let query = {};
      if (appointment_id) query.appointment_id = appointment_id;
      if (patient_phone) query.patient_phone = patient_phone;
      if (doctor_id) query.doctor_id = doctor_id;

      const prescriptions = await Prescription.find(query).sort({ created_at: -1 });
      return res.json(prescriptions);
    } else {
      let results = [...memoryStore.prescriptions];
      if (appointment_id) results = results.filter(p => p.appointment_id == appointment_id);
      if (patient_phone) results = results.filter(p => p.patient_phone == patient_phone);
      if (doctor_id) results = results.filter(p => p.doctor_id == doctor_id);
      return res.json(results);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prescriptions - Create & save prescription
router.post('/', async (req, res) => {
  try {
    const {
      appointment_id, doctor_id, doctor_name, doctor_registration_number,
      clinic_name, patient_name, patient_phone, patient_age,
      patient_gender, diagnosis, medicines, general_advice, next_followup_date
    } = req.body;

    if (!appointment_id || !diagnosis || !medicines || medicines.length === 0) {
      return res.status(400).json({ error: 'Appointment ID, diagnosis, and at least one medication are required.' });
    }

    const prescriptionData = {
      appointment_id,
      doctor_id: doctor_id || 'doc_unknown',
      doctor_name: doctor_name || 'Dr. Attending Physician',
      doctor_registration_number: doctor_registration_number || 'WBMC-VERIFIED',
      clinic_name: clinic_name || 'MediNexa Healthcare Center',
      patient_name,
      patient_phone: patient_phone ? patient_phone.replace(/[^0-9]/g, '') : '',
      patient_age,
      patient_gender,
      diagnosis,
      medicines: Array.isArray(medicines) ? medicines : [],
      general_advice: general_advice || '',
      next_followup_date: next_followup_date || '',
      created_at: new Date()
    };

    if (isMongoConnected()) {
      const rx = new Prescription(prescriptionData);
      await rx.save();

      // Update appointment status to Completed and attach summary doctor notes
      await Appointment.findByIdAndUpdate(appointment_id, {
        status: 'Completed',
        doctor_notes: `Diagnosis: ${diagnosis}. Prescribed ${medicines.length} medication(s). Advice: ${general_advice || 'Follow prescription.'}`,
        prescription_id: rx._id
      });

      return res.status(201).json(rx);
    } else {
      const rx = {
        _id: `mem_rx_${Date.now()}`,
        id: memoryStore.prescriptions.length + 1,
        ...prescriptionData
      };
      memoryStore.prescriptions.push(rx);

      // Update appointment in memoryStore
      const apt = memoryStore.appointments.find(a => a._id == appointment_id || a.id == appointment_id || a.legacy_id == appointment_id);
      if (apt) {
        apt.status = 'Completed';
        apt.doctor_notes = `Diagnosis: ${diagnosis}. Prescribed ${medicines.length} medication(s). Advice: ${general_advice || 'Follow prescription.'}`;
        apt.prescription_id = rx._id;
      }

      return res.status(201).json(rx);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to create prescription: ' + err.message });
  }
});

// POST /api/prescriptions/:id/whatsapp-initiated
router.post('/:id/whatsapp-initiated', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected()) {
      await Prescription.findByIdAndUpdate(id, {
        whatsapp_initiated: true,
        whatsapp_initiated_at: new Date()
      });
    } else {
      const rx = memoryStore.prescriptions.find(p => p._id == id || p.id == id);
      if (rx) {
        rx.whatsapp_initiated = true;
        rx.whatsapp_initiated_at = new Date();
      }
    }
    // Explicitly notify that WhatsApp was triggered without claiming final delivery
    res.json({
      success: true,
      delivery_status: 'client_dispatch_initiated',
      message: 'WhatsApp application opened on client device. Final delivery requires doctor to tap Send.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
