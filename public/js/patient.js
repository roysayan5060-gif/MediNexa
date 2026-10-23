// Patient Side Functionality

async function loadFeaturedDoctorsHome() {
  try {
    const doctors = await API.getDoctors({ sortBy: 'rating' });
    const featuredContainer = document.getElementById('featured-doctors-grid');
    if (!featuredContainer) return;
    renderDoctorCards(doctors.slice(0, 4), featuredContainer);
  } catch (err) {
    console.error('Failed to load featured doctors', err);
  }
}

function setupSymptomSearchEvents() {
  const form = document.getElementById('symptom-form');
  const input = document.getElementById('symptom-input');
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;
      handleSymptomDiagnosis(query);
    });
  }

  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tagText = btn.dataset.symptom || btn.textContent.trim();
      input.value = tagText;
      handleSymptomDiagnosis(tagText);
    });
  });
}

async function handleSymptomDiagnosis(query) {
  const diagnoseBtn = document.getElementById('btn-diagnose-submit');
  const originalText = diagnoseBtn.innerHTML;
  diagnoseBtn.innerHTML = '<span>Analyzing...</span>';
  diagnoseBtn.disabled = true;

  try {
    const data = await API.diagnoseSymptoms(query);
    const panel = document.getElementById('recommendation-panel');
    const badge = document.getElementById('rec-specialty-badge');
    const explanation = document.getElementById('rec-explanation');
    const doctorsContainer = document.getElementById('rec-doctors-grid');

    badge.textContent = 'Recommended Specialty: ' + data.recommended_specialty;
    explanation.textContent = data.explanation;
    panel.style.display = 'block';

    renderDoctorCards(data.doctors, doctorsContainer);

    panel.scrollIntoView({ behavior: 'smooth' });
    showToast(`Matched ${data.doctors.length} doctors specializing in ${data.recommended_specialty}!`, 'success');
  } catch (err) {
    showToast(err.message || 'Could not analyze symptoms', 'error');
  } finally {
    diagnoseBtn.innerHTML = originalText;
    diagnoseBtn.disabled = false;
  }
}

async function loadFilterDropdowns() {
  try {
    const filters = await API.getFilterOptions();
    const specialtySelect = document.getElementById('filter-specialty');
    const citySelect = document.getElementById('filter-city');

    if (specialtySelect) {
      specialtySelect.innerHTML = '<option value="All">All Specialties</option>';
      filters.specialties.forEach(spec => {
        specialtySelect.innerHTML += `<option value="${spec}">${spec}</option>`;
      });
    }

    if (citySelect) {
      citySelect.innerHTML = '<option value="All">All Locations / Cities</option>';
      filters.cities.forEach(city => {
        citySelect.innerHTML += `<option value="${city}">${city}</option>`;
      });
    }

    const docSpecialty = document.getElementById('doc-input-specialty');
    if (docSpecialty) {
      docSpecialty.innerHTML = filters.specialties.map(s => `<option value="${s}">${s}</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading filter meta:', err);
  }
}

async function loadDoctorsDirectory() {
  const container = document.getElementById('all-doctors-grid');
  if (!container) return;
  container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading registered doctors...</div>';

  try {
    const params = {};
    if (State.activeFilterSpecialty !== 'All') params.specialty = State.activeFilterSpecialty;
    if (State.activeFilterCity !== 'All') params.city = State.activeFilterCity;
    if (State.searchQuery) params.search = State.searchQuery;
    if (State.maxFee) params.maxFee = State.maxFee;
    if (State.sortBy) params.sortBy = State.sortBy;

    const doctors = await API.getDoctors(params);
    State.doctorsList = doctors;

    document.getElementById('doctors-count-badge').textContent = `${doctors.length} Doctors Available`;

    if (doctors.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-state-icon">🔍</div>
          <h3>No doctors found</h3>
          <p>We could not find any doctor matching your filter criteria. Try resetting the filters.</p>
          <button class="btn-book" onclick="resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    renderDoctorCards(doctors, container);
  } catch (err) {
    container.innerHTML = `<div style="color:red; grid-column:1/-1;">Failed to load doctors: ${err.message}</div>`;
  }
}

function setupFilterEvents() {
  const searchInput = document.getElementById('filter-search');
  const specialtySelect = document.getElementById('filter-specialty');
  const citySelect = document.getElementById('filter-city');
  const maxFeeInput = document.getElementById('filter-fee');
  const sortSelect = document.getElementById('filter-sort');
  const resetBtn = document.getElementById('btn-reset-filters');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        State.searchQuery = e.target.value.trim();
        loadDoctorsDirectory();
      }, 300);
    });
  }

  if (specialtySelect) {
    specialtySelect.addEventListener('change', (e) => {
      State.activeFilterSpecialty = e.target.value;
      loadDoctorsDirectory();
    });
  }

  if (citySelect) {
    citySelect.addEventListener('change', (e) => {
      State.activeFilterCity = e.target.value;
      loadDoctorsDirectory();
    });
  }

  if (maxFeeInput) {
    maxFeeInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        State.maxFee = e.target.value;
        loadDoctorsDirectory();
      }, 300);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      State.sortBy = e.target.value;
      loadDoctorsDirectory();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetFilters);
  }
}

function resetFilters() {
  State.activeFilterSpecialty = 'All';
  State.activeFilterCity = 'All';
  State.searchQuery = '';
  State.maxFee = '';
  State.sortBy = 'rating';

  document.getElementById('filter-search').value = '';
  document.getElementById('filter-specialty').value = 'All';
  document.getElementById('filter-city').value = 'All';
  document.getElementById('filter-fee').value = '';
  document.getElementById('filter-sort').value = 'rating';

  loadDoctorsDirectory();
}

function renderDoctorCards(doctors, targetContainer) {
  targetContainer.innerHTML = '';
  doctors.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doctor-card';
    card.innerHTML = `
      <div class="doctor-card-header">
        <img class="doctor-avatar" src="${doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400'}" alt="${doc.name}" onerror="this.src='https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400'">
        <div class="doctor-meta">
          <div class="doctor-name">${doc.name}</div>
          <span class="specialty-badge">${doc.specialty}</span>
          <div class="qualification">${doc.qualification || 'Board Certified Specialist'}</div>
          <div style="font-size: 0.8rem; color: #f59e0b; margin-top: 2px;">
            ★ ${doc.rating || 4.9} (${doc.experience || 10} yrs experience)
          </div>
        </div>
      </div>
      <div class="doctor-card-body">
        <div class="info-row">
          <span>🏥</span>
          <strong>${doc.clinic_name || 'Doctor X Specialty Center'}</strong>
        </div>
        <div class="info-row">
          <span>📍</span>
          <span>${doc.location}, <strong>${doc.city}</strong></span>
        </div>
        <div class="info-row">
          <span>🕒</span>
          <span>${doc.available_days || 'Mon - Fri'} (${doc.available_hours || '09:00 AM - 05:00 PM'})</span>
        </div>
        <p class="doctor-bio">${doc.bio || 'Dedicated medical professional focused on providing compassionate, patient-centered care.'}</p>
      </div>
      <div class="doctor-card-footer">
        <div class="fee-display">
          <span class="fee-label">Consultation Fee</span>
          <span class="fee-amount">$${doc.fee}</span>
        </div>
        <button class="btn-book" onclick="openBookingModal(${doc.id})">Book Appointment</button>
      </div>
    `;
    targetContainer.appendChild(card);
  });
}

async function openBookingModal(doctorId) {
  try {
    const doctor = await API.getDoctorById(doctorId);
    State.selectedDoctorForBooking = doctor;

    document.getElementById('modal-doctor-name').textContent = doctor.name;
    document.getElementById('modal-doctor-specialty').textContent = `${doctor.specialty} • ${doctor.clinic_name || ''}`;
    document.getElementById('modal-doctor-location').textContent = `📍 ${doctor.location}, ${doctor.city}`;
    document.getElementById('modal-doctor-fee').textContent = `Fee: $${doctor.fee}`;
    document.getElementById('modal-doctor-avatar').src = doctor.avatar;
    document.getElementById('booking-doc-id').value = doctor.id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('apt-date').value = tomorrow.toISOString().split('T')[0];

    document.getElementById('booking-modal').classList.add('active');
  } catch (err) {
    showToast('Failed to open booking details', 'error');
  }
}

function setupBookingModalEvents() {
  const modal = document.getElementById('booking-modal');
  const closeBtn = document.getElementById('btn-close-modal');
  const form = document.getElementById('booking-form');

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-confirm-booking');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Confirming Booking...';

    const bookingData = {
      doctor_id: document.getElementById('booking-doc-id').value,
      patient_name: document.getElementById('apt-patient-name').value.trim(),
      patient_phone: document.getElementById('apt-patient-phone').value.trim(),
      patient_email: document.getElementById('apt-patient-email').value.trim(),
      patient_age: document.getElementById('apt-patient-age').value,
      patient_gender: document.getElementById('apt-patient-gender').value,
      symptoms: document.getElementById('apt-symptoms').value.trim(),
      appointment_date: document.getElementById('apt-date').value,
      appointment_time: document.getElementById('apt-time').value
    };

    try {
      const res = await API.bookAppointment(bookingData);
      modal.classList.remove('active');
      form.reset();
      showToast(`Appointment booked successfully with ${res.doctor_name}!`, 'success');
      switchView('appointments');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Confirm & Book Appointment';
    }
  });
}

async function loadPatientAppointments() {
  const container = document.getElementById('patient-appointments-list');
  const phoneInput = document.getElementById('search-apt-phone');
  const phoneSearch = phoneInput ? phoneInput.value.trim() : '';

  try {
    const appointments = await API.getAppointments(phoneSearch ? { patient_phone: phoneSearch } : {});
    
    if (appointments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h3>No Appointments Scheduled Yet</h3>
          <p>Book a consultation with any of our verified doctors from the home page or doctors directory.</p>
          <button class="btn-book" onclick="switchView('doctors')">Explore Doctors</button>
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
            <span class="apt-name">${apt.doctor_name}</span>
            <span class="specialty-badge">${apt.doctor_specialty}</span>
            <span class="status-badge ${apt.status.toLowerCase()}">${apt.status}</span>
          </div>
          <div class="apt-info">
            <span>📅 <strong>${apt.appointment_date}</strong> at <strong>${apt.appointment_time}</strong></span>
            <span>📍 ${apt.clinic_name || ''} (${apt.doctor_location})</span>
            <span>💵 Fee: $${apt.doctor_fee}</span>
            <span>👤 Patient: ${apt.patient_name} (${apt.patient_gender}, ${apt.patient_age || 'N/A'} yrs)</span>
          </div>
          <div class="apt-symptoms">
            <strong>Patient Issue:</strong> ${apt.symptoms}
          </div>
          ${apt.doctor_notes ? `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #0284c7; background: #e0f2fe; padding: 0.5rem; border-radius: 6px;"><strong>Doctor Advice:</strong> ${apt.doctor_notes}</div>` : ''}
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:red">Failed to load appointments: ${err.message}</div>`;
  }
}