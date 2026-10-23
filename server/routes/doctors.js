const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/doctors - Fetch all doctors with optional filtering
router.get('/', (req, res) => {
  const { specialty, city, search, maxFee, sortBy } = req.query;
  
  let conditions = [];
  let params = [];

  if (specialty && specialty !== 'All') {
    conditions.push("specialty = ?");
    params.push(specialty);
  }

  if (city && city !== 'All') {
    conditions.push("city = ?");
    params.push(city);
  }

  if (maxFee) {
    conditions.push("fee <= ?");
    params.push(Number(maxFee));
  }

  if (search && search.trim()) {
    conditions.push("(name LIKE ? OR specialty LIKE ? OR clinic_name LIKE ? OR location LIKE ?)");
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  let whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  let orderClause = "ORDER BY rating DESC";
  if (sortBy === 'fee_low') orderClause = "ORDER BY fee ASC";
  if (sortBy === 'fee_high') orderClause = "ORDER BY fee DESC";
  if (sortBy === 'experience') orderClause = "ORDER BY experience DESC";

  const sql = `SELECT * FROM doctors ${whereClause} ${orderClause}`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/doctors/meta/filters - Unique specialties and cities for dropdowns
router.get('/meta/filters', (req, res) => {
  db.all(`SELECT DISTINCT specialty FROM doctors ORDER BY specialty ASC`, [], (err, specs) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(`SELECT DISTINCT city FROM doctors ORDER BY city ASC`, [], (err2, cities) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({
        specialties: specs.map(s => s.specialty),
        cities: cities.map(c => c.city)
      });
    });
  });
});

// GET /api/doctors/:id - Single doctor details
router.get('/:id', (req, res) => {
  db.get(`SELECT * FROM doctors WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Doctor not found' });
    res.json(row);
  });
});

// POST /api/doctors - Create new doctor (Doctor Portal side)
router.post('/', (req, res) => {
  const {
    name, specialty, qualification, experience, fee, clinic_name,
    location, city, phone, email, avatar, bio, available_days, available_hours
  } = req.body;

  if (!name || !specialty || !fee || !location || !city) {
    return res.status(400).json({ error: 'Please provide required fields: Name, Specialty, Fee, Location, City' });
  }

  const defaultAvatar = avatar || `https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80`;

  const sql = `
    INSERT INTO doctors (
      name, specialty, qualification, experience, fee, clinic_name,
      location, city, phone, email, avatar, bio, available_days, available_hours
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    name, specialty, qualification || 'Board Certified',
    Number(experience) || 1, Number(fee), clinic_name || 'Doctor X Clinic',
    location, city, phone || '', email || '',
    defaultAvatar, bio || 'Experienced healthcare specialist at Doctor X.',
    available_days || 'Mon,Tue,Wed,Thu,Fri', available_hours || '09:00 AM - 05:00 PM'
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get(`SELECT * FROM doctors WHERE id = ?`, [this.lastID], (fetchErr, newDoc) => {
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });
      res.status(201).json(newDoc);
    });
  });
});

// PUT /api/doctors/:id - Update existing doctor profile (Doctor Portal side)
router.put('/:id', (req, res) => {
  const {
    name, specialty, qualification, experience, fee, clinic_name,
    location, city, phone, email, avatar, bio, available_days, available_hours
  } = req.body;

  const sql = `
    UPDATE doctors SET
      name = COALESCE(?, name),
      specialty = COALESCE(?, specialty),
      qualification = COALESCE(?, qualification),
      experience = COALESCE(?, experience),
      fee = COALESCE(?, fee),
      clinic_name = COALESCE(?, clinic_name),
      location = COALESCE(?, location),
      city = COALESCE(?, city),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      avatar = COALESCE(?, avatar),
      bio = COALESCE(?, bio),
      available_days = COALESCE(?, available_days),
      available_hours = COALESCE(?, available_hours)
    WHERE id = ?
  `;

  const params = [
    name, specialty, qualification, experience, fee, clinic_name,
    location, city, phone, email, avatar, bio, available_days, available_hours,
    req.params.id
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Doctor not found' });
    db.get(`SELECT * FROM doctors WHERE id = ?`, [req.params.id], (fetchErr, updatedDoc) => {
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });
      res.json(updatedDoc);
    });
  });
});

// DELETE /api/doctors/:id
router.delete('/:id', (req, res) => {
  db.run(`DELETE FROM doctors WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor profile deleted successfully.' });
  });
});

module.exports = router;
