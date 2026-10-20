import { User } from '../models/User';
import { Clinic } from '../models/Clinic';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { Appointment } from '../models/Appointment';
import { ClinicalEncounter } from '../models/ClinicalEncounter';
import { Prescription } from '../models/Prescription';
import { Reminder } from '../models/Reminder';
import { Notification } from '../models/Notification';
import { Invoice } from '../models/Invoice';
import { ClinicDoctorMembership } from '../models/ClinicDoctorMembership';
import { FinancialLedgerEntry } from '../models/FinancialLedger';
import { DoctorSettlement } from '../models/DoctorSettlement';
import { generateId } from '../services/idGenerator';

export const seedInitialData = async (): Promise<void> => {
  try {
    const existingUsersCount = await User.countDocuments();
    if (existingUsersCount > 0) {
      console.log(`[Seed] Database already contains ${existingUsersCount} user(s). Skipping automatic seed.`);
      await ensureClinicMembershipsAndLedger();
      return;
    }

    console.log('[Seed] Fresh database detected. Seeding realistic sample healthcare data...');

    // 1. Clinics
    const clinicApex = await Clinic.create({
      name: 'Apex Multispecialty Hospital & Clinic',
      code: 'APEX-01',
      address: '45 Health Boulevard, Medical Enclave',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      phone: '+1 (555) 234-5678',
      email: 'contact@apexhealth.org',
      consultationFeeDefault: 120,
    });

    const clinicMetro = await Clinic.create({
      name: 'Metro Wellness Center',
      code: 'METRO-02',
      address: '782 Central Avenue',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07302',
      phone: '+1 (555) 876-5432',
      email: 'info@metrowellness.org',
      consultationFeeDefault: 95,
    });

    // 2. Platform Admin
    await User.create({
      email: 'admin@doctorx.com',
      password: 'Admin@2026',
      name: 'Dr. Gregory House (Platform Admin)',
      role: 'platform_admin',
      phone: '+1 (555) 999-0001',
      isActive: true,
    });

    // 3. Clinic Admin
    await User.create({
      email: 'clinic@doctorx.com',
      password: 'Clinic@2026',
      name: 'Claire Temple (Clinic Admin)',
      role: 'clinic_admin',
      phone: '+1 (555) 999-0002',
      clinicId: clinicApex._id,
      isActive: true,
    });

    // 4. Doctors
    // Doctor 1: Dr. Sarah Jenkins (Cardiology)
    const doctorUser1 = await User.create({
      email: 'doctor@doctorx.com',
      password: 'Doctor@2026',
      name: 'Dr. Sarah Jenkins',
      role: 'doctor',
      phone: '+1 (555) 301-4411',
      clinicId: clinicApex._id,
      isActive: true,
    });

    const doctor1 = await Doctor.create({
      doctorId: generateId('DOC'),
      userId: doctorUser1._id,
      name: 'Dr. Sarah Jenkins',
      title: 'Dr.',
      specialty: 'Cardiology',
      qualifications: ['MBBS', 'MD (Cardiology)', 'FACC'],
      registrationNumber: 'MED-CARDIO-88412',
      experienceYears: 14,
      consultationFee: 150,
      bio: 'Board-certified cardiologist specializing in preventive cardiology, hypertension, and cardiovascular health optimization.',
      phone: '+1 (555) 301-4411',
      email: doctorUser1.email,
      clinicId: clinicApex._id,
      rating: 4.9,
      isVerified: true,
      workingHours: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
      ],
    });

    doctorUser1.doctorId = doctor1._id;
    await doctorUser1.save();

    // Doctor 2: Dr. Robert Chen (General Medicine)
    const doctorUser2 = await User.create({
      email: 'dr.robert@doctorx.com',
      password: 'Doctor@2026',
      name: 'Dr. Robert Chen',
      role: 'doctor',
      phone: '+1 (555) 301-4422',
      clinicId: clinicApex._id,
      isActive: true,
    });

    const doctor2 = await Doctor.create({
      doctorId: generateId('DOC'),
      userId: doctorUser2._id,
      name: 'Dr. Robert Chen',
      title: 'Dr.',
      specialty: 'General Medicine',
      qualifications: ['MBBS', 'MRCP', 'Dip. Family Medicine'],
      registrationNumber: 'MED-GEN-55291',
      experienceYears: 9,
      consultationFee: 90,
      bio: 'Compassionate primary care physician dedicated to comprehensive patient-centered chronic disease management and wellness.',
      phone: '+1 (555) 301-4422',
      email: doctorUser2.email,
      clinicId: clinicApex._id,
      rating: 4.8,
      isVerified: true,
      workingHours: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '18:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 3, startTime: '10:00', endTime: '18:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 4, startTime: '10:00', endTime: '18:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 5, startTime: '10:00', endTime: '18:00', slotDurationMinutes: 30, isAvailable: true },
      ],
    });

    doctorUser2.doctorId = doctor2._id;
    await doctorUser2.save();

    // Doctor 3: Dr. Priya Patel (Pediatrics)
    const doctorUser3 = await User.create({
      email: 'dr.priya@doctorx.com',
      password: 'Doctor@2026',
      name: 'Dr. Priya Patel',
      role: 'doctor',
      phone: '+1 (555) 301-4433',
      clinicId: clinicApex._id,
      isActive: true,
    });

    const doctor3 = await Doctor.create({
      doctorId: generateId('DOC'),
      userId: doctorUser3._id,
      name: 'Dr. Priya Patel',
      title: 'Dr.',
      specialty: 'Pediatrics',
      qualifications: ['MBBS', 'MD (Pediatrics)', 'DCH'],
      registrationNumber: 'MED-PED-99120',
      experienceYears: 11,
      consultationFee: 110,
      bio: 'Compassionate pediatric physician focused on child wellness, developmental milestones, and pediatric acute care.',
      phone: '+1 (555) 301-4433',
      email: doctorUser3.email,
      clinicId: clinicApex._id,
      rating: 4.95,
      isVerified: true,
      workingHours: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '16:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '16:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '16:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '16:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '16:00', slotDurationMinutes: 30, isAvailable: true },
      ],
    });

    doctorUser3.doctorId = doctor3._id;
    await doctorUser3.save();

    // 5. Patients
    // Patient 1: Eleanor Vance (Primary patient user for testing)
    const patientUser1 = await User.create({
      email: 'patient@doctorx.com',
      password: 'Patient@2026',
      name: 'Eleanor Vance',
      role: 'patient',
      phone: '+1 (555) 412-8821',
      isActive: true,
    });

    const patient1 = await Patient.create({
      patientId: generateId('PAT'),
      userId: patientUser1._id,
      firstName: 'Eleanor',
      lastName: 'Vance',
      gender: 'female',
      dateOfBirth: new Date('1985-06-14'),
      bloodGroup: 'O+',
      phone: '+1 (555) 412-8821',
      email: 'patient@doctorx.com',
      address: '142 Pine Street, Apt 4B',
      city: 'New York',
      state: 'NY',
      emergencyContact: {
        name: 'Thomas Vance',
        relationship: 'Spouse',
        phone: '+1 (555) 412-8899',
      },
      allergies: ['Penicillin', 'Sulfa drugs'],
      chronicConditions: ['Stage 1 Essential Hypertension', 'Mild Asthma'],
      medicalHistory: 'Diagnosed with hypertension in 2021. Managed on daily low-dose ACE inhibitor. No surgical history.',
      primaryDoctorId: doctor1._id,
      clinicId: clinicApex._id,
      status: 'active',
    });

    patientUser1.patientId = patient1._id;
    await patientUser1.save();

    // Patient 2: John Doe
    const patient2 = await Patient.create({
      patientId: generateId('PAT'),
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      dateOfBirth: new Date('1978-11-23'),
      bloodGroup: 'A+',
      phone: '+1 (555) 678-1234',
      email: 'john.doe@example.com',
      address: '88 Oakridge Lane',
      city: 'New York',
      state: 'NY',
      emergencyContact: {
        name: 'Mary Doe',
        relationship: 'Sister',
        phone: '+1 (555) 678-5678',
      },
      allergies: ['Aspirin'],
      chronicConditions: ['Type 2 Diabetes Mellitus'],
      medicalHistory: 'Type 2 Diabetes diagnosed 2019. Diet and metformin controlled. Regular quarterly HbA1c screening.',
      primaryDoctorId: doctor1._id,
      clinicId: clinicApex._id,
      status: 'active',
    });

    // Patient 3: Anita Sharma
    const patient3 = await Patient.create({
      patientId: generateId('PAT'),
      firstName: 'Anita',
      lastName: 'Sharma',
      gender: 'female',
      dateOfBirth: new Date('1992-03-08'),
      bloodGroup: 'B+',
      phone: '+1 (555) 321-9876',
      email: 'anita.sharma@example.com',
      address: '25 Sunset Blvd',
      city: 'Jersey City',
      state: 'NJ',
      emergencyContact: {
        name: 'Raj Sharma',
        relationship: 'Father',
        phone: '+1 (555) 321-4321',
      },
      allergies: ['Peanuts'],
      chronicConditions: ['Migraine with aura'],
      medicalHistory: 'Occasional episodic migraines triggered by stress. Relieved by triptans.',
      primaryDoctorId: doctor2._id,
      clinicId: clinicApex._id,
      status: 'active',
    });

    // Patient 4: Marcus Webb
    const patient4 = await Patient.create({
      patientId: generateId('PAT'),
      firstName: 'Marcus',
      lastName: 'Webb',
      gender: 'male',
      dateOfBirth: new Date('2001-08-30'),
      bloodGroup: 'AB+',
      phone: '+1 (555) 789-0123',
      email: 'marcus.webb@example.com',
      address: '109 Riverside Drive',
      city: 'New York',
      state: 'NY',
      emergencyContact: {
        name: 'Grace Webb',
        relationship: 'Mother',
        phone: '+1 (555) 789-4567',
      },
      allergies: [],
      chronicConditions: [],
      medicalHistory: 'Annual preventive physical and sports medical clearance.',
      primaryDoctorId: doctor2._id,
      clinicId: clinicApex._id,
      status: 'active',
    });

    // 6. Appointments
    const today = new Date();
    today.setHours(10, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 5);

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 7);

    // Today's appointment 1 (Doctor 1 with Patient 1)
    const apptToday1 = await Appointment.create({
      appointmentId: generateId('APT'),
      patientId: patient1._id,
      doctorId: doctor1._id,
      clinicId: clinicApex._id,
      appointmentDate: today,
      startTime: '10:00',
      endTime: '10:30',
      status: 'confirmed',
      type: 'in-person',
      reason: 'Routine Cardiology Follow-up & BP Evaluation',
      notes: 'Patient reports occasional morning headaches.',
    });

    // Today's appointment 2 (Doctor 1 with Patient 2)
    await Appointment.create({
      appointmentId: generateId('APT'),
      patientId: patient2._id,
      doctorId: doctor1._id,
      clinicId: clinicApex._id,
      appointmentDate: today,
      startTime: '11:30',
      endTime: '12:00',
      status: 'confirmed',
      type: 'in-person',
      reason: 'Cardiovascular Risk Assessment for Diabetic Patient',
    });

    // Upcoming appointment tomorrow
    await Appointment.create({
      appointmentId: generateId('APT'),
      patientId: patient3._id,
      doctorId: doctor1._id,
      clinicId: clinicApex._id,
      appointmentDate: tomorrow,
      startTime: '14:00',
      endTime: '14:30',
      status: 'confirmed',
      type: 'teleconsultation',
      reason: 'Follow-up consultation on recent lipid profile results',
    });

    // Upcoming next week
    await Appointment.create({
      appointmentId: generateId('APT'),
      patientId: patient4._id,
      doctorId: doctor2._id,
      clinicId: clinicApex._id,
      appointmentDate: nextWeek,
      startTime: '10:30',
      endTime: '11:00',
      status: 'confirmed',
      type: 'in-person',
      reason: 'Annual preventive physical',
    });

    // Past completed appointment (Patient 1 with Doctor 1)
    const apptPast = await Appointment.create({
      appointmentId: generateId('APT'),
      patientId: patient1._id,
      doctorId: doctor1._id,
      clinicId: clinicApex._id,
      appointmentDate: pastDate,
      startTime: '09:30',
      endTime: '10:00',
      status: 'completed',
      type: 'in-person',
      reason: 'Initial Blood Pressure Check and Consultation',
    });

    // 7. Clinical Encounter for the past visit
    const encounter = await ClinicalEncounter.create({
      encounterId: generateId('ENC'),
      appointmentId: apptPast._id,
      patientId: patient1._id,
      doctorId: doctor1._id,
      encounterDate: pastDate,
      vitals: {
        bloodPressure: '136/88',
        heartRate: 74,
        temperature: 98.6,
        weightKg: 64,
        heightCm: 165,
        respiratoryRate: 16,
        spo2: 99,
      },
      chiefComplaints: 'Follow-up for mild elevated systolic BP and occasional palpitations after physical exertion.',
      historyOfPresentIllness: 'Patient has been monitoring BP at home (averaging 132-138/85-88). Denies chest pain, orthopnea, or ankle edema. Sleep patterns normal.',
      physicalExamination: 'S1, S2 audible with regular rate and rhythm. No murmurs or rubs. Chest clear to auscultation bilaterally. Peripheral pulses 2+ intact.',
      diagnosis: 'Essential (primary) hypertension, Stage 1 (ICD-10 I10)',
      clinicalNotes: 'Blood pressure is modestly elevated. Renal function and electrolytes are within normal limits. Recommend maintaining low-sodium dietary habits and starting low-dose Ramipril.',
      followUpPlan: 'Review in 2 weeks with home blood pressure diary.',
      status: 'finalized',
    });

    // 8. Prescription issued during encounter
    const rxFollowUp = new Date(today);
    rxFollowUp.setDate(rxFollowUp.getDate() + 14);

    const prescription = await Prescription.create({
      prescriptionId: generateId('RX'),
      encounterId: encounter._id,
      patientId: patient1._id,
      doctorId: doctor1._id,
      items: [
        {
          medicineName: 'Ramipril Tablets',
          dosageStrength: '2.5 mg',
          route: 'Oral',
          frequency: 'Once Daily (OD)',
          duration: '30 Days',
          quantity: 30,
          foodInstruction: 'Before Food',
          specialInstructions: 'Take once daily in the morning with a glass of water.',
        },
        {
          medicineName: 'Aspirin Gastro-resistant',
          dosageStrength: '75 mg',
          route: 'Oral',
          frequency: 'Once Daily (OD)',
          duration: '30 Days',
          quantity: 30,
          foodInstruction: 'After Food',
          specialInstructions: 'Take with or immediately after food.',
        },
      ],
      diagnosisSummary: 'Stage 1 Essential Hypertension (ICD-10: I10)',
      additionalInstructions: 'Maintain a daily BP diary. Reduce dietary sodium (< 2g/day). Perform 30 minutes of moderate aerobic exercise daily.',
      followUpDate: rxFollowUp,
      status: 'active',
      approvedBy: doctorUser1._id,
      approvedByName: doctor1.name,
      approvedAt: pastDate,
    });

    // 9. Reminders
    await Reminder.create({
      reminderId: generateId('REM'),
      patientId: patient1._id,
      doctorId: doctor1._id,
      type: 'follow-up',
      title: 'Blood Pressure Evaluation Follow-up',
      description: 'Scheduled follow-up consultation with Dr. Sarah Jenkins to assess Ramipril efficacy.',
      dueDate: rxFollowUp,
      status: 'pending',
      deliveryChannel: 'in-app',
      relatedEntityId: prescription._id,
      relatedEntityType: 'Prescription',
    });

    await Reminder.create({
      reminderId: generateId('REM'),
      patientId: patient1._id,
      doctorId: doctor1._id,
      type: 'appointment',
      title: 'Upcoming Appointment Today at 10:00 AM',
      description: 'Consultation with Dr. Sarah Jenkins at Apex Multispecialty Hospital.',
      dueDate: today,
      status: 'sent',
      deliveryChannel: 'in-app',
      relatedEntityId: apptToday1._id,
      relatedEntityType: 'Appointment',
    });

    // 10. Notifications
    await Notification.create({
      userId: patientUser1._id,
      patientId: patient1._id,
      title: 'Appointment Confirmed Today',
      message: 'Your cardiology consultation with Dr. Sarah Jenkins is scheduled for 10:00 AM today.',
      type: 'appointment',
      read: false,
      link: '/appointments',
    });

    await Notification.create({
      userId: patientUser1._id,
      patientId: patient1._id,
      title: 'Active Prescription Ready',
      message: `Prescription ${prescription.prescriptionId} issued by Dr. Sarah Jenkins is available for viewing and printing.`,
      type: 'prescription',
      read: true,
      link: `/prescriptions/${prescription.prescriptionId}`,
    });

    // 11. Sample Invoices
    await Invoice.create({
      invoiceNumber: generateId('INV'),
      patientId: patient1._id,
      doctorId: doctor1._id,
      appointmentId: apptPast._id,
      clinicId: clinicApex._id,
      items: [
        {
          description: 'Specialist Consultation - Cardiology (Initial)',
          unitPrice: 150,
          quantity: 1,
          total: 150,
        },
        {
          description: 'Resting Electrocardiogram (ECG) Recording',
          unitPrice: 45,
          quantity: 1,
          total: 45,
        },
      ],
      subtotal: 195,
      tax: 0,
      discount: 0,
      totalAmount: 195,
      status: 'paid',
      paymentMethod: 'test_simulation',
      paymentDate: pastDate,
      transactionRef: 'TEST-TXN-984210',
      notes: 'Demonstration payment record for cardiology visit.',
    });

    // Active Pending Invoice for Patient 1 to test online payments
    await Invoice.create({
      invoiceNumber: generateId('INV'),
      patientId: patient1._id,
      doctorId: doctor1._id,
      appointmentId: apptToday1._id,
      clinicId: clinicApex._id,
      items: [
        {
          description: 'Follow-up Cardiology Consultation & Vitals Review',
          unitPrice: 120,
          quantity: 1,
          total: 120,
        },
        {
          description: 'EHR Digital Health Maintenance Fee',
          unitPrice: 15,
          quantity: 1,
          total: 15,
        },
      ],
      subtotal: 135,
      tax: 0,
      discount: 0,
      totalAmount: 135,
      status: 'pending',
      notes: 'Pending patient consultation bill. Ready for online payment.',
    });

    console.log('[Seed] Seeding completed successfully!');
    console.log('-------------------------------------------------------');
    console.log('Sample Accounts for Demonstration & Testing:');
    console.log('👩‍⚕️ Doctor 1 (Cardiology):      doctor@doctorx.com    / Doctor@2026');
    console.log('👨‍⚕️ Doctor 2 (General Med):     dr.robert@doctorx.com / Doctor@2026');
    console.log('👩‍⚕️ Doctor 3 (Pediatrics):      dr.priya@doctorx.com  / Doctor@2026');
    console.log('🧑‍💼 Patient:                    patient@doctorx.com   / Patient@2026');
    console.log('🏥 Clinic Admin:                clinic@doctorx.com    / Clinic@2026');
    console.log('🛡️ Platform Admin:             admin@doctorx.com     / Admin@2026');
    console.log('-------------------------------------------------------');
    await ensureClinicMembershipsAndLedger();
  } catch (error: any) {
    console.error('[Seed Error]: Error during seeding:', error.message);
  }
};

export const ensureClinicMembershipsAndLedger = async (): Promise<void> => {
  try {
    const clinics = await Clinic.find();
    if (clinics.length === 0) return;
    const primaryClinic = clinics[0];

    const doctors = await Doctor.find();
    for (const doc of doctors) {
      const existing = await ClinicDoctorMembership.findOne({
        clinicId: doc.clinicId || primaryClinic._id,
        doctorId: doc._id,
      });

      if (!existing) {
        let schedule = doc.workingHours;
        let fee = doc.consultationFee || 500;
        let splitPct = 70;

        // Realistic timings as specified in prompt:
        // Dr. Sarah Jenkins: Cardiology, 10:00 AM–1:00 PM
        // Dr. Robert Chen: General Medicine, 2:00 PM–5:00 PM
        // Dr. Priya Patel: Pediatrics, 5:00 PM–8:00 PM
        if (doc.name.includes('Sarah')) {
          schedule = [1, 2, 3, 4, 5].map((d) => ({
            dayOfWeek: d,
            startTime: '10:00',
            endTime: '13:00',
            slotDurationMinutes: 30,
            isAvailable: true,
          }));
          splitPct = 70;
        } else if (doc.name.includes('Robert')) {
          schedule = [1, 2, 3, 4, 5].map((d) => ({
            dayOfWeek: d,
            startTime: '14:00',
            endTime: '17:00',
            slotDurationMinutes: 30,
            isAvailable: true,
          }));
          splitPct = 75;
        } else if (doc.name.includes('Priya')) {
          schedule = [1, 2, 3, 4, 5].map((d) => ({
            dayOfWeek: d,
            startTime: '17:00',
            endTime: '20:00',
            slotDurationMinutes: 30,
            isAvailable: true,
          }));
          splitPct = 70;
        }

        await ClinicDoctorMembership.create({
          clinicId: doc.clinicId || primaryClinic._id,
          doctorId: doc._id,
          consultationFee: fee,
          doctorSharePercentage: splitPct,
          appointmentDurationMinutes: 30,
          workingHours: schedule,
          isActive: true,
          verificationStatus: 'verified',
        });
      }
    }

    // Ensure financial ledger entries for paid invoices
    const paidInvoices = await Invoice.find({ status: 'paid' });
    for (const inv of paidInvoices) {
      const targetClinic = inv.clinicId || primaryClinic._id;
      const existingEntry = await FinancialLedgerEntry.findOne({
        invoiceId: inv._id,
        type: 'patient_payment',
      });

      if (!existingEntry) {
        await FinancialLedgerEntry.create({
          entryId: generateId('LEDG'),
          clinicId: targetClinic,
          type: 'patient_payment',
          direction: 'credit',
          amountPaise: Math.round((inv.totalAmount || 500) * 100),
          amountInr: inv.totalAmount || 500,
          status: 'cleared',
          description: `Patient consultation payment: Invoice ${inv.invoiceNumber} via ${inv.paymentMethod || 'upi_test'}`,
          referenceType: 'Invoice',
          referenceId: inv.invoiceNumber,
          invoiceId: inv._id,
          patientId: inv.patientId,
          doctorId: inv.doctorId,
          paymentMethod: inv.paymentMethod || 'upi_test',
          transactionRef: inv.transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
        });
      }
    }

    // Ensure at least one sample completed settlement for historical reporting
    const settlementCount = await DoctorSettlement.countDocuments();
    if (settlementCount === 0 && doctors.length > 0) {
      const firstDoc = doctors[0];
      await DoctorSettlement.create({
        settlementId: generateId('SET'),
        clinicId: primaryClinic._id,
        doctorId: firstDoc._id,
        invoiceIds: [],
        appointmentIds: [],
        totalPatientPaidInr: 1500,
        doctorSharePercentage: 70,
        doctorShareInr: 1050,
        clinicShareInr: 450,
        adjustmentsInr: 0,
        netPayableInr: 1050,
        netPayablePaise: 105000,
        status: 'paid',
        paymentMode: 'manual_bank_transfer',
        paymentReference: `UTR-${Date.now().toString().slice(-8)}`,
        paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        notes: 'Prior weekly consultation payout batch settled via NEFT transfer',
      });
    }

    console.log('[Seed] Clinic doctor schedules and financial ledger synchronized.');
  } catch (err: any) {
    console.error('[Seed Sync Error]:', err.message);
  }
};
