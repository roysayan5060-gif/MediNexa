import { z } from 'zod';

// ================= AUTH VALIDATIONS =================
export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['patient', 'doctor', 'clinic', 'clinic_admin', 'platform_admin']).default('patient'),
  phone: z.string().optional(),
  // For patients registering themselves:
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']).optional(),
  privacyConsent: z.boolean().optional(),
  // For doctors registering:
  specialty: z.string().optional(),
  registrationNumber: z.string().optional(),
  consultationFee: z.number().optional(),
  clinicId: z.string().optional(),
  // For clinics registering:
  clinicName: z.string().optional(),
  ownerName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  defaultDoctorSharePercentage: z.number().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// ================= PATIENT VALIDATIONS =================
export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date format'),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']).default('Unknown'),
  phone: z.string().min(7, 'Phone number must be at least 7 digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  emergencyContact: z
    .object({
      name: z.string().optional().default(''),
      relationship: z.string().optional().default(''),
      phone: z.string().optional().default(''),
    })
    .optional(),
  allergies: z.array(z.string()).optional().default([]),
  chronicConditions: z.array(z.string()).optional().default([]),
  medicalHistory: z.string().optional().default(''),
  primaryDoctorId: z.string().optional(),
  clinicId: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

// ================= APPOINTMENT VALIDATIONS =================
export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  clinicId: z.string().optional(),
  appointmentDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid appointment date'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format (e.g. 10:30)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format (e.g. 11:00)'),
  reason: z.string().min(2, 'Reason for appointment is required'),
  type: z.enum(['in-person', 'teleconsultation', 'follow-up']).default('in-person'),
  notes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['requested', 'confirmed', 'completed', 'cancelled', 'no-show']),
  cancellationReason: z.string().optional(),
});

// ================= CLINICAL ENCOUNTER VALIDATIONS =================
export const createEncounterSchema = z.object({
  appointmentId: z.string().optional(),
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  vitals: z
    .object({
      bloodPressure: z.string().optional(),
      heartRate: z.number().optional(),
      temperature: z.number().optional(),
      weightKg: z.number().optional(),
      heightCm: z.number().optional(),
      respiratoryRate: z.number().optional(),
      spo2: z.number().optional(),
    })
    .optional(),
  chiefComplaints: z.string().min(1, 'Chief complaints are required'),
  historyOfPresentIllness: z.string().optional(),
  physicalExamination: z.string().optional(),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  clinicalNotes: z.string().optional(),
  followUpPlan: z.string().optional(),
  status: z.enum(['in-progress', 'finalized']).default('finalized'),
});

// ================= PRESCRIPTION VALIDATIONS =================
export const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  dosageStrength: z.string().min(1, 'Strength/Dosage is required (e.g. 500mg)'),
  route: z.enum(['Oral', 'Topical', 'Intravenous', 'Intramuscular', 'Inhalation', 'Ophthalmic', 'Sublingual', 'Other']),
  frequency: z.enum([
    'Once Daily (OD)',
    'Twice Daily (BD)',
    'Three Times Daily (TDS)',
    'Four Times Daily (QID)',
    'As Needed (PRN)',
    'At Bedtime (HS)',
    'Every Other Day',
  ]),
  duration: z.string().min(1, 'Duration is required (e.g. 5 days)'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  foodInstruction: z.enum(['Before Food', 'After Food', 'With Food', 'Empty Stomach', 'No Specific Timing']),
  specialInstructions: z.string().optional(),
});

export const createPrescriptionSchema = z.object({
  encounterId: z.string().optional(),
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  items: z.array(prescriptionItemSchema).min(1, 'At least one medicine item is required'),
  diagnosisSummary: z.string().optional(),
  additionalInstructions: z.string().optional(),
  followUpDate: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'amended', 'cancelled']).default('active'),
});

export const amendPrescriptionSchema = z.object({
  reason: z.string().min(3, 'Amendment reason is required'),
  items: z.array(prescriptionItemSchema).min(1, 'Prescription must contain at least one item'),
  additionalInstructions: z.string().optional(),
  followUpDate: z.string().optional(),
});

// ================= REMINDER VALIDATIONS =================
export const createReminderSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().optional(),
  type: z.enum(['appointment', 'follow-up', 'medication', 'report-review', 'vaccination', 'general']),
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid due date'),
  deliveryChannel: z.enum(['in-app', 'email', 'sms']).default('in-app'),
  relatedEntityId: z.string().optional(),
  relatedEntityType: z.enum(['Appointment', 'Prescription', 'ClinicalEncounter']).optional(),
});

// ================= INVOICE VALIDATIONS =================
export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().optional(),
  appointmentId: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1, 'Item description is required'),
      unitPrice: z.number().min(0, 'Unit price must be non-negative'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
      total: z.number().min(0),
    })
  ).min(1, 'At least one invoice line item is required'),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(['test_simulation', 'cash', 'card_test', 'upi_test', 'insurance_claim']).default('test_simulation'),
  notes: z.string().optional(),
});
