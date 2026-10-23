// Doctor Portal (Backend / Admin Dashboard)

let editingDoctorId = null;

function loadDoctorPortalDashboard() {
  loadDoctorPortalAppointments();
  loadDoctorPortalDoctorList();
  resetDoctorForm();
}

function setupDoctorPortalEvents() {
  // Sub-tabs in Doctor Portal
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.portal-view').forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.classList.add('active');

      if (btn.dataset.target === 'portal-appointments') {
        loadDoctorPortalAppointments();
      } else if (btn.dataset.target === 'portal-my-doctors') {
        loadDoctorPortalDoctorList();
      }
    });
  });

  // Doctor Form Submit (Add or Update)
  const form = document.getElementById('doctor-profile-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-save-doctor');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Profile...';

      const doctorData = {
        name: document.getElementById('doc-input-name').value.trim(),
        specialty: document.getElementById('doc-input-specialty').value,
        qualification: document.getElementById('doc-input-qualification').value.trim(),
        experience: document.getElementById('doc-input-experience').value,
        fee: document.getElementById('doc-input-fee').value,
        clinic_name: document.getElementById('doc-input-clinic').value.trim(),
        location: document.getElementById('doc-input-location').value.trim(),
        city: document.getElementById('doc-input-city').value.trim(),
        phone: document.getElementById('doc-input-phone').value.trim(),
        email: document.getElementById('doc-input-email').value.trim(),
        available_days: document.getElementById('doc-input-days').value.trim(),
        available_hours: document.getElementById('doc-input-hours').value.trim(),
        bio: document.getElementById('doc-input-bio').value.trim(),
        avatar: document.getElementById('doc-input-avatar').value.trim()
      };

      try {
        if (editingDoctorId) {
          await API.updateDoctor(editingDoctorId, doctorData);
          showToast(`Doctor profile for ${doctorData.name} updated successfully!`, 'success');
        } else {
          await API.createDoctor(doctorData);
          showToast(`New doctor ${doctorData.name} registered into Doctor X!`, 'success');
        }

        resetDoctorForm();
        loadDoctorPortalDoctorList();
        loadFilterDropdowns(); // refresh filter dropdowns in directory
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editingDoctorId ? 'Update Doctor Profile' : 'Register Doctor Profile';
      }
    });
  }

  // Cancel edit button
  const cancelBtn = document.getElementById('btn-cancel-doctor-edit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetDoctorForm);
  }
}

function resetDoctorForm() {
  editingDoctorId = null;
  const form = document.getElementById('doctor-profile-form');
  if (form) form.reset();
  document.getElementById('form-doctor-title').textContent = 'Register New Doctor Profile';
  document.getElementById('btn-save-doctor').textContent = 'Register Doctor Profile';
  const cancelBtn = document.getElementById('btn-cancel-doctor-edit');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

// Load Appointments for Doctor's side
async function loadDoctorPortalAppointments() {
  const container = document.getElementById('doctor-appointments-table');
  if (!container) return;

  try {
    const appointments = await API.getAppointments();
    
    if (appointments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No Patient Bookings Yet</h3>
          <p>When patients book consultations on Doctor X, their appointments and stated issues will appear here live.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    appointments.forEach(apt => {
      const item = document.createElement('div');
      item.className = 'appointment-item';
      item.innerHTML = `
        <div class="appointment-details">
          <div class="apt-meta">
            <span class="apt-name">Patient: ${apt.patient_name}</span>
            <span class="status-badge ${apt.status.toLowerCase()}">${apt.status}</span>
            <span style="font-size: 0.8rem; color: #64748b;">Consulting: <strong>${apt.doctor_name}</strong> (${apt.doctor_specialty})</span>
          </div>
          <div class="apt-info">
            <span>📅 Scheduled: <strong>${apt.appointment_date}</strong> at <strong>${apt.appointment_time}</strong></span>
            <span>📞 Phone: <strong>${apt.patient_phone}</strong></span>
            ${apt.patient_email ? `<span>✉️ Email: ${apt.patient_email}</span>` : ''}
            <span>👤 Age/Gender: ${apt.patient_age || 'N/A'} yrs / ${apt.patient_gender}</span>
            <span>💵 Fee: $${apt.doctor_fee}</span>
          </div>
          <div class="apt-symptoms">
            <strong>Patient Symptoms / Health Issue:</strong> ${apt.symptoms}
          </div>
          ${apt.doctor_notes ? `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #0284c7; background: #e0f2fe; padding: 0.5rem; border-radius: 6px;"><strong>Doctor's Notes / Advice:</strong> ${apt.doctor_notes}</div>` : ''}
        </div>
        <div class="apt-actions">
          ${apt.status !== 'Completed' ? `
            <button class="btn-action-done" onclick="completeAppointment(${apt.id})">✓ Mark Completed</button>
          ` : ''}
          ${apt.status !== 'Cancelled' && apt.status !== 'Completed' ? `
            <button class="btn-action-cancel" onclick="cancelAppointment(${apt.id})">✕ Cancel</button>
          ` : ''}
          <button class="btn-book" style="background: #334155; padding: 0.45rem 0.85rem; font-size: 0.8rem;" onclick="addDoctorNotes(${apt.id})">Add Medical Advice</button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:red">Failed to load doctor appointments: ${err.message}</div>`;
  }
}

// Action handlers
async function completeAppointment(aptId) {
  try {
    await API.updateAppointmentStatus(aptId, 'Completed');
    showToast('Appointment marked as Completed!', 'success');
    loadDoctorPortalAppointments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelAppointment(aptId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  try {
    await API.updateAppointmentStatus(aptId, 'Cancelled');
    showToast('Appointment cancelled.', 'info');
    loadDoctorPortalAppointments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function addDoctorNotes(aptId) {
  const notes = prompt('Enter medical advice / prescription notes for the patient:');
  if (notes === null || !notes.trim()) return;
  try {
    await API.updateAppointmentStatus(aptId, null, notes.trim());
    showToast('Medical advice recorded successfully!', 'success');
    loadDoctorPortalAppointments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load List of Registered Doctors in Management Panel
async function loadDoctorPortalDoctorList() {
  const container = document.getElementById('portal-doctors-list');
  if (!container) return;

  try {
    const doctors = await API.getDoctors();
    container.innerHTML = '';

    doctors.forEach(doc => {
      const row = document.createElement('div');
      row.className = 'appointment-item';
      row.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: center; flex: 1;">
          <img src="${doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400'}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
          <div>
            <div style="font-weight: 800; font-size: 1.05rem;">${doc.name}</div>
            <div style="font-size: 0.85rem; color: #64748b;">${doc.specialty} • ${doc.qualification}</div>
            <div style="font-size: 0.8rem; color: #475569;">📍 ${doc.location}, <strong>${doc.city}</strong> | Fee: <strong>$${doc.fee}</strong></div>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn-book" style="padding: 0.45rem 0.85rem; font-size: 0.85rem;" onclick="startEditDoctor(${doc.id})">Edit Profile</button>
          <button class="btn-action-cancel" onclick="deleteDoctorProfile(${doc.id}, '${doc.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:red">Failed to load doctor profiles: ${err.message}</div>`;
  }
}

async function startEditDoctor(doctorId) {
  try {
    const doc = await API.getDoctorById(doctorId);
    editingDoctorId = doc.id;

    document.getElementById('form-doctor-title').textContent = `Edit Profile: ${doc.name}`;
    document.getElementById('btn-save-doctor').textContent = 'Update Doctor Profile';
    document.getElementById('btn-cancel-doctor-edit').style.display = 'inline-block';

    document.getElementById('doc-input-name').value = doc.name;
    document.getElementById('doc-input-specialty').value = doc.specialty;
    document.getElementById('doc-input-qualification').value = doc.qualification || '';
    document.getElementById('doc-input-experience').value = doc.experience || '';
    document.getElementById('doc-input-fee').value = doc.fee;
    document.getElementById('doc-input-clinic').value = doc.clinic_name || '';
    document.getElementById('doc-input-location').value = doc.location;
    document.getElementById('doc-input-city').value = doc.city;
    document.getElementById('doc-input-phone').value = doc.phone || '';
    document.getElementById('doc-input-email').value = doc.email || '';
    document.getElementById('doc-input-days').value = doc.available_days || '';
    document.getElementById('doc-input-hours').value = doc.available_hours || '';
    document.getElementById('doc-input-bio').value = doc.bio || '';
    document.getElementById('doc-input-avatar').value = doc.avatar || '';

    // Switch to profile form tab
    document.querySelector('.tab-btn[data-target="portal-add-doctor"]').click();
    document.getElementById('doctor-profile-form').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('Failed to load doctor data for edit', 'error');
  }
}

async function deleteDoctorProfile(doctorId, docName) {
  if (!confirm(`Are you sure you want to remove doctor "${docName}" from the platform?`)) return;
  try {
    await API.deleteDoctor(doctorId);
    showToast(`Doctor "${docName}" deleted successfully.`, 'info');
    loadDoctorPortalDoctorList();
    loadFilterDropdowns();
  } catch (err) {
    showToast(err.message, 'error');
  }
}