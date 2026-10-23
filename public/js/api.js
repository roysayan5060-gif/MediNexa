// API helper methods for MediNexa Platform
const CLOUD_BACKEND_URL = 'https://medinexa-ycam.onrender.com';

const API = {
  // Configured to adapt between local testing, deployed browser, and standalone Android APK
  baseUrl: (function() {
    if (typeof window !== 'undefined' && window.API_BASE_URL) return window.API_BASE_URL;
    if (typeof window !== 'undefined') {
      const isMobileApp = Boolean(window.Capacitor) || 
                          window.location.protocol === 'capacitor:' || 
                          window.location.protocol === 'file:' || 
                          window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
      return isMobileApp ? CLOUD_BACKEND_URL : '';
    }
    return CLOUD_BACKEND_URL;
  })(),

  getToken() {
    return localStorage.getItem('medinexa_token') || '';
  },

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // ---------------- AUTHENTICATION APIs ----------------
  async register(userData) {
    const res = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async login(credentials) {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${this.baseUrl}/api/auth/me`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) {
      const err = new Error(res.status === 401 || res.status === 403 ? 'Session invalid' : 'Server temporary error');
      err.status = res.status;
      throw err;
    }
    return await res.json();
  },

  async getVerificationQueue() {
    const res = await fetch(`${this.baseUrl}/api/auth/verification-queue`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch verification queue');
    return await res.json();
  },

  async verifyDoctor(doctorId, status, notes) {
    const res = await fetch(`${this.baseUrl}/api/auth/verify-doctor`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ doctorId, status, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify doctor');
    return data;
  },

  // ---------------- DOCTORS APIs (Preserved) ----------------
  async getDoctors(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/api/doctors?${query}`);
    if (!res.ok) throw new Error('Failed to fetch doctors');
    return await res.json();
  },

  async getFilterOptions() {
    const res = await fetch(`${this.baseUrl}/api/doctors/meta/filters`);
    if (!res.ok) throw new Error('Failed to fetch filters');
    return await res.json();
  },

  async getDoctorById(id) {
    const res = await fetch(`${this.baseUrl}/api/doctors/${id}`);
    if (!res.ok) throw new Error('Doctor not found');
    return await res.json();
  },

  async createDoctor(doctorData) {
    const res = await fetch(`${this.baseUrl}/api/doctors`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(doctorData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create doctor');
    }
    return await res.json();
  },

  async updateDoctor(id, doctorData) {
    const res = await fetch(`${this.baseUrl}/api/doctors/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(doctorData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update doctor');
    }
    return await res.json();
  },

  async deleteDoctor(id) {
    const res = await fetch(`${this.baseUrl}/api/doctors/${id}`, { 
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete doctor');
    return await res.json();
  },

  // ---------------- SYMPTOM TRIAGE (Preserved) ----------------
  async diagnoseSymptoms(query) {
    const res = await fetch(`${this.baseUrl}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to analyze symptoms');
    }
    return await res.json();
  },

  // ---------------- APPOINTMENT BOOKING (Preserved) ----------------
  async bookAppointment(data) {
    const res = await fetch(`${this.baseUrl}/api/appointments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to book appointment');
    }
    return await res.json();
  },

  async getAppointments(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/api/appointments?${query}`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return await res.json();
  },

  async updateAppointmentStatus(id, status, notes = '') {
    const res = await fetch(`${this.baseUrl}/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status, doctor_notes: notes })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return await res.json();
  },

  // ---------------- PRESCRIPTION & WHATSAPP APIs ----------------
  async getPrescriptions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/api/prescriptions?${query}`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch prescriptions');
    return await res.json();
  },

  async createPrescription(rxData) {
    const res = await fetch(`${this.baseUrl}/api/prescriptions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(rxData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate prescription');
    return data;
  },

  async notifyWhatsAppInitiated(prescriptionId) {
    const res = await fetch(`${this.baseUrl}/api/prescriptions/${prescriptionId}/whatsapp-initiated`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return await res.json();
  },

  // ---------------- PAYMENT GATEWAY (RAZORPAY) APIs ----------------
  async getPaymentConfig() {
    const res = await fetch(`${this.baseUrl}/api/payments/config`);
    if (!res.ok) throw new Error('Failed to load payment configuration');
    return await res.json();
  },

  async createPaymentOrder(orderPayload) {
    const res = await fetch(`${this.baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(orderPayload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create payment order');
    return data;
  },

  async verifyPayment(verificationPayload) {
    const res = await fetch(`${this.baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(verificationPayload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Payment verification failed');
    return data;
  },

  async getPaymentHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/api/payments/history?${query}`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch payments');
    return await res.json();
  },

  // ---------------- CLINIC FINANCIAL MANAGEMENT APIs ----------------
  async getClinicFinancialSummary(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/api/clinics/financial-summary?${query}`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to retrieve clinic financials');
    return await res.json();
  },

  async recordClinicExpense(expenseData) {
    const res = await fetch(`${this.baseUrl}/api/clinics/expenses`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(expenseData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record expense');
    return data;
  },

  async recordClinicSettlement(settlementData) {
    const res = await fetch(`${this.baseUrl}/api/clinics/settlements`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settlementData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record settlement');
    return data;
  },

  async getHealthStatus() {
    const res = await fetch(`${this.baseUrl}/api/health`);
    return await res.json();
  }
};
