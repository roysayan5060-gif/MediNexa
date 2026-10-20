export type UserRole = 'patient' | 'doctor' | 'clinic_admin' | 'platform_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  patientId?: string;
  doctorId?: string;
  clinicId?: string;
  profile?: any;
}

export interface Patient {
  _id: string;
  patientId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  bloodGroup: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies: string[];
  chronicConditions: string[];
  medicalHistory?: string;
  status: 'active' | 'inactive';
  primaryDoctorId?: Doctor;
  clinicId?: any;
  createdAt: string;
}

export interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isAvailable: boolean;
}

export interface Doctor {
  _id: string;
  doctorId: string;
  userId: string;
  name: string;
  title: string;
  specialty: string;
  qualifications: string[];
  registrationNumber: string;
  experienceYears: number;
  consultationFee: number;
  bio: string;
  phone: string;
  email: string;
  clinicId?: {
    _id: string;
    name: string;
    city: string;
    state: string;
    address: string;
    phone?: string;
  };
  isVerified: boolean;
  rating: number;
  workingHours?: WorkingHour[];
}

export interface Clinic {
  _id: string;
  name: string;
  code: string;
  ownerName?: string;
  registrationNumber?: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  phone: string;
  email: string;
  isActive: boolean;
  consultationFeeDefault: number;
  defaultDoctorSharePercentage: number;
  availableBalancePaise: number;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
  doctorCount?: number;
  doctors?: Array<{
    membershipId: string;
    doctor: Doctor;
    consultationFee: number;
    workingHours: WorkingHour[];
    doctorSharePercentage: number;
  }>;
}

export interface ClinicDoctorMembership {
  _id: string;
  clinicId: Clinic | string;
  doctorId: Doctor;
  consultationFee: number;
  doctorSharePercentage: number;
  appointmentDurationMinutes: number;
  workingHours: WorkingHour[];
  breakTimes?: Array<{ startTime: string; endTime: string }>;
  holidays?: string[];
  isActive: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  notes?: string;
  createdAt: string;
}

export interface Appointment {
  _id: string;
  appointmentId: string;
  patientId: Patient;
  doctorId: Doctor;
  clinicId?: Clinic;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  type: 'in-person' | 'teleconsultation' | 'follow-up';
  reason: string;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
}

export interface PrescriptionItem {
  medicineName: string;
  dosageStrength: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
  foodInstruction: string;
  specialInstructions?: string;
}

export interface Prescription {
  _id: string;
  prescriptionId: string;
  encounterId?: string;
  patientId: Patient;
  doctorId: Doctor;
  items: PrescriptionItem[];
  diagnosisSummary?: string;
  additionalInstructions?: string;
  followUpDate?: string;
  status: 'draft' | 'active' | 'completed' | 'amended' | 'cancelled';
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  amendmentHistory?: Array<{
    amendedAt: string;
    amendedByName: string;
    reason: string;
    previousItems: PrescriptionItem[];
  }>;
  whatsappSent?: boolean;
  whatsappSentAt?: string;
  whatsappRecipientPhone?: string;
  whatsappStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  createdAt: string;
}

export interface ClinicalEncounter {
  _id: string;
  encounterId: string;
  appointmentId?: string;
  patientId: Patient;
  doctorId: Doctor;
  encounterDate: string;
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weightKg?: number;
    heightCm?: number;
    respiratoryRate?: number;
    spo2?: number;
  };
  chiefComplaints: string;
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  diagnosis: string;
  clinicalNotes?: string;
  followUpPlan?: string;
  status: 'in-progress' | 'finalized';
  createdAt: string;
}

export interface Reminder {
  _id: string;
  reminderId: string;
  patientId: Patient;
  doctorId?: Doctor;
  type: 'appointment' | 'follow-up' | 'medication' | 'report-review' | 'vaccination' | 'general';
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed' | 'cancelled';
  deliveryChannel: string;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  patientId?: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'appointment' | 'prescription' | 'reminder' | 'billing';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  patientId: Patient;
  doctorId?: Doctor;
  appointmentId?: any;
  clinicId?: Clinic;
  items: Array<{
    description: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  amountPaise?: number;
  doctorShareAmount?: number;
  clinicShareAmount?: number;
  gatewayCharges?: number;
  refundAmount?: number;
  refundStatus?: 'none' | 'pending' | 'processing' | 'refunded' | 'failed';
  refundReason?: string;
  refundRef?: string;
  refundDate?: string;
  settlementStatus?: 'unsettled' | 'batched' | 'settled';
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  paymentMethod?: string;
  paymentDate?: string;
  transactionRef?: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialLedgerEntry {
  _id: string;
  entryId: string;
  clinicId: string;
  type:
    | 'patient_payment'
    | 'gateway_fee'
    | 'refund'
    | 'doctor_settlement'
    | 'clinic_bank_settlement'
    | 'adjustment';
  direction: 'credit' | 'debit';
  amountPaise: number;
  amountInr: number;
  currency: string;
  status: 'pending' | 'cleared' | 'settled' | 'reversed' | 'failed';
  description: string;
  referenceType?: 'Invoice' | 'DoctorSettlement' | 'Refund' | 'BankTransfer' | 'Manual';
  referenceId?: string;
  invoiceId?: Invoice;
  patientId?: Patient;
  doctorId?: Doctor;
  paymentMethod?: string;
  transactionRef?: string;
  createdAt: string;
}

export interface DoctorSettlement {
  _id: string;
  settlementId: string;
  clinicId: Clinic | string;
  doctorId: Doctor;
  invoiceIds: string[];
  appointmentIds: string[];
  totalPatientPaidInr: number;
  doctorSharePercentage: number;
  doctorShareInr: number;
  clinicShareInr: number;
  adjustmentsInr: number;
  netPayableInr: number;
  netPayablePaise: number;
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'failed' | 'cancelled';
  paymentMode: 'manual_bank_transfer' | 'upi' | 'provider_payout' | 'cash';
  paymentReference?: string;
  approvedBy?: User;
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  timestamp: string;
}
