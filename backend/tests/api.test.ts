import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { User } from '../src/models/User';
import { Patient } from '../src/models/Patient';
import { Doctor } from '../src/models/Doctor';
import { Appointment } from '../src/models/Appointment';
import { generateId } from '../src/services/idGenerator';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Doctor X Healthcare API Integration Tests', () => {
  let doctorToken: string;
  let patientToken: string;
  let testDoctorId: string;
  let testPatientId: string;

  describe('1. Authentication & RBAC', () => {
    it('should register a new doctor account', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'testdoctor@example.com',
        password: 'Password123!',
        name: 'Dr. Test Physician',
        role: 'doctor',
        specialty: 'Cardiology',
        phone: '1234567890',
        consultationFee: 150,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('doctor');
      doctorToken = res.body.token;
      testDoctorId = res.body.user.doctorId;
    });

    it('should register a new patient account', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'testpatient@example.com',
        password: 'Password123!',
        name: 'Jane Test Patient',
        role: 'patient',
        phone: '9876543210',
        gender: 'female',
        dateOfBirth: '1992-05-10',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('patient');
      patientToken = res.body.token;
      testPatientId = res.body.user.patientId;
    });

    it('should login with registered credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'testdoctor@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'testdoctor@example.com',
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should access /api/auth/me with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('testdoctor@example.com');
      expect(res.body.user.role).toBe('doctor');
    });

    it('should reject unauthenticated request to protected endpoint', async () => {
      const res = await request(app).get('/api/patients');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Patient Management & Privacy', () => {
    let createdPatientDbId: string;

    it('doctor can register a new patient profile', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          firstName: 'Arthur',
          lastName: 'Dent',
          gender: 'male',
          dateOfBirth: '1980-03-11',
          bloodGroup: 'B+',
          phone: '555-4321',
          email: 'arthur.dent@galaxy.com',
          allergies: ['Dust'],
          chronicConditions: ['Anxiety'],
          medicalHistory: 'Mild panic attacks in stressful environments.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patientId).toMatch(/^PAT-/);
      createdPatientDbId = res.body.data._id;
    });

    it('doctor can search patients by query', async () => {
      const res = await request(app)
        .get('/api/patients?search=Arthur')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].firstName).toBe('Arthur');
    });

    it('patient role can only view their own records, not another patient', async () => {
      // Patient trying to access Arthur Dent's profile
      const res = await request(app)
        .get(`/api/patients/${createdPatientDbId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access Denied');
    });
  });

  describe('3. Appointments & Collision Prevention', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    it('patient can book an appointment slot', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          appointmentDate: `${dateStr}T10:00:00.000Z`,
          startTime: '10:00',
          endTime: '10:30',
          reason: 'General Wellness Check',
          type: 'in-person',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointmentId).toMatch(/^APT-/);
    });

    it('should PREVENT booking conflicting appointment for same doctor at same slot (Conflict Prevention)', async () => {
      // Create another patient to book same slot
      const otherPatient = await Patient.create({
        patientId: generateId('PAT'),
        firstName: 'Bob',
        lastName: 'Smith',
        gender: 'male',
        dateOfBirth: new Date('1990-01-01'),
        phone: '1234567899',
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: otherPatient._id.toString(),
          doctorId: testDoctorId,
          appointmentDate: `${dateStr}T10:00:00.000Z`,
          startTime: '10:00',
          endTime: '10:30',
          reason: 'Consultation',
          type: 'in-person',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Conflict Detected');
    });
  });

  describe('4. Prescriptions Builder & Review', () => {
    it('doctor can issue a structured prescription', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          items: [
            {
              medicineName: 'Amoxicillin 500mg',
              dosageStrength: '500 mg',
              route: 'Oral',
              frequency: 'Three Times Daily (TDS)',
              duration: '7 Days',
              quantity: 21,
              foodInstruction: 'After Food',
              specialInstructions: 'Complete the entire course.',
            },
          ],
          diagnosisSummary: 'Acute mild pharyngitis',
          additionalInstructions: 'Warm salt water gargle 3 times daily. Hydrate well.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prescriptionId).toMatch(/^RX-/);
      expect(res.body.data.approvedByName).toBe('Dr. Test Physician');
    });
  });
});
