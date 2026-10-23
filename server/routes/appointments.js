const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/appointments - Retrieve appointments (filter by doctor_id, patient_phone, or all)
router.get('/', (req, res) => {
  const { doctor_id, patient_phone } = req.query;

  let sql = `
    SELECT 
      a.*,
      d.name as doctor_name,
      d.specialty as doctor_specialty,
      d.clinic_name,
      d.location as doctor_location,
      d.city as doctor_city,
      d.fee as doctor_fee,
      d.phone as doctor_phone
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
  `;

  let conditions = [];
  let params = [];

  if (doctor_id) {
    conditions.push("a.doctor_id = ?");
    params.push(doctor_id);
  }

  if (patient_phone) {
    conditions.push("a.patient_phone LIKE ?");
    params.push(`%${patient_phone}%`);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY a.id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/appointments - Book new appointment
router.post('/', (req, res) => {
  const {
    doctor_id, patient_name, patient_phone, patient_email,
    patient_age, patient_gender, symptoms, appointment_date, appointment_time
  } = req.body;

  if (!doctor_id || !patient_name || !patient_phone || !symptoms || !appointment_date || !appointment_time) {
    return res.status(400).json({
      error: 'Missing required appointment details (doctor, patient name, phone, symptoms, date, time).'
    });
  }

  const sql = `
    INSERT INTO appointments (
      doctor_id, patient_name, patient_phone, patient_email,
      patient_age, patient_gender, symptoms, appointment_date, appointment_time, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed')
  `;

  const params = [
    doctor_id, patient_name, patient_phone, patient_email || '',
    patient_age ? Number(patient_age) : null, patient_gender || 'Other',
    symptoms, appointment_date, appointment_time
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const appointmentId = this.lastID;

    // Fetch full appointment object with doctor info
    db.get(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty, d.fee as doctor_fee, d.location as doctor_location
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?
    `, [appointmentId], (fetchErr, row) => {
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });
      res.status(201).json(row);
    });
  });
});

// PATCH /api/appointments/:id/status - Update appointment status or notes (Doctor Portal side)
router.patch('/:id/status', (req, res) => {
  const { status, doctor_notes } = req.body;

  const sql = `
    UPDATE appointments SET
      status = COALESCE(?, status),
      doctor_notes = COALESCE(?, doctor_notes)
    WHERE id = ?
  `;

  db.run(sql, [status, doctor_notes, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment updated successfully.' });
  });
});

module.exports = router;
