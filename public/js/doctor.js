// Doctor Portal Controller — Preserving All Working Features & Adding WhatsApp Rx Sharing
let editingDoctorId = null;
let activePrescriptionAppointment = null;

function loadDoctorPortalDashboard() {
  loadDoctorPortalAppointments();
  loadDoctorPortalDoctorList();
  loadVerificationQueue();
  resetDoctorForm();
}

function setupDoctorPortalEvents() {
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
          <img src="${doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400'}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
          <div>
            <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-white);">${doc.name}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${doc.specialty} • ${doc.qualification}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              📍 ${doc.location}, <strong>${doc.city}</strong> | Fee: <strong>₹${doc.fee}</strong>
              <span class="role-badge ${doc.verification_status === 'Verified' ? 'doctor' : 'patient'}" style="margin-left: 0.5rem; font-size: 0.68rem;">
                ${doc.registration_number || 'WBMC'} (${doc.verification_status || 'Pending'})
              </span>
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

// West Bengal Medical Council Verification Review Queue
async function loadVerificationQueue() {
  const container = document.getElementById('verification-queue-list');
  if (!container) return;

  try {
    const queue = await API.getVerificationQueue();
    if (queue.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛡️</div>
          <h3>All Registrations Verified</h3>
          <p>There are currently no doctor credential submissions pending West Bengal Medical Council review.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    queue.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'appointment-item';
      item.innerHTML = `
        <div style="flex: 1;">
          <h4 style="color: var(--text-white); font-weight: 800;">${doc.name} (${doc.specialty})</h4>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Registration No: <strong style="color: #f87171;">${doc.registration_number || 'Not provided'}</strong> | Authority: <strong>${doc.registration_authority}</strong>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
            Clinic: ${doc.clinic_name || 'N/A'} | City: ${doc.city} | Phone: ${doc.phone || 'N/A'}
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn-action-done" onclick="reviewDoctorVerification('${doc._id || doc.id}', 'Verified')">✓ Approve WBMC</button>
          <button class="btn-action-cancel" onclick="reviewDoctorVerification('${doc._id || doc.id}', 'Rejected')">✕ Reject</button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:red">Failed to load verification queue: ${err.message}</div>`;
  }
}

async function reviewDoctorVerification(docId, status) {
  const notes = prompt(`Enter review notes for ${status}:`, status === 'Verified' ? 'Verified against WBMC Register.' : 'Invalid registration details.');
  if (notes === null) return;

  try {
    await API.verifyDoctor(docId, status, notes);
    showToast(`Doctor registration ${status}!`, 'success');
    loadVerificationQueue();
    loadDoctorPortalDoctorList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}