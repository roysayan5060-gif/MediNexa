const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const { isMongoConnected, memoryStore, sqliteDb } = require('../db');

// Map common symptoms & keywords to medical specialties
const SPECIALTY_RULES = [
  {
    specialty: 'Cardiology',
    keywords: ['chest pain', 'chest tightness', 'heart', 'heartbeat', 'palpitation', 'shortness of breath', 'high blood pressure', 'hypertension', 'angina', 'cardiac', 'pulse', 'cholesterol']
  },
  {
    specialty: 'Dermatology',
    keywords: ['skin', 'rash', 'itching', 'itchy', 'acne', 'pimple', 'eczema', 'psoriasis', 'mole', 'allergy on skin', 'spots', 'dry skin', 'hair fall', 'scalp', 'dandruff']
  },
  {
    specialty: 'Neurology',
    keywords: ['headache', 'migraine', 'dizziness', 'vertigo', 'seizure', 'fainting', 'numbness', 'tingling', 'tremor', 'nerve', 'paralysis', 'brain', 'memory loss', 'confusion']
  },
  {
    specialty: 'Orthopedics',
    keywords: ['joint', 'bone', 'knee pain', 'back pain', 'spine', 'shoulder', 'fracture', 'sprain', 'arthritis', 'swollen foot', 'neck pain', 'ligament', 'stiff muscles', 'walking difficulty']
  },
  {
    specialty: 'Pediatrics',
    keywords: ['baby', 'child', 'infant', 'toddler', 'vaccine', 'pediatric', 'kids fever', 'growth issue', 'crying infant']
  },
  {
    specialty: 'Psychiatry & Mental Health',
    keywords: ['anxiety', 'panic', 'depression', 'depressed', 'insomnia', 'cannot sleep', 'stress', 'mood', 'mental', 'nervousness', 'bipolar', 'hallucination', 'phobia']
  },
  {
    specialty: 'ENT & Otolaryngology',
    keywords: ['ear', 'throat', 'tonsil', 'hearing', 'tinnitus', 'sinus', 'stuffy nose', 'runny nose', 'ear ache', 'sore throat', 'voice lost', 'hoarseness', 'smell loss']
  },
  {
    specialty: 'General Medicine',
    keywords: ['fever', 'cold', 'cough', 'flu', 'weakness', 'fatigue', 'vomiting', 'nausea', 'stomach ache', 'diarrhea', 'infection', 'body ache', 'chills', 'food poisoning', 'unwell', 'sick']
  }
];

// POST /api/recommend - Analyze patient text
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Please enter your symptoms or health issue.' });
    }

    const cleanQuery = query.toLowerCase();
    const matchedScores = {};

    SPECIALTY_RULES.forEach(rule => {
      let score = 0;
      rule.keywords.forEach(kw => {
        if (cleanQuery.includes(kw)) {
          score += kw.split(' ').length > 1 ? 3 : 1; // multi-word matches carry higher weight
        }
      });
      if (score > 0) {
        matchedScores[rule.specialty] = score;
      }
    });

    const sortedSpecialties = Object.entries(matchedScores)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    let targetSpecialty = sortedSpecialties[0] || 'General Medicine';
    let isFallback = sortedSpecialties.length === 0;

    let matchedDoctors = [];

    if (isMongoConnected()) {
      matchedDoctors = await Doctor.find({
        specialty: new RegExp(targetSpecialty, 'i')
      }).sort({ rating: -1, fee: 1 });

      if (matchedDoctors.length === 0) {
        matchedDoctors = await Doctor.find().sort({ rating: -1 }).limit(4);
      }
      matchedDoctors = matchedDoctors.map(d => ({ ...d.toObject(), id: d.legacy_id || d._id.toString() }));
    } else {
      matchedDoctors = memoryStore.doctors.filter(d => 
        d.specialty && d.specialty.toLowerCase().includes(targetSpecialty.toLowerCase())
      );
      if (matchedDoctors.length === 0) {
        matchedDoctors = [...memoryStore.doctors].sort((a, b) => b.rating - a.rating).slice(0, 4);
      }
    }

    return res.json({
      detected_issue: query,
      recommended_specialty: targetSpecialty,
      other_possible_specialties: sortedSpecialties.slice(1),
      is_fallback: isFallback,
      explanation: isFallback 
        ? `Based on your description, we recommend starting with a General Physician for a primary clinical evaluation.`
        : `Based on your symptoms ("${query}"), our triage engine recommends consulting a specialist in ${targetSpecialty}.`,
      doctors: matchedDoctors
    });

  } catch (err) {
    res.status(500).json({ error: 'Recommendation analysis error: ' + err.message });
  }
});

module.exports = router;
