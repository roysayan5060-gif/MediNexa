// Global Application State & Controller
const State = {
  activeView: 'home', // 'home', 'doctors', 'appointments', 'doctor-portal'
  activePortalRole: 'patient', // 'patient' or 'doctor'
  selectedDoctorForBooking: null,
  activeFilterSpecialty: 'All',
  activeFilterCity: 'All',
  searchQuery: '',
  maxFee: '',
  sortBy: 'rating',
  doctorsList: []
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Navigation View Switcher
function switchView(viewName) {
  State.activeView = viewName;
  
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Update views
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) {
    activeSec.classList.add('active');
  }

  // View specific loaders
  if (viewName === 'doctors') {
    loadDoctorsDirectory();
  } else if (viewName === 'appointments') {
    loadPatientAppointments();
  } else if (viewName === 'doctor-portal') {
    loadDoctorPortalDashboard();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Role Switcher between Patient Mode and Doctor's Portal (Backend)
function toggleRolePortal() {
  if (State.activePortalRole === 'patient') {
    State.activePortalRole = 'doctor';
    document.getElementById('role-badge').textContent = 'Doctor Mode (Backend)';
    document.getElementById('role-badge').className = 'badge-role doctor';
    document.getElementById('btn-switch-role-text').textContent = 'Switch to Patient Side';
    switchView('doctor-portal');
    showToast('Switched to Doctor Management Portal', 'info');
  } else {
    State.activePortalRole = 'patient';
    document.getElementById('role-badge').textContent = 'Patient View';
    document.getElementById('role-badge').className = 'badge-role patient';
    document.getElementById('btn-switch-role-text').textContent = 'Doctor Portal (Admin)';
    switchView('home');
    showToast('Switched to Patient View', 'info');
  }
}

// Initialise App
document.addEventListener('DOMContentLoaded', () => {
  setupNavigationEvents();
  setupSymptomSearchEvents();
  setupFilterEvents();
  setupBookingModalEvents();
  setupDoctorPortalEvents();
  loadFilterDropdowns();
  loadFeaturedDoctorsHome();
});

function setupNavigationEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  document.getElementById('btn-toggle-portal').addEventListener('click', toggleRolePortal);
  document.getElementById('brand-home-link').addEventListener('click', () => switchView('home'));
}
