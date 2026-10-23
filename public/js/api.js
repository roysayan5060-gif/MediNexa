// API helper methods for Doctor X
const API = {
  baseUrl: '',

  async getDoctors(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/doctors?${query}`);
    if (!res.ok) throw new Error('Failed to fetch doctors');
    return await res.json();
  },

  async getFilterOptions() {
    const res = await fetch('/api/doctors/meta/filters');
    if (!res.ok) throw new Error('Failed to fetch filters');
    return await res.json();
  },

  async getDoctorById(id) {
    const res = await fetch(`/api/doctors/${id}`);
    if (!res.ok) throw new Error('Doctor not found');
    return await res.json();
  },

  async createDoctor(doctorData) {
    const res = await fetch('/api/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctorData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create doctor');
    }
    return await res.json();
  },

  async updateDoctor(id, doctorData) {
    const res = await fetch(`/api/doctors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctorData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update doctor');
    }
    return await res.json();
  },

  async deleteDoctor(id) {
    const res = await fetch(`/api/doctors/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete doctor');
    return await res.json();
  },

  async diagnoseSymptoms(query) {
    const res = await fetch('/api/recommend', {
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

  async bookAppointment(data) {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/appointments?${query}`);
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return await res.json();
  },

  async updateAppointmentStatus(id, status, notes = '') {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, doctor_notes: notes })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return await res.json();
  }
};
