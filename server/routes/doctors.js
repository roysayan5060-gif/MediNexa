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

module.exports = router;
