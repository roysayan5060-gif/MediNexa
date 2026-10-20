import request from 'supertest';
import app from '../src/app';
import { connectDB, disconnectDB } from '../src/config/db';
import { User } from '../src/models/User';
import { Clinic } from '../src/models/Clinic';
import { Doctor } from '../src/models/Doctor';
import { Patient } from '../src/models/Patient';
import { Invoice } from '../src/models/Invoice';
import { ClinicDoctorMembership } from '../src/models/ClinicDoctorMembership';
import { FinancialLedgerEntry } from '../src/models/FinancialLedger';
import { DoctorSettlement } from '../src/models/DoctorSettlement';

describe('Three-Sided Clinic Management & Financial Ledger Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  let clinicToken: string;
  let clinicId: string;
  let doctorToken: string;
  let doctorId: string;
  let patientToken: string;
  let patientId: string;
  let invoiceId: string;
  let invoiceNumber: string;

  test('1. Register a new Clinic account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `greenlife_${Date.now()}@clinic.com`,
        password: 'Clinic@2026',
        name: 'Dr. Anita Roy',
        clinicName: 'Green Life Clinic',
        ownerName: 'Dr. Anita Roy',
        role: 'clinic',
        phone: '+91 9876543210',
        address: '12 Health Crescent, Green Park',
        city: 'New Delhi',
        state: 'Delhi',
        zipCode: '110016',
        defaultDoctorSharePercentage: 70,
        registrationNumber: 'CLINIC-DEL-9921',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    clinicToken = res.body.token;
    clinicId = res.body.user.clinicId;
  });

  test('2. Register a Doctor account associated with the Clinic', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `dr.anand_${Date.now()}@doctorx.com`,
        password: 'Doctor@2026',
        name: 'Dr. Anand Verma',
        role: 'doctor',
        phone: '+91 9123456780',
        specialty: 'Cardiology',
        registrationNumber: 'MED-CAR-77821',
        consultationFee: 800,
        clinicId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    doctorToken = res.body.token;
    doctorId = res.body.user.doctorId;
  });

  test('3. Register a Patient account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `patient_rajesh_${Date.now()}@example.com`,
        password: 'Patient@2026',
        name: 'Rajesh Sharma',
        role: 'patient',
        phone: '+91 9988776655',
        dateOfBirth: '1988-06-15',
        gender: 'male',
        bloodGroup: 'B+',
        privacyConsent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    patientToken = res.body.token;
    patientId = res.body.user.patientId;
  });

  test('4. Clinic Admin configures Doctor schedule (10:00 AM - 1:00 PM) and 70/30 fee split', async () => {
    const res = await request(app)
      .post(`/api/clinics/${clinicId}/doctors`)
      .set('Authorization', `Bearer ${clinicToken}`)
      .send({
        doctorId,
        consultationFee: 800,
        doctorSharePercentage: 70,
        appointmentDurationMinutes: 30,
        workingHours: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30, isAvailable: true },
          { dayOfWeek: 2, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30, isAvailable: true },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.doctorSharePercentage).toBe(70);
    expect(res.body.data.consultationFee).toBe(800);
  });

  test('5. Patient books appointment; Pending Invoice is created with Clinic as recipient', async () => {
    const apptRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        doctorId,
        clinicId,
        appointmentDate: '2026-11-10',
        startTime: '10:30',
        endTime: '11:00',
        reason: 'Cardiac routine checkup',
      });

    expect(apptRes.status).toBe(201);
    expect(apptRes.body.success).toBe(true);
    expect(apptRes.body.data.invoice).toBeDefined();
    invoiceId = apptRes.body.data.invoice._id;
    invoiceNumber = apptRes.body.data.invoice.invoiceNumber;
  });

  test('6. Patient pays consultation fee to the Clinic; Verifies integer paise entry in Financial Ledger', async () => {
    const payRes = await request(app)
      .post(`/api/invoices/${invoiceNumber}/pay`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        paymentMethod: 'upi_test',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.status).toBe('paid');
    expect(payRes.body.data.amountPaise).toBe(80000); // ₹800 = 80,000 paise

    // Verify Financial Ledger Entry was created
    const ledgerEntry = await FinancialLedgerEntry.findOne({
      referenceId: invoiceNumber,
      type: 'patient_payment',
    });

    expect(ledgerEntry).not.toBeNull();
    expect(ledgerEntry?.direction).toBe('credit');
    expect(ledgerEntry?.amountPaise).toBe(80000);
    expect(ledgerEntry?.amountInr).toBe(800);
  });

  test('7. Clinic Admin previews Doctor Settlements; Verifies 70% doctor share (₹560) and 30% clinic retained (₹240)', async () => {
    const previewRes = await request(app)
      .post(`/api/clinics/${clinicId}/settlements/preview`)
      .set('Authorization', `Bearer ${clinicToken}`)
      .send({ doctorId });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);
    expect(previewRes.body.data.length).toBeGreaterThan(0);

    const docGroup = previewRes.body.data[0];
    expect(docGroup.splitPercentage).toBe(70);
    expect(docGroup.doctorShareTotal).toBe(560); // 70% of 800
    expect(docGroup.clinicShareTotal).toBe(240); // 30% of 800
  });

  test('8. Clinic Admin creates and approves Doctor Settlement batch', async () => {
    const batchRes = await request(app)
      .post(`/api/clinics/${clinicId}/settlements/create-batch`)
      .set('Authorization', `Bearer ${clinicToken}`)
      .send({
        doctorId,
        invoiceIds: [invoiceId],
        notes: 'Weekly consultation payout batch',
      });

    expect(batchRes.status).toBe(201);
    expect(batchRes.body.success).toBe(true);
    expect(batchRes.body.data.netPayableInr).toBe(560);
    expect(batchRes.body.data.netPayablePaise).toBe(56000);
    expect(batchRes.body.data.status).toBe('approved');

    const settlementId = batchRes.body.data.settlementId;

    // 9. Clinic Admin marks settlement as PAID with UTR reference
    const payRes = await request(app)
      .post(`/api/clinics/${clinicId}/settlements/${settlementId}/pay`)
      .set('Authorization', `Bearer ${clinicToken}`)
      .send({
        paymentReference: 'UTR-HDFC-991823746',
        paymentMode: 'manual_bank_transfer',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.status).toBe('paid');
    expect(payRes.body.data.paymentReference).toBe('UTR-HDFC-991823746');

    // Verify financial ledger debit entry
    const debitEntry = await FinancialLedgerEntry.findOne({
      referenceId: settlementId,
      type: 'doctor_settlement',
    });

    expect(debitEntry).not.toBeNull();
    expect(debitEntry?.direction).toBe('debit');
    expect(debitEntry?.amountInr).toBe(560);
  });

  test('10. Doctor views their earnings, gross fees, and completed payout with UTR details', async () => {
    const earningsRes = await request(app)
      .get('/api/doctors/earnings')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(earningsRes.status).toBe(200);
    expect(earningsRes.body.success).toBe(true);
    expect(earningsRes.body.data.summary.grossPatientFeesPaid).toBe(800);
    expect(earningsRes.body.data.summary.doctorEarnedTotal).toBe(560);
    expect(earningsRes.body.data.summary.payoutsReceived).toBe(560);
    expect(earningsRes.body.data.settlements.length).toBeGreaterThan(0);
  });
});
