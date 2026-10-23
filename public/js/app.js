// MediNexa Global Application State & Controller
const State = {
  activeView: 'home', // 'home', 'doctors', 'appointments', 'doctor-portal', 'clinic-portal'
  selectedDoctorForBooking: null,
  activeFilterSpecialty: 'All',
  activeFilterCity: 'All',
  searchQuery: '',
  maxFee: '',
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
  } else if (viewName === 'clinic-portal') {
    ClinicApp.loadFinancialSummary();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Role Selection Handlers from Welcome Screen Cards
function selectRole(role) {
  // If user is already authenticated with this role, go directly to their portal
  if (Auth.currentUser && (Auth.currentUser.role === role || Auth.currentUser.role === 'admin')) {
    if (role === 'doctor') switchView('doctor-portal');
    else if (role === 'clinic') switchView('clinic-portal');
    else switchView('home');
    return;
  }

  // Open existing authentication interface for the chosen role
  Auth.openAuthModal(role, false);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  ClinicApp.init();
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

  const brandLink = document.getElementById('brand-home-link');
  if (brandLink) {
    brandLink.addEventListener('click', () => switchView('home'));
  }
}
