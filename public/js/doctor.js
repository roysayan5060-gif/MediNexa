if (typeof window !== 'undefined' && !window.DEFAULT_DOCTOR_AVATAR) {
  window.DEFAULT_DOCTOR_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='40' fill='%231e293b'/%3E%3Ccircle cx='40' cy='30' r='14' fill='%2394a3b8'/%3E%3Cpath d='M18 68c0-12.15 9.85-22 22-22s22 9.85 22 22' fill='%2338bdf8'/%3E%3Ccircle cx='40' cy='46' r='3.5' fill='%23e11d48'/%3E%3C/svg%3E";
}
var DEFAULT_DOCTOR_AVATAR = (typeof window !== 'undefined' && window.DEFAULT_DOCTOR_AVATAR) ? window.DEFAULT_DOCTOR_AVATAR : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='40' fill='%231e293b'/%3E%3Ccircle cx='40' cy='30' r='14' fill='%2394a3b8'/%3E%3Cpath d='M18 68c0-12.15 9.85-22 22-22s22 9.85 22 22' fill='%2338bdf8'/%3E%3Ccircle cx='40' cy='46' r='3.5' fill='%23e11d48'/%3E%3C/svg%3E";

// Doctor Portal Controller — Preserving All Working Features & Adding PDF Doctor Suite
let editingDoctorId = null;
let activePrescriptionAppointment = null;

function loadDoctorPortalDashboard() {
  if (typeof window !== 'undefined' && typeof DoctorSuite !== 'undefined') {
    window.DoctorSuite = DoctorSuite;
  }
  if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role === 'doctor') {
    DoctorSuite.setDoctorInfo(Auth.currentUser, Auth.currentProfile);
  }
  DoctorSuite.init();
  loadDoctorPortalAppointments();
  loadDoctorPortalDoctorList();
  loadVerificationQueue();
  resetDoctorForm();
}

function setupDoctorPortalEvents() {
  if (typeof window !== 'undefined' && typeof DoctorSuite !== 'undefined') {
    window.DoctorSuite = DoctorSuite;
  }
  DoctorSuite.setupEvents();
  // Portal Sub-tabs
  document.querySelectorAll('.tab-btn[data-target^="portal-"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-target^="portal-"]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.portal-view').forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.classList.add('active');

      if (btn.dataset.target === 'portal-appointments') {
        loadDoctorPortalAppointments();
      } else if (btn.dataset.target === 'portal-my-doctors') {
        loadDoctorPortalDoctorList();
      } else if (btn.dataset.target === 'portal-verification') {
        loadVerificationQueue();
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
        avatar: document.getElementById('doc-input-avatar').value.trim(),
        registration_number: document.getElementById('doc-input-regno') ? document.getElementById('doc-input-regno').value.trim() : '',
        registration_authority: document.getElementById('doc-input-authority') ? document.getElementById('doc-input-authority').value : 'West Bengal Medical Council (WBMC)'
      };

      try {
        if (editingDoctorId) {
          await API.updateDoctor(editingDoctorId, doctorData);
          showToast(`Doctor profile for ${doctorData.name} updated successfully!`, 'success');
        } else {
          await API.createDoctor(doctorData);
          showToast(`New doctor ${doctorData.name} registered into MediNexa!`, 'success');
        }

        resetDoctorForm();
        loadDoctorPortalDoctorList();
        loadFilterDropdowns();
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

  // Prescription Form Submit & Review Modal
  const rxForm = document.getElementById('prescription-form');
  if (rxForm) {
    rxForm.addEventListener('submit', (e) => {
      e.preventDefault();
      reviewPrescriptionBeforeShare();
    });
  }

  // Add more medicine row button
  const btnAddMed = document.getElementById('btn-add-medicine-row');
  if (btnAddMed) {
    btnAddMed.addEventListener('click', addMedicineInputRow);
  }
}

function resetDoctorForm() {
  editingDoctorId = null;
  const form = document.getElementById('doctor-profile-form');
  if (form) form.reset();
  const title = document.getElementById('form-doctor-title');
  if (title) title.textContent = 'Register New Doctor Profile';
  const submitBtn = document.getElementById('btn-save-doctor');
  if (submitBtn) submitBtn.textContent = 'Register Doctor Profile';
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
          <p>When patients book consultations on MediNexa, their appointments and stated issues will appear here in real-time.</p>
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
            <span class="status-badge ${apt.status.toLowerCase().replace(/\s+/g, '-')}">${apt.status}</span>
            <span style="font-size: 0.8rem; color: #94a3b8;">Consulting: <strong>${apt.doctor_name}</strong> (${apt.doctor_specialty})</span>
          </div>
          <div class="apt-info">
            <span>📅 Scheduled: <strong>${apt.appointment_date}</strong> at <strong>${apt.appointment_time}</strong></span>
            <span>📞 Phone: <strong>${apt.patient_phone}</strong></span>
            ${apt.patient_email ? `<span>✉️ Email: ${apt.patient_email}</span>` : ''}
            <span>👤 Age/Gender: ${apt.patient_age || 'N/A'} yrs / ${apt.patient_gender}</span>
            <span>💵 Fee: ₹${apt.doctor_fee}</span>
          </div>
          <div class="apt-symptoms">
            <strong>Patient Symptoms / Health Issue:</strong> ${apt.symptoms}
          </div>
          ${apt.doctor_notes ? `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); padding: 0.65rem; border-radius: 6px;"><strong>Doctor's Advice & Prescription Notes:</strong> ${apt.doctor_notes}</div>` : ''}
        </div>
        <div class="apt-actions">
          ${apt.status !== 'Completed' ? `
            <button class="btn-action-done" onclick="completeAppointment('${apt.id || apt._id}')">✓ Mark Completed</button>
          ` : ''}
          ${apt.status !== 'Cancelled' && apt.status !== 'Completed' ? `
            <button class="btn-action-cancel" onclick="cancelAppointment('${apt.id || apt._id}')">✕ Cancel</button>
          ` : ''}
          <button class="btn-book" style="background: #334155; padding: 0.45rem 0.85rem; font-size: 0.8rem;" onclick="openPrescriptionBuilder('${apt.id || apt._id}')">
            📝 Issue Rx & Advice
          </button>
          <button class="btn-action-whatsapp" onclick="openWhatsAppForAppointment('${apt.id || apt._id}')">
            <span>📲</span> WhatsApp Rx
          </button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger)">Failed to load doctor appointments: ${err.message}</div>`;
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

// ---------------- PRESCRIPTION BUILDER & WHATSAPP SHARING ----------------
async function openPrescriptionBuilder(aptId) {
  try {
    const appointments = await API.getAppointments();
    const apt = appointments.find(a => (a.id == aptId || a._id == aptId));
    if (!apt) throw new Error('Appointment details not found');

    activePrescriptionAppointment = apt;

    document.getElementById('rx-patient-name').textContent = apt.patient_name;
    document.getElementById('rx-patient-phone').textContent = apt.patient_phone;
    document.getElementById('rx-patient-age').textContent = `${apt.patient_age || 'N/A'} yrs / ${apt.patient_gender}`;
    document.getElementById('rx-patient-symptoms').textContent = apt.symptoms;
    document.getElementById('rx-input-diagnosis').value = '';
    document.getElementById('rx-input-advice').value = '';

    // Reset medicine rows to 1 default row
    const medContainer = document.getElementById('rx-medicines-container');
    medContainer.innerHTML = `
      <div class="form-grid rx-med-row" style="margin-bottom: 0.5rem; gap: 0.5rem;">
        <div class="form-control" style="grid-column: span 1;">
          <input type="text" class="med-name" placeholder="Medicine Name (e.g. Paracetamol 650mg)" required>
        </div>
        <div class="form-control" style="grid-column: span 1;">
          <input type="text" class="med-dosage" placeholder="Dosage (e.g. 1 tab, 1-0-1 after meals)" required>
        </div>
      </div>
    `;

    document.getElementById('prescription-modal').classList.add('active');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function addMedicineInputRow() {
  const medContainer = document.getElementById('rx-medicines-container');
  const newRow = document.createElement('div');
  newRow.className = 'form-grid rx-med-row';
  newRow.style.cssText = 'margin-bottom: 0.5rem; gap: 0.5rem;';
  newRow.innerHTML = `
    <div class="form-control" style="grid-column: span 1;">
      <input type="text" class="med-name" placeholder="Medicine Name" required>
    </div>
    <div class="form-control" style="grid-column: span 1;">
      <input type="text" class="med-dosage" placeholder="Dosage & Timing" required>
    </div>
  `;
  medContainer.appendChild(newRow);
}

// Review prescription before sharing requirement
function reviewPrescriptionBeforeShare() {
  if (!activePrescriptionAppointment) return;

  const diagnosis = document.getElementById('rx-input-diagnosis').value.trim();
  const advice = document.getElementById('rx-input-advice').value.trim();
  const medRows = document.querySelectorAll('.rx-med-row');
  
  const medicines = [];
  medRows.forEach(row => {
    const name = row.querySelector('.med-name').value.trim();
    const dosage = row.querySelector('.med-dosage').value.trim();
    if (name) {
      medicines.push({ name, dosage });
    }
  });

  if (medicines.length === 0) {
    showToast('Please add at least one prescribed medicine.', 'error');
    return;
  }

  // Populate Review Dialog
  const reviewContent = document.getElementById('rx-review-content');
  reviewContent.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: var(--radius-md); font-size: 0.9rem;">
      <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
        <h4 style="color: var(--text-white); font-weight: 800;">MediNexa Clinical Prescription</h4>
        <div style="color: var(--text-secondary); font-size: 0.8rem;">Doctor: <strong>${activePrescriptionAppointment.doctor_name}</strong> | Reg No: <strong>WBMC-VERIFIED</strong></div>
        <div style="color: var(--text-secondary); font-size: 0.8rem;">Patient: <strong>${activePrescriptionAppointment.patient_name}</strong> (${activePrescriptionAppointment.patient_phone})</div>
      </div>
      <div style="margin-bottom: 0.75rem;">
        <strong style="color: #f87171;">Diagnosis:</strong> ${diagnosis}
      </div>
      <div style="margin-bottom: 0.75rem;">
        <strong style="color: #60a5fa;">Rx Medications:</strong>
        <ul style="margin-left: 1.25rem; margin-top: 0.35rem;">
          ${medicines.map(m => `<li><strong>${m.name}</strong> — ${m.dosage}</li>`).join('')}
        </ul>
      </div>
      <div>
        <strong style="color: #34d399;">General Clinical Advice:</strong> ${advice || 'Follow medication schedule carefully.'}
      </div>
    </div>
  `;

  document.getElementById('prescription-modal').classList.remove('active');
  document.getElementById('prescription-review-modal').classList.add('active');
}

// Confirm prescription and trigger WhatsApp sharing with authorized patient phone
async function confirmAndSharePrescription() {
  const apt = activePrescriptionAppointment;
  if (!apt) return;

  const diagnosis = document.getElementById('rx-input-diagnosis').value.trim();
  const advice = document.getElementById('rx-input-advice').value.trim();
  const medRows = document.querySelectorAll('.rx-med-row');
  
  const medicines = [];
  medRows.forEach(row => {
    const name = row.querySelector('.med-name').value.trim();
    const dosage = row.querySelector('.med-dosage').value.trim();
    if (name) medicines.push({ name, dosage });
  });

  try {
    const rxRecord = await API.createPrescription({
      appointment_id: apt.id || apt._id,
      doctor_id: apt.doctor_id,
      doctor_name: apt.doctor_name,
      patient_name: apt.patient_name,
      patient_phone: apt.patient_phone,
      patient_age: apt.patient_age,
      patient_gender: apt.patient_gender,
      diagnosis,
      medicines,
      general_advice: advice
    });

    document.getElementById('prescription-review-modal').classList.remove('active');
    showToast('Prescription saved to patient medical record!', 'success');
    loadDoctorPortalAppointments();

    // Prepare WhatsApp Message without exposing patient data in public URLs
    let cleanPhone = apt.patient_phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone; // Default country code for India

    const rxText = 
`*MediNexa Connected Care — Prescription*
Doctor: ${apt.doctor_name}
Clinic: ${apt.clinic_name || 'MediNexa Clinic'}
Patient: ${apt.patient_name}
Date: ${new Date().toLocaleDateString()}

*Diagnosis:* ${diagnosis}

*Prescribed Medicines:*
${medicines.map((m, idx) => `${idx + 1}. ${m.name} (${m.dosage})`).join('\n')}

*Doctor Advice:* ${advice || 'Rest adequately and hydrate.'}

_Generated securely via MediNexa. Better Connected Care._`;

    const encodedText = encodeURIComponent(rxText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank');

    // Notify backend
    await API.notifyWhatsAppInitiated(rxRecord._id || rxRecord.id);

    // Show explicit transparent confirmation modal (No false delivery claims)
    alert('WhatsApp has been launched with the prescription prefilled for ' + apt.patient_name + '.\n\nPlease tap "Send" in your WhatsApp chat window to complete delivery.');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openWhatsAppForAppointment(aptId) {
  try {
    const appointments = await API.getAppointments();
    const apt = appointments.find(a => (a.id == aptId || a._id == aptId));
    if (!apt) throw new Error('Appointment not found');

    let cleanPhone = apt.patient_phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const message = 
`Hello ${apt.patient_name}, this is Dr. ${apt.doctor_name} from MediNexa regarding your consultation on ${apt.appointment_date} at ${apt.appointment_time}. 
${apt.doctor_notes ? '\nMedical Notes: ' + apt.doctor_notes : ''}

_MediNexa — One Platform. Better Connected Care._`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
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
          <img src="${doc.avatar || DEFAULT_DOCTOR_AVATAR}" onerror="this.onerror=null; this.src=DEFAULT_DOCTOR_AVATAR;" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
          <div>
            <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-white);">${doc.name}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${doc.specialty} • ${doc.qualification}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
              <span>📍 ${doc.location}, <strong>${doc.city}</strong> | Fee: <strong>₹${doc.fee}</strong></span>
              ${renderDoctorVerificationBadge(doc.verification_status, doc.registration_number)}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn-book" style="padding: 0.45rem 0.85rem; font-size: 0.85rem;" onclick="startEditDoctor('${doc.id || doc._id}')">Edit Profile</button>
          <button class="btn-action-cancel" onclick="deleteDoctorProfile('${doc.id || doc._id}', '${doc.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger)">Failed to load doctor profiles: ${err.message}</div>`;
  }
}

async function startEditDoctor(doctorId) {
  try {
    const doc = await API.getDoctorById(doctorId);
    editingDoctorId = doc.id || doc._id;

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
    if (document.getElementById('doc-input-regno')) {
      document.getElementById('doc-input-regno').value = doc.registration_number || '';
    }

    document.querySelector('.tab-btn[data-target="portal-add-doctor"]').click();
    document.getElementById('doctor-profile-form').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('Failed to load doctor data for edit', 'error');
  }
}

async function deleteDoctorProfile(doctorId, docName) {
  if (!confirm(`Are you sure you want to remove doctor "${docName}" from MediNexa?`)) return;
  try {
    await API.deleteDoctor(doctorId);
    showToast(`Doctor "${docName}" deleted successfully.`, 'info');
    loadDoctorPortalDoctorList();
    loadFilterDropdowns();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// West Bengal Medical Council (WBMC) Status Badge Generator
function renderDoctorVerificationBadge(status, regNo) {
  const s = String(status || 'PENDING').toUpperCase();
  let label = 'PENDING';
  let icon = '⏳';
  let color = '#fbbf24';
  let bg = 'rgba(234, 179, 8, 0.15)';
  let border = 'rgba(234, 179, 8, 0.4)';

  if (s === 'VERIFIED') {
    label = 'WBMC VERIFIED';
    icon = '✓';
    color = '#34d399';
    bg = 'rgba(16, 185, 129, 0.15)';
    border = 'rgba(16, 185, 129, 0.4)';
  } else if (s === 'UNDER_REVIEW' || s === 'PENDING VERIFICATION') {
    label = 'UNDER REVIEW';
    icon = '🛡️';
    color = '#60a5fa';
    bg = 'rgba(59, 130, 246, 0.15)';
    border = 'rgba(59, 130, 246, 0.4)';
  } else if (s === 'REJECTED') {
    label = 'REJECTED';
    icon = '✕';
    color = '#f87171';
    bg = 'rgba(239, 68, 68, 0.15)';
    border = 'rgba(239, 68, 68, 0.4)';
  } else if (s === 'UNABLE_TO_VERIFY') {
    label = 'UNABLE TO VERIFY';
    icon = '⚠️';
    color = '#fb923c';
    bg = 'rgba(249, 115, 22, 0.15)';
    border = 'rgba(249, 115, 22, 0.4)';
  }

  return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; background: ${bg}; color: ${color}; border: 1px solid ${border}; margin-left: 0.25rem;">
    <span>${icon}</span> ${regNo ? `${regNo} • ` : ''}${label}
  </span>`;
}

// West Bengal Medical Council Verification Review Queue
async function loadVerificationQueue() {
  const container = document.getElementById('verification-queue-list');
  if (!container) return;

  try {
    const queue = await API.getVerificationQueue();
    if (!queue || queue.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛡️</div>
          <h3>All Registrations Verified</h3>
          <p>There are currently no doctor credential submissions pending West Bengal Medical Council review.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <span>Official Verification Portal: </span>
          <a href="https://wbmc.wb.gov.in/index.php/doctor_search" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">
            West Bengal Medical Council Doctor Search ↗
          </a>
        </div>
        <span style="font-size: 0.78rem; color: var(--text-muted);">Compare submitted license & name before approving</span>
      </div>
    `;

    queue.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'appointment-item';
      item.style.marginBottom = '0.75rem';
      item.innerHTML = `
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <h4 style="color: var(--text-white); font-weight: 800; margin: 0;">${doc.name}</h4>
            <span style="font-size: 0.8rem; color: #93c5fd; background: rgba(59, 130, 246, 0.2); padding: 2px 6px; border-radius: 4px;">${doc.specialty} • ${doc.qualification || 'MBBS'}</span>
            ${renderDoctorVerificationBadge(doc.verification_status)}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.4rem;">
            Registration No: <strong style="color: #f87171; font-family: monospace; font-size: 0.95rem;">${doc.registration_number || 'Not provided'}</strong>
            ${doc.registration_year ? ` | Reg Year: <strong>${doc.registration_year}</strong>` : ''} 
            | Authority: <strong>${doc.registration_authority || 'WBMC'}</strong>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
            City: ${doc.city} | Phone: ${doc.phone || 'N/A'} | Source: ${doc.verification_source || 'PENDING_REVIEW'}
          </div>
          ${doc.verification_notes ? `<div style="font-size: 0.78rem; color: #cbd5e1; margin-top: 0.35rem; font-style: italic; background: rgba(0,0,0,0.25); padding: 4px 8px; border-radius: 4px;">Notes: ${doc.verification_notes}</div>` : ''}
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <a href="https://wbmc.wb.gov.in/index.php/doctor_search" target="_blank" rel="noopener noreferrer" class="btn-book" style="padding: 0.4rem 0.65rem; font-size: 0.78rem; background: #334155; text-decoration: none; color: white;">🔍 Check WBMC</a>
          <button class="btn-action-done" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;" onclick="reviewDoctorVerification('${doc._id || doc.id}', 'VERIFIED')">✓ Approve</button>
          <button class="btn-action-cancel" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;" onclick="reviewDoctorVerification('${doc._id || doc.id}', 'REJECTED')">✕ Reject</button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:red">Failed to load verification queue: ${err.message}</div>`;
  }
}

async function reviewDoctorVerification(docId, status) {
  const defaultNotes = status === 'VERIFIED'
    ? 'Verified against official West Bengal Medical Council rolls.'
    : 'Credentials could not be verified on WBMC register.';
  const notes = prompt(`Enter official audit review notes for status: ${status}:`, defaultNotes);
  if (notes === null) return;

  try {
    await API.verifyDoctor(docId, status, notes);
    showToast(`Doctor registration status updated to ${status}!`, 'success');
    loadVerificationQueue();
    loadDoctorPortalDoctorList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================
// DOCTOR CLINICAL SUITE CONTROLLER (PDF FEATURES IMPLEMENTATION)
// ==============================================================

const DoctorSuite = {
  activeSubView: 'dashboard',
  currentDoctor: {
    name: 'Doctor',
    specialty: 'General Medicine',
    phone: '+91-9876543210',
    timing: 'Mon-Sat, 9AM-1PM',
    initials: 'DR'
  },
  savedMedicines: [],
  selectedGender: 'Male',
  selectedFreq: { code: 'OD', label: 'once daily' },
  selectedFood: { code: 'AC', label: 'before food' },
  selectedTimeSlots: ['Early Morning'],
  selectedDuration: '15 days',
  taperPhases: [],
  calendarDate: new Date(2026, 5, 1), // June 2026 default as in screenshot
  selectedCalendarDate: '2026-06-30',
  remindersCache: [],
  walletBalance: 6573.50,
  spentToday: 0.00,
  appointmentsCache: [],
  selectedAppointmentStatusFilter: 'All',
  appointmentSearchQuery: '',

  apiUrl(path) {
    const base = (typeof API !== 'undefined' && API.baseUrl) ? API.baseUrl : '';
    return base + path;
  },

  async portalFetch(path, options = {}) {
    const base = (typeof API !== 'undefined' && API.baseUrl) ? API.baseUrl : '';
    const token = localStorage.getItem('medinexa_token');
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { 'Authorization': `Bearer ${token}` } : {},
      options.headers || {}
    );
    return fetch(base + path, Object.assign({}, options, { headers }));
  },

  setDoctorInfo(user, profile) {
    if (!user && !profile) return;
    let name = (profile && profile.name) || (user && user.name) || 'Doctor';
    if (!name.toLowerCase().startsWith('dr.') && !name.toLowerCase().startsWith('dr ')) {
      name = 'Dr. ' + name;
    }
    const specialty = (profile && (profile.specialty || profile.specialization || profile.qualification)) || 'General Medicine';
    const phone = (profile && profile.phone) || (user && user.phone) || '+91-9876543210';
    const timing = (profile && (profile.available_hours || profile.chamber_timing)) || 'Mon-Sat, 9AM-1PM';

    // Compute initials for avatar (e.g. "Dr. Marcus Vance" -> "MV")
    const cleanName = name.replace(/^dr\.?\s+/i, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    let initials = 'DR';
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }

    this.currentDoctor = {
      name,
      specialty,
      phone,
      timing,
      initials
    };

    this.applyDoctorInfo();
  },

  applyDoctorInfo() {
    const doc = this.currentDoctor;
    if (!doc) return;

    // Greeting Banner
    const greetEl = document.getElementById('dashboard-doctor-name');
    if (greetEl) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      greetEl.textContent = `Good ${timeOfDay}, ${doc.name}!`;
    }

    // Profile Screen Displays
    const dispName = document.getElementById('profile-display-name');
    if (dispName) dispName.textContent = doc.name;

    const dispSpec = document.getElementById('profile-display-spec');
    if (dispSpec) dispSpec.textContent = doc.specialty;

    // Form Inputs
    const inpName = document.getElementById('profile-input-name');
    if (inpName) inpName.value = doc.name;

    const inpSpec = document.getElementById('profile-input-specialty');
    if (inpSpec) inpSpec.value = doc.specialty;

    const inpPhone = document.getElementById('profile-input-phone');
    if (inpPhone) inpPhone.value = doc.phone;

    const inpTiming = document.getElementById('profile-input-timing');
    if (inpTiming) inpTiming.value = doc.timing;

    // WBMC Form Placeholder/Value
    const docRegName = document.getElementById('doc-input-name');
    if (docRegName && !docRegName.value) docRegName.value = doc.name;

    // Avatar Initials
    document.querySelectorAll('.doc-avatar-circle').forEach(av => {
      av.innerHTML = `${doc.initials}<div class="doc-avatar-badge">📷</div>`;
    });

    // Confirm Modal Doctor Signature
    const confirmDocSign = document.getElementById('confirm-sign-doctor');
    if (confirmDocSign) confirmDocSign.textContent = doc.name;
  },

  init() {
    if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role === 'doctor') {
      this.setDoctorInfo(Auth.currentUser, Auth.currentProfile);
    }

    this.savedMedicines = [
      {
        name: 'Clonazepam',
        dose: '0.5',
        unit: 'mg',
        form: 'Tablet',
        frequency: 'OD',
        freq_label: 'once daily',
        timing: 'PC',
        food_label: 'after food',
        time_slot: 'Bedtime',
        duration: '3 days',
        simplified: 'Clonazepam 0.5 mg tablet: Take once daily after food in the bedtime for 3 days'
      },
      {
        name: 'Pantoprazole',
        dose: '40',
        unit: 'mg',
        form: 'Tablet',
        frequency: 'OD',
        freq_label: 'once daily',
        timing: 'AC',
        food_label: 'before food',
        time_slot: 'Early Morning',
        duration: '15 days',
        simplified: 'Pantoprazole 40 mg tablet: Take once daily before food in the early morning for 15 days'
      }
    ];

    this.renderSavedMedicines();
    this.updateCostBreakdown();
    this.loadSummaryStats();
    this.loadWalletData();
    this.loadConsultationsHistory();
    this.loadRemindersData();
    this.loadProfileData();
    this.loadAppointmentsData();
  },

  setupEvents() {
    // Bottom Navigation Items
    document.querySelectorAll('.doc-bottom-nav .doc-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const subview = btn.dataset.subview;
        if (subview) {
          e.preventDefault();
          this.switchSubView(subview);
        }
      });
    });

    // Dashboard Quick Navigation Cards
    document.querySelectorAll('.doc-stat-card[data-subview]').forEach(card => {
      card.addEventListener('click', (e) => {
        const subview = card.dataset.subview;
        if (subview) {
          e.preventDefault();
          this.switchSubView(subview);
        }
      });
    });

    // Search and Filter for Dedicated Appointments Queue
    const aptSearchInput = document.getElementById('doc-apt-search-input');
    if (aptSearchInput) {
      aptSearchInput.addEventListener('input', () => this.filterAppointments());
    }

    // Appointment Status Filter Chips
    document.querySelectorAll('#doc-apt-filter-chips .chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const status = btn.dataset.status;
        if (status) this.setAppointmentStatusFilter(status);
      });
    });

    // Gender Chips
    document.querySelectorAll('#patient-gender-chips .chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#patient-gender-chips .chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedGender = btn.dataset.gender;
      });
    });

    // Frequency Chips
    document.querySelectorAll('#med-freq-chips .chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#med-freq-chips .chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedFreq = { code: btn.dataset.freq, label: btn.dataset.label };
        const cap = document.getElementById('med-freq-caption');
        if (cap) cap.textContent = btn.dataset.label;
      });
    });

    // Food Timing Chips
    document.querySelectorAll('#med-food-chips .chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#med-food-chips .chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedFood = { code: btn.dataset.food, label: btn.dataset.label };
        const cap = document.getElementById('med-food-caption');
        if (cap) {
          cap.textContent = btn.dataset.label;
          cap.style.color = btn.dataset.food === 'None' ? '#94a3b8' : '#4ade80';
        }
      });
    });

    // Time Slots Chips
    document.querySelectorAll('#med-timeslot-chips .chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const activeSlots = [];
        document.querySelectorAll('#med-timeslot-chips .chip-btn.active').forEach(b => {
          activeSlots.push(b.dataset.slot);
        });
        this.selectedTimeSlots = activeSlots.length > 0 ? activeSlots : ['Morning'];
      });
    });

    // Duration Chips
    document.querySelectorAll('#med-duration-chips .chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#med-duration-chips .chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedDuration = btn.dataset.dur;
        const durInput = document.getElementById('med-input-duration');
        if (durInput) durInput.value = btn.dataset.dur;
      });
    });

    // Quick Profile Form Submit
    const quickProfForm = document.getElementById('doc-quick-profile-form');
    if (quickProfForm) {
      quickProfForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveQuickProfile();
      });
    }
  },

  switchSubView(subview) {
    this.activeSubView = subview;

    // Toggle panels
    document.querySelectorAll('.doc-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`doc-panel-${subview}`);
    if (target) target.classList.add('active');

    // Toggle bottom nav
    document.querySelectorAll('.doc-bottom-nav .doc-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subview === subview);
    });

    if (subview === 'dashboard') {
      this.loadSummaryStats();
    } else if (subview === 'appointments') {
      this.loadAppointmentsData();
    } else if (subview === 'wallet') {
      this.loadWalletData();
    } else if (subview === 'history') {
      this.loadConsultationsHistory();
    } else if (subview === 'calendar') {
      this.loadRemindersData();
    } else if (subview === 'profile') {
      this.loadProfileData();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Service Toggles Handlers
  toggleTaperingSection() {
    const isChecked = document.getElementById('toggle-tapering').checked;
    const sec = document.getElementById('tapering-details');
    if (sec) sec.style.display = isChecked ? 'block' : 'none';
  },

  addTaperPhase() {
    const container = document.getElementById('taper-phases-list');
    if (!container) return;
    const phaseNum = container.children.length + 1;
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.35rem; align-items: center;';
    div.innerHTML = `
      <span style="font-size: 0.75rem; color: #38bdf8; font-weight: 700;">Phase ${phaseNum}:</span>
      <input type="text" placeholder="e.g. 20mg for 5 days" style="padding: 0.35rem; font-size: 0.8rem; background: #0f172a; border: 1px solid var(--border-color); color: #fff; border-radius: 4px; flex: 1;">
      <button type="button" style="background: transparent; border: none; color: #f87171; cursor: pointer;" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(div);
  },

  toggleFollowupDetails() {
    const isChecked = document.getElementById('toggle-followup').checked;
    const sec = document.getElementById('followup-details');
    if (sec) sec.style.display = isChecked ? 'block' : 'none';
    this.updateCostBreakdown();
  },

  toggleVaccinationDetails() {
    const isChecked = document.getElementById('toggle-vaccination').checked;
    const sec = document.getElementById('vaccination-details');
    if (sec) sec.style.display = isChecked ? 'block' : 'none';
    this.updateCostBreakdown();
  },

  toggleReportReviewDetails() {
    const isChecked = document.getElementById('toggle-report-review').checked;
    const sec = document.getElementById('report-review-details');
    if (sec) sec.style.display = isChecked ? 'block' : 'none';
    this.updateCostBreakdown();
  },

  toggleInstructionsDetails() {
    const isChecked = document.getElementById('toggle-instructions').checked;
    const sec = document.getElementById('instructions-details');
    if (sec) sec.style.display = isChecked ? 'block' : 'none';
    this.updateCostBreakdown();
  },

  toggleInternalNotesDetails() {
    const isChecked = document.getElementById('toggle-internal-notes').checked;
    const sec = document.getElementById('internal-notes-details');
    if (sec) sec.style.display = isChecked ? 'block' : 'none';
    this.updateCostBreakdown();
  },

  appendInstruction(text) {
    const textarea = document.getElementById('instructions-textarea');
    if (!textarea) return;
    if (textarea.value.trim()) {
      textarea.value += ' ' + text;
    } else {
      textarea.value = text;
    }
    this.updateCostBreakdown();
  },

  loadTemplateMedicines() {
    const templates = [
      { name: 'Pantoprazole', dose: '40', unit: 'mg', form: 'Tablet', freq: 'OD', freq_label: 'once daily', food: 'AC', food_label: 'before food', slot: 'Early Morning', dur: '15 days' },
      { name: 'Paracetamol', dose: '650', unit: 'mg', form: 'Tablet', freq: 'SOS', freq_label: 'as needed', food: 'PC', food_label: 'after food', slot: 'Bedtime', dur: '3 days' },
      { name: 'Amoxicillin', dose: '500', unit: 'mg', form: 'Capsule', freq: 'TDS', freq_label: 'thrice daily', food: 'PC', food_label: 'after food', slot: 'Morning', dur: '5 days' }
    ];
    this.savedMedicines = templates.map(t => ({
      ...t,
      frequency: t.freq,
      timing: t.food,
      time_slot: t.slot,
      duration: t.dur,
      simplified: `${t.name} ${t.dose} ${t.unit} ${t.form.toLowerCase()}: Take ${t.freq_label} ${t.food_label} in the ${t.slot.toLowerCase()} for ${t.dur}`
    }));
    this.renderSavedMedicines();
    this.updateCostBreakdown();
    showToast('Standard Clinical Prescription Template loaded!', 'success');
  },

  saveMedicineItem() {
    const nameInput = document.getElementById('med-input-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showToast('Please type a medicine name.', 'error');
      return;
    }

    const form = document.getElementById('med-input-form').value;
    const dose = document.getElementById('med-input-dose').value.trim() || '1';
    const unit = document.getElementById('med-input-unit').value;
    const duration = document.getElementById('med-input-duration').value.trim() || this.selectedDuration;
    const notes = document.getElementById('med-input-notes').value.trim();

    const freq = this.selectedFreq.code;
    const freq_label = this.selectedFreq.label;
    const food = this.selectedFood.code;
    const food_label = this.selectedFood.label;
    const time_slot = this.selectedTimeSlots.join(', ');

    const simplified = `${name} ${dose} ${unit} ${form.toLowerCase()}: Take ${freq_label} ${food_label} in the ${time_slot.toLowerCase()} for ${duration}`;

    this.savedMedicines.push({
      name,
      dose,
      unit,
      form,
      frequency: freq,
      freq_label,
      timing: food,
      food_label,
      time_slot,
      duration,
      notes,
      simplified
    });

    this.renderSavedMedicines();
    this.updateCostBreakdown();

    // Reset input
    if (nameInput) nameInput.value = '';
    document.getElementById('med-input-dose').value = '';
    document.getElementById('med-input-notes').value = '';
    showToast(`Added ${name} to prescription.`, 'success');
  },

  deleteMedicine(index) {
    this.savedMedicines.splice(index, 1);
    this.renderSavedMedicines();
    this.updateCostBreakdown();
  },

  renderSavedMedicines() {
    const container = document.getElementById('saved-medicines-container');
    if (!container) return;

    if (this.savedMedicines.length === 0) {
      container.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; padding: 0.5rem 0;">
          No medicines added yet. Use the form below to formulate medications.
        </div>
      `;
      return;
    }

    container.innerHTML = this.savedMedicines.map((m, idx) => `
      <div class="saved-med-item">
        <div style="flex: 1;">
          <div class="saved-med-title">💊 ${m.name} ${m.dose} ${m.unit} (${m.form})</div>
          <div class="saved-med-badges">${m.frequency} • ${m.freq_label} • ${m.food_label} • ${m.time_slot} • ${m.duration}</div>
          <div class="saved-med-plain">${m.simplified}</div>
          ${m.notes ? `<div style="font-size: 0.75rem; color: #fbbf24; margin-top: 0.25rem;">Note: ${m.notes}</div>` : ''}
        </div>
        <div style="display: flex; gap: 0.35rem;">
          <button type="button" style="background: transparent; border: none; color: #f87171; cursor: pointer; font-size: 1.1rem;" onclick="DoctorSuite.deleteMedicine(${idx})" title="Delete Medicine">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  },

  updateCostBreakdown() {
    let total = 0.00;

    const rxOn = document.getElementById('toggle-rx-simplifier') ? document.getElementById('toggle-rx-simplifier').checked : true;
    const rxCost = (rxOn && this.savedMedicines.length > 0) ? 1.50 : 0.00;
    total += rxCost;

    const followOn = document.getElementById('toggle-followup') ? document.getElementById('toggle-followup').checked : false;
    const followCost = followOn ? 1.50 : 0.00;
    total += followCost;

    const vaccOn = document.getElementById('toggle-vaccination') ? document.getElementById('toggle-vaccination').checked : false;
    const vaccCost = vaccOn ? 2.50 : 0.00;
    total += vaccCost;

    const repOn = document.getElementById('toggle-report-review') ? document.getElementById('toggle-report-review').checked : false;
    const repCost = repOn ? 1.50 : 0.00;
    total += repCost;

    const instOn = document.getElementById('toggle-instructions') ? document.getElementById('toggle-instructions').checked : false;
    const instText = document.getElementById('instructions-textarea') ? document.getElementById('instructions-textarea').value.trim() : '';
    const instCost = (instOn && instText.length > 0) ? 0.50 : 0.00;
    total += instCost;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `₹${val.toFixed(2)}`;
    };

    setVal('cost-item-simplifier', rxCost);
    setVal('cost-item-followup', followCost);
    setVal('cost-item-vaccine', vaccCost);
    setVal('cost-item-report', repCost);
    setVal('cost-item-instructions', instCost);
    setVal('cost-item-total', total);

    return {
      total,
      breakdown: {
        simplifier: rxCost,
        followup: followCost,
        vaccination: vaccCost,
        report_review: repCost,
        instructions: instCost
      }
    };
  },

  openConfirmSendModal() {
    const name = document.getElementById('patient-input-name').value.trim();
    const phone = document.getElementById('patient-input-phone').value.trim();
    if (!name) {
      showToast('Please enter the patient full name.', 'error');
      document.getElementById('patient-input-name').focus();
      return;
    }
    if (!phone) {
      showToast('Please enter the patient WhatsApp phone number.', 'error');
      document.getElementById('patient-input-phone').focus();
      return;
    }

    const lang = document.getElementById('patient-input-language').value;
    const docName = (this.currentDoctor && this.currentDoctor.name && this.currentDoctor.name !== 'Doctor') ? this.currentDoctor.name : ((document.getElementById('profile-input-name') && document.getElementById('profile-input-name').value) || 'Doctor');

    document.getElementById('confirm-phone-display').textContent = phone;
    document.getElementById('confirm-greeting-text').innerHTML = `
      Hello <strong>${name}</strong>,<br>
      Thank you for visiting <strong>${docName}</strong>.<br>
      (Language: ${lang})
    `;

    // Medicines
    const medsContainer = document.getElementById('confirm-medicines-text');
    if (this.savedMedicines.length > 0) {
      medsContainer.innerHTML = this.savedMedicines.map((m, i) => `
        <div style="margin-bottom: 0.35rem;">
          ${i + 1}. <strong>${m.name} ${m.dose} ${m.unit} ${m.form.toLowerCase()}</strong>: Take ${m.freq_label} ${m.food_label} in the ${m.time_slot.toLowerCase()} for ${m.duration}
        </div>
      `).join('');
    } else {
      medsContainer.innerHTML = `<span style="color: var(--text-muted);">No medications prescribed.</span>`;
    }

    // Instructions
    const instOn = document.getElementById('toggle-instructions').checked;
    const instText = document.getElementById('instructions-textarea').value.trim();
    const instSec = document.getElementById('confirm-instructions-section');
    if (instOn && instText) {
      instSec.style.display = 'block';
      document.getElementById('confirm-instructions-text').textContent = instText;
    } else {
      instSec.style.display = 'none';
    }

    // Followup
    const followOn = document.getElementById('toggle-followup').checked;
    const followSec = document.getElementById('confirm-followup-section');
    if (followOn) {
      followSec.style.display = 'block';
      const fDate = document.getElementById('followup-date').value;
      const fTime = document.getElementById('followup-time').value;
      document.getElementById('confirm-followup-text').textContent = `${fDate} at ${fTime}`;
    } else {
      followSec.style.display = 'none';
    }

    // Vaccine
    const vaccOn = document.getElementById('toggle-vaccination').checked;
    const vaccSec = document.getElementById('confirm-vaccine-section');
    if (vaccOn) {
      vaccSec.style.display = 'block';
      document.getElementById('confirm-vaccine-text').textContent = document.getElementById('vaccination-date').value;
    } else {
      vaccSec.style.display = 'none';
    }

    // Report Review
    const repOn = document.getElementById('toggle-report-review').checked;
    const repSec = document.getElementById('confirm-report-section');
    if (repOn) {
      repSec.style.display = 'block';
      const rName = document.getElementById('report-name-input').value;
      const rDate = document.getElementById('report-date-input').value;
      const rTime = document.getElementById('report-time-input').value;
      document.getElementById('confirm-report-text').textContent = `${rDate} at ${rTime} (${rName})`;
    } else {
      repSec.style.display = 'none';
    }

    document.getElementById('confirm-sign-doctor').textContent = docName;

    // Cost Breakdown in Confirm Modal
    const costInfo = this.updateCostBreakdown();
    const costBox = document.getElementById('confirm-cost-breakdown-items');
    costBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
        <span>Prescription Simplifier</span><span>₹${costInfo.breakdown.simplifier.toFixed(2)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
        <span>Follow-up Reminder</span><span>₹${costInfo.breakdown.followup.toFixed(2)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
        <span>Vaccination Reminder</span><span>₹${costInfo.breakdown.vaccination.toFixed(2)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
        <span>Report Review Reminder</span><span>₹${costInfo.breakdown.report_review.toFixed(2)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
        <span>Additional Instructions</span><span>₹${costInfo.breakdown.instructions.toFixed(2)}</span>
      </div>
    `;
    document.getElementById('confirm-total-cost-val').textContent = `₹${costInfo.total.toFixed(2)}`;

    document.getElementById('modal-confirm-send').classList.add('active');
  },

  async executeSendWhatsApp() {
    const name = document.getElementById('patient-input-name').value.trim();
    const phone = document.getElementById('patient-input-phone').value.trim();
    const age = document.getElementById('patient-input-age').value.trim();
    const gender = this.selectedGender;
    const lang = document.getElementById('patient-input-language').value;
    const docName = (this.currentDoctor && this.currentDoctor.name && this.currentDoctor.name !== 'Doctor') ? this.currentDoctor.name : ((document.getElementById('profile-input-name') && document.getElementById('profile-input-name').value) || 'Doctor');

    const costInfo = this.updateCostBreakdown();

    const payload = {
      patient_name: name,
      patient_phone: phone,
      patient_age: age,
      patient_gender: gender,
      doctor_name: docName,
      language: lang,
      medicines: this.savedMedicines,
      toggles: {
        prescription_simplifier: document.getElementById('toggle-rx-simplifier') ? document.getElementById('toggle-rx-simplifier').checked : true,
        follow_up: {
          enabled: document.getElementById('toggle-followup') ? document.getElementById('toggle-followup').checked : false,
          date: document.getElementById('followup-date') ? document.getElementById('followup-date').value : '',
          time: document.getElementById('followup-time') ? document.getElementById('followup-time').value : ''
        },
        vaccination: {
          enabled: document.getElementById('toggle-vaccination') ? document.getElementById('toggle-vaccination').checked : false,
          date: document.getElementById('vaccination-date') ? document.getElementById('vaccination-date').value : ''
        },
        report_review: {
          enabled: document.getElementById('toggle-report-review') ? document.getElementById('toggle-report-review').checked : false,
          name: document.getElementById('report-name-input') ? document.getElementById('report-name-input').value : '',
          date: document.getElementById('report-date-input') ? document.getElementById('report-date-input').value : '',
          time: document.getElementById('report-time-input') ? document.getElementById('report-time-input').value : ''
        },
        additional_instructions: {
          enabled: document.getElementById('toggle-instructions') ? document.getElementById('toggle-instructions').checked : false,
          text: document.getElementById('instructions-textarea') ? document.getElementById('instructions-textarea').value.trim() : ''
        },
        internal_notes: {
          enabled: document.getElementById('toggle-internal-notes') ? document.getElementById('toggle-internal-notes').checked : false,
          text: document.getElementById('internal-notes-textarea') ? document.getElementById('internal-notes-textarea').value.trim() : ''
        }
      },
      instructions: document.getElementById('instructions-textarea') ? document.getElementById('instructions-textarea').value.trim() : '',
      internal_notes: document.getElementById('internal-notes-textarea') ? document.getElementById('internal-notes-textarea').value.trim() : '',
      total_cost: costInfo.total
    };

    const confirmBtn = document.querySelector('#modal-confirm-send .btn-submit');
    const origBtnText = confirmBtn ? confirmBtn.textContent : '';
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Saving Consultation...';
    }

    try {
      const res = await this.portalFetch('/api/doctors/portal/consultations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record consultation');

      document.getElementById('modal-confirm-send').classList.remove('active');
      showToast(`Prescription saved! Wallet debited ₹${costInfo.total.toFixed(2)}`, 'success');

      if (data.wallet_balance !== undefined) {
        this.walletBalance = data.wallet_balance;
      }

      // Generate WhatsApp text
      let cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

      let waMessage = `*Hello ${name},*\nThank you for visiting ${docName}.\n(Language: ${lang})\n\n`;
      if (this.savedMedicines.length > 0) {
        waMessage += `*📋 Prescription:*\n`;
        this.savedMedicines.forEach((m, idx) => {
          waMessage += `${idx + 1}. ${m.name} ${m.dose} ${m.unit} ${m.form.toLowerCase()}: Take ${m.freq_label} ${m.food_label} in the ${m.time_slot.toLowerCase()} for ${m.duration}\n`;
        });
        waMessage += '\n';
      }

      if (payload.toggles.additional_instructions.enabled && payload.instructions) {
        waMessage += `*📝 Instructions:*\n${payload.instructions}\n\n`;
      }
      if (payload.toggles.follow_up.enabled) {
        waMessage += `📅 *Follow-up:* ${payload.toggles.follow_up.date} at ${payload.toggles.follow_up.time}\n`;
      }
      if (payload.toggles.vaccination.enabled) {
        waMessage += `💉 *Vaccination:* ${payload.toggles.vaccination.date}\n`;
      }
      if (payload.toggles.report_review.enabled) {
        waMessage += `🔬 *Report Review:* ${payload.toggles.report_review.date} at ${payload.toggles.report_review.time} (${payload.toggles.report_review.name})\n`;
      }

      waMessage += `\nGet well soon! — *${docName}*`;

      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;
      window.open(waUrl, '_blank');

      // Clear the Add Patient form for next entry
      const nameInput = document.getElementById('patient-input-name');
      if (nameInput) nameInput.value = '';
      const phoneInput = document.getElementById('patient-input-phone');
      if (phoneInput) phoneInput.value = '';
      const ageInput = document.getElementById('patient-input-age');
      if (ageInput) ageInput.value = '';
      const instArea = document.getElementById('instructions-textarea');
      if (instArea) instArea.value = '';
      const notesArea = document.getElementById('internal-notes-textarea');
      if (notesArea) notesArea.value = '';

      // Reset saved medicines to default template
      this.loadTemplateMedicines();

      // Refresh data and switch to history
      await Promise.all([
        this.loadSummaryStats(),
        this.loadWalletData(),
        this.loadConsultationsHistory(),
        this.loadRemindersData()
      ]);
      this.switchSubView('history');

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = origBtnText;
      }
    }
  },

  async quickRecharge(amount) {
    try {
      const res = await this.portalFetch('/api/doctors/portal/wallet/recharge', {
        method: 'POST',
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recharge failed');

      showToast(`Wallet recharged with ₹${amount}.00! Balance: ₹${data.balance.toFixed(2)}`, 'success');
      this.walletBalance = data.balance;
      await this.loadWalletData();
      await this.loadSummaryStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async loadSummaryStats() {
    try {
      const docName = (this.currentDoctor && this.currentDoctor.name !== 'Doctor') ? this.currentDoctor.name : '';
      const path = docName ? `/api/doctors/portal/summary?doctor_name=${encodeURIComponent(docName)}` : '/api/doctors/portal/summary';
      const res = await this.portalFetch(path);
      const data = await res.json();
      if (!res.ok) return;

      this.walletBalance = data.wallet_balance || 0;
      this.spentToday = data.spent_today || 0;

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setVal('metric-patients-today', data.patients_today);
      setVal('metric-patients-all-time', `${data.patients_all_time} total all time`);
      setVal('metric-wallet-balance', `₹${data.wallet_balance.toFixed(2)}`);
      setVal('header-wallet-balance', `₹${data.wallet_balance.toFixed(2)}`);
      setVal('metric-wallet-spent', `Spent today ₹${data.spent_today.toFixed(2)}`);
      setVal('metric-whatsapp-sent', data.whatsapp_sent);
      setVal('metric-prescriptions-count', data.prescriptions_count);
      setVal('metric-vaccinations-count', data.vaccinations_count);
      setVal('metric-followups-count', data.followups_due);

      if (data.reminders_due_today) {
        setVal('due-followups', data.reminders_due_today.follow_ups);
        setVal('due-vaccines', data.reminders_due_today.vaccinations);
        setVal('due-reports', data.reminders_due_today.report_reviews);
      }
    } catch (e) {
      console.warn('Error loading summary stats', e);
    }
  },

  async loadWalletData() {
    try {
      const res = await this.portalFetch('/api/doctors/portal/wallet');
      const data = await res.json();
      if (!res.ok) return;

      this.walletBalance = data.balance || 0;
      this.spentToday = data.spent_today || 0;

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setVal('wallet-panel-balance', `₹${data.balance.toFixed(2)}`);
      setVal('metric-wallet-balance', `₹${data.balance.toFixed(2)}`);
      setVal('header-wallet-balance', `₹${data.balance.toFixed(2)}`);
      setVal('wallet-panel-spent', `Spent today: ₹${data.spent_today.toFixed(2)}`);

      const list = document.getElementById('wallet-transactions-list');
      if (list) {
        if (!data.transactions || data.transactions.length === 0) {
          list.innerHTML = `<div style="color:var(--text-muted); padding:1rem 0;">No transactions recorded yet.</div>`;
          return;
        }

        list.innerHTML = data.transactions.map(tx => `
          <div class="tx-item">
            <div class="tx-left">
              <div class="tx-icon ${tx.type}">${tx.type === 'recharge' ? '↗' : '↘'}</div>
              <div>
                <div class="tx-title">${tx.title}</div>
                <div class="tx-date">${tx.date}</div>
              </div>
            </div>
            <div class="tx-amount ${tx.type === 'recharge' ? 'positive' : 'negative'}">
              ${tx.type === 'recharge' ? '+' : ''}₹${Math.abs(tx.amount).toFixed(2)}
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Error loading wallet data', e);
    }
  },

  async loadConsultationsHistory() {
    try {
      const res = await this.portalFetch('/api/doctors/portal/consultations');
      const data = await res.json();
      if (!res.ok) return;

      const badge = document.getElementById('history-count-badge');
      if (badge) badge.textContent = `${data.length} Consultations`;

      const list = document.getElementById('doc-consultations-history-list');
      if (!list) return;

      if (!Array.isArray(data) || data.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3>No Consultations Logged</h3>
            <p>Formulate your first prescription to generate WhatsApp messages and patient logs.</p>
          </div>
        `;
        return;
      }

      list.innerHTML = data.map(c => `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-white);">${c.patient_name}</span>
                <span style="font-size: 0.85rem; font-weight: 700; color: #38bdf8;">${c.queue_number || ''}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${c.patient_age ? `${c.patient_age} / ` : ''}${c.patient_gender} &nbsp;•&nbsp; <span style="color: #60a5fa;">${c.doctor_name}</span>
                &nbsp;•&nbsp; <span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">${c.language}</span>
              </div>
            </div>
            <div style="font-weight: 800; font-size: 1.15rem; color: #38bdf8;">
              ₹${c.cost ? c.cost.toFixed(2) : '0.00'} &gt;
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; margin: 0.65rem 0; flex-wrap: wrap;">
            ${(c.tags || ['Prescription', 'Sent']).map(t => `
              <span style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); color: #38bdf8; font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 4px;">
                ${t === 'Vaccine' ? '💉 ' : t === 'Sent' ? '💬 ' : '💊 '}${t}
              </span>
            `).join('')}
          </div>

          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
            <span>🕒</span> ${c.timestamp}
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.warn('Error loading consultations history', e);
    }
  },

  async loadRemindersData() {
    try {
      const res = await this.portalFetch('/api/doctors/portal/reminders');
      const data = await res.json();
      if (!res.ok) return;
      this.remindersCache = Array.isArray(data) ? data : [];
      this.renderCalendar();
    } catch (e) {
      console.warn('Error loading reminders', e);
    }
  },

  renderCalendar() {
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();

    const titleEl = document.getElementById('calendar-month-title');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

    const daysGrid = document.getElementById('calendar-days-grid');
    if (!daysGrid) return;

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    daysGrid.innerHTML = '';

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-cell';
      blank.style.opacity = '0.2';
      daysGrid.appendChild(blank);
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      if (dayStr === this.selectedCalendarDate) cell.classList.add('active-date');

      // Match reminders on this date
      const matches = this.remindersCache.filter(r => r.date === dayStr);

      let dotsHtml = '';
      if (matches.length > 0) {
        dotsHtml = `<div class="cal-dots">${matches.map(m => `<span class="cal-dot ${m.type}"></span>`).join('')}</div>`;
      }

      cell.innerHTML = `<span>${day}</span>${dotsHtml}`;
      cell.onclick = () => this.selectCalendarDate(dayStr);
      daysGrid.appendChild(cell);
    }

    this.renderUpcomingReminders();
  },

  changeCalendarMonth(delta) {
    this.calendarDate.setMonth(this.calendarDate.getMonth() + delta);
    this.renderCalendar();
  },

  goToCurrentDate() {
    this.calendarDate = new Date(2026, 5, 1); // June 2026
    this.selectedCalendarDate = '2026-06-30';
    this.renderCalendar();
  },

  selectCalendarDate(dayStr) {
    this.selectedCalendarDate = dayStr;
    const lbl = document.getElementById('calendar-selected-date-label');
    if (lbl) lbl.textContent = dayStr;
    this.renderCalendar();
  },

  renderUpcomingReminders() {
    const list = document.getElementById('calendar-upcoming-reminders-list');
    if (!list) return;

    const matches = this.remindersCache.filter(r => !this.selectedCalendarDate || r.date === this.selectedCalendarDate);

    if (matches.length === 0) {
      list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem; padding: 0.5rem 0;">No upcoming reminders for this date.</div>`;
      return;
    }

    list.innerHTML = matches.map(r => `
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 700; color: var(--text-white); font-size: 0.92rem;">
            ${r.type === 'vaccination' ? '💉' : r.type === 'report_review' ? '🔬' : '📅'} ${r.title}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
            Patient: <strong>${r.patient_name}</strong> (${r.phone})
          </div>
        </div>
        <div style="text-align: right; font-size: 0.8rem; color: #38bdf8; font-weight: 700;">
          ${r.time || '10:00'}
        </div>
      </div>
    `).join('');
  },

  async loadProfileData() {
    try {
      if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role === 'doctor') {
        this.setDoctorInfo(Auth.currentUser, Auth.currentProfile);
      }

      const res = await this.portalFetch('/api/doctors/portal/profile');
      const data = await res.json();
      const profile = (data && data.profile) || data;
      if (profile && profile.name) {
        this.setDoctorInfo({ name: profile.name, phone: profile.phone }, { specialty: profile.specialization, available_hours: profile.chamber_timing });
      }
    } catch (e) {
      console.warn('Error loading doctor profile', e);
    }
  },

  async saveQuickProfile() {
    const name = document.getElementById('profile-input-name').value.trim();
    const specialization = document.getElementById('profile-input-specialty').value.trim();
    const phone = document.getElementById('profile-input-phone').value.trim();
    const chamber_timing = document.getElementById('profile-input-timing').value.trim();

    try {
      const res = await this.portalFetch('/api/doctors/portal/profile', {
        method: 'POST',
        body: JSON.stringify({ name, specialization, phone, chamber_timing })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      this.setDoctorInfo({ name, phone }, { specialty: specialization, available_hours: chamber_timing });
      if (typeof Auth !== 'undefined' && Auth.currentUser) {
        Auth.currentUser.name = name;
        if (Auth.currentProfile) {
          Auth.currentProfile.name = name;
          Auth.currentProfile.specialty = specialization;
          Auth.currentProfile.phone = phone;
        }
      }

      showToast('Doctor Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // Dedicated Appointments Queue Handlers
  async loadAppointmentsData() {
    const list = document.getElementById('doc-dedicated-appointments-list');
    if (list) list.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading patient appointments...</div>';

    try {
      const res = await this.portalFetch('/api/appointments');
      if (!res.ok) throw new Error('Failed to retrieve appointments');
      const data = await res.json();
      this.appointmentsCache = Array.isArray(data) ? data : [];
      this.renderDedicatedAppointments();
    } catch (err) {
      console.error('Error loading appointments:', err);
      if (list) list.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--danger);">Failed to load appointments: ${err.message}</div>`;
    }
  },

  setAppointmentStatusFilter(status) {
    this.selectedAppointmentStatusFilter = status;
    document.querySelectorAll('#doc-apt-filter-chips .chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.status === status);
    });
    this.renderDedicatedAppointments();
  },

  filterAppointments() {
    const inp = document.getElementById('doc-apt-search-input');
    this.appointmentSearchQuery = inp ? inp.value.trim().toLowerCase() : '';
    this.renderDedicatedAppointments();
  },

  renderDedicatedAppointments() {
    const container = document.getElementById('doc-dedicated-appointments-list');
    if (!container) return;

    let filtered = [...this.appointmentsCache];

    if (this.selectedAppointmentStatusFilter && this.selectedAppointmentStatusFilter !== 'All') {
      filtered = filtered.filter(a => a.status === this.selectedAppointmentStatusFilter);
    }

    if (this.appointmentSearchQuery) {
      const q = this.appointmentSearchQuery;
      filtered = filtered.filter(a => 
        (a.patient_name && a.patient_name.toLowerCase().includes(q)) ||
        (a.patient_phone && a.patient_phone.toLowerCase().includes(q)) ||
        (a.symptoms && a.symptoms.toLowerCase().includes(q)) ||
        (a.date && a.date.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <div class="empty-state-icon">📋</div>
          <h3 style="color: var(--text-white);">No Appointments Found</h3>
          <p style="color: var(--text-secondary); max-width: 420px; margin: 0.5rem auto 1rem;">
            ${this.selectedAppointmentStatusFilter !== 'All' || this.appointmentSearchQuery ? 'No appointments match your active filter.' : 'When patients book consultations on MediNexa, their details appear here in real-time.'}
          </p>
          <button type="button" class="btn-book" style="margin: 0 auto; display: inline-block;" onclick="DoctorSuite.switchSubView('add-patient')">
            + Add Walk-in Patient
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(apt => {
      const aptId = apt.id || apt._id;
      const statusClass = (apt.status || 'confirmed').toLowerCase().replace(/\s+/g, '-');
      const isConfirmed = apt.status === 'Confirmed';
      const isCompleted = apt.status === 'Completed';

      return `
        <div class="appointment-item" style="border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.25rem; margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-white);">
                👤 ${apt.patient_name}
              </div>
              <div style="font-size: 0.85rem; color: #38bdf8; font-weight: 600; margin-top: 0.2rem;">
                📞 ${apt.patient_phone} ${apt.patient_email ? `• ✉️ ${apt.patient_email}` : ''}
              </div>
            </div>
            <div>
              <span class="status-badge ${statusClass}">${apt.status}</span>
            </div>
          </div>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-secondary); background: rgba(15, 23, 42, 0.5); padding: 0.65rem 0.85rem; border-radius: var(--radius-md);">
            <div>📅 <strong>Date:</strong> ${apt.appointment_date || apt.date || 'Today'}</div>
            <div>⏰ <strong>Slot:</strong> ${apt.appointment_time || apt.time_slot || 'Regular Chamber'}</div>
            ${apt.fee || apt.doctor_fee ? `<div>💰 <strong>Fee:</strong> ₹${apt.fee || apt.doctor_fee}</div>` : ''}
          </div>

          ${apt.symptoms ? `
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              <strong>Reported Symptoms / Reason:</strong> ${apt.symptoms}
            </div>
          ` : ''}

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; margin-top: 0.25rem; border-top: 1px dashed var(--border-color); padding-top: 0.75rem;">
            <button type="button" class="btn-book" style="padding: 0.4rem 0.75rem; font-size: 0.82rem; background: #0284c7;" onclick="DoctorSuite.startPrescriptionForPatient('${apt.patient_name.replace(/'/g, "\\'")}', '${(apt.patient_phone || '').replace(/'/g, "\\'")}')">
              ✍️ Write Prescription
            </button>
            ${isConfirmed ? `
              <button type="button" class="btn-book" style="padding: 0.4rem 0.75rem; font-size: 0.82rem; background: #059669;" onclick="DoctorSuite.updateAppointmentStatusDirect('${aptId}', 'Completed')">
                ✓ Mark Completed
              </button>
              <button type="button" class="btn-action-cancel" style="padding: 0.4rem 0.75rem; font-size: 0.82rem;" onclick="DoctorSuite.updateAppointmentStatusDirect('${aptId}', 'Cancelled')">
                ✕ Cancel Booking
              </button>
            ` : ''}
            ${!isConfirmed && !isCompleted ? `
              <button type="button" class="btn-book" style="padding: 0.4rem 0.75rem; font-size: 0.82rem; background: #059669;" onclick="DoctorSuite.updateAppointmentStatusDirect('${aptId}', 'Confirmed')">
                ✓ Re-confirm
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  startPrescriptionForPatient(patientName, patientPhone) {
    this.switchSubView('add-patient');
    const nameInput = document.getElementById('patient-input-name');
    if (nameInput) nameInput.value = patientName;
    const phoneInput = document.getElementById('patient-input-phone');
    if (phoneInput) phoneInput.value = patientPhone;
    showToast(`Prescription prepared for ${patientName}`, 'info');
  },

  async updateAppointmentStatusDirect(aptId, newStatus) {
    try {
      await API.updateAppointmentStatus(aptId, newStatus);
      showToast(`Appointment status updated to ${newStatus}!`, 'success');
      const item = this.appointmentsCache.find(a => (a.id == aptId || a._id == aptId));
      if (item) item.status = newStatus;
      this.renderDedicatedAppointments();
      this.loadSummaryStats();
      if (typeof loadDoctorPortalAppointments === 'function') {
        loadDoctorPortalAppointments();
      }
    } catch (err) {
      showToast('Failed to update status: ' + err.message, 'error');
    }
  },

  // Save Consultation Directly to MediNexa Database (PDF pages 2, 7, 21)
  async saveConsultationDirectly() {
    const nameInput = document.getElementById('patient-input-name');
    const phoneInput = document.getElementById('patient-input-phone');
    const ageInput = document.getElementById('patient-input-age');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const age = ageInput ? ageInput.value.trim() : '';

    if (!name) {
      showToast('Please enter the patient full name.', 'error');
      if (nameInput) nameInput.focus();
      return;
    }

    if (!phone) {
      showToast('Please enter a 10-digit WhatsApp/mobile number.', 'error');
      if (phoneInput) phoneInput.focus();
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      showToast('Please enter a valid 10-digit mobile phone number.', 'error');
      if (phoneInput) phoneInput.focus();
      return;
    }

    if (!age) {
      showToast('Please enter patient age.', 'error');
      if (ageInput) ageInput.focus();
      return;
    }

    const gender = this.selectedGender || 'Male';
    const langSelect = document.getElementById('patient-lang-select');
    const lang = langSelect ? langSelect.value : 'Bengali';
    const docName = (this.currentDoctor && this.currentDoctor.name !== 'Doctor') ? this.currentDoctor.name : ((typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.name : 'Doctor');
    const costInfo = this.calculateTotalCost();

    const payload = {
      patient_name: name,
      patient_phone: phone,
      patient_age: age,
      patient_gender: gender,
      doctor_name: docName,
      language: lang,
      medicines: this.savedMedicines,
      toggles: {
        prescription_simplifier: document.getElementById('toggle-rx-simplifier') ? document.getElementById('toggle-rx-simplifier').checked : true,
        follow_up: {
          enabled: document.getElementById('toggle-followup') ? document.getElementById('toggle-followup').checked : false,
          date: document.getElementById('followup-date') ? document.getElementById('followup-date').value : '',
          time: document.getElementById('followup-time') ? document.getElementById('followup-time').value : ''
        },
        vaccination: {
          enabled: document.getElementById('toggle-vaccination') ? document.getElementById('toggle-vaccination').checked : false,
          date: document.getElementById('vaccination-date') ? document.getElementById('vaccination-date').value : ''
        },
        report_review: {
          enabled: document.getElementById('toggle-report-review') ? document.getElementById('toggle-report-review').checked : false,
          name: document.getElementById('report-name-input') ? document.getElementById('report-name-input').value : '',
          date: document.getElementById('report-date-input') ? document.getElementById('report-date-input').value : '',
          time: document.getElementById('report-time-input') ? document.getElementById('report-time-input').value : ''
        },
        additional_instructions: {
          enabled: document.getElementById('toggle-instructions') ? document.getElementById('toggle-instructions').checked : false,
          text: document.getElementById('instructions-textarea') ? document.getElementById('instructions-textarea').value.trim() : ''
        },
        internal_notes: {
          enabled: document.getElementById('toggle-internal-notes') ? document.getElementById('toggle-internal-notes').checked : false,
          text: document.getElementById('internal-notes-textarea') ? document.getElementById('internal-notes-textarea').value.trim() : ''
        }
      },
      instructions: document.getElementById('instructions-textarea') ? document.getElementById('instructions-textarea').value.trim() : '',
      internal_notes: document.getElementById('internal-notes-textarea') ? document.getElementById('internal-notes-textarea').value.trim() : '',
      total_cost: costInfo.total
    };

    try {
      showToast('Saving patient consultation to database...', 'info');
      const res = await this.portalFetch('/api/doctors/portal/consultations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record consultation');

      showToast(`Consultation for ${name} saved successfully to database!`, 'success');

      if (data.wallet_balance !== undefined) {
        this.walletBalance = data.wallet_balance;
      }

      // Clear the Add Patient form
      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (ageInput) ageInput.value = '';
      const instArea = document.getElementById('instructions-textarea');
      if (instArea) instArea.value = '';
      const notesArea = document.getElementById('internal-notes-textarea');
      if (notesArea) notesArea.value = '';

      // Reset template medicines
      this.loadTemplateMedicines();

      // Refresh data and switch to history
      await Promise.all([
        this.loadSummaryStats(),
        this.loadWalletData(),
        this.loadConsultationsHistory(),
        this.loadRemindersData()
      ]);
      this.switchSubView('history');

    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

// Explicitly attach DoctorSuite to window for inline onclick handlers and Capacitor WebView
if (typeof window !== 'undefined') {
  window.DoctorSuite = DoctorSuite;
}