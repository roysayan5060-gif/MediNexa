// MediNexa Global Application State & Controller
const State = {
  activeView: 'welcome', // 'welcome', 'patient-home', 'doctors', 'appointments', 'doctor-portal', 'clinic-portal'
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
  
  const mainNav = document.getElementById('main-nav-links');
  const headerActions = document.getElementById('header-actions');

  if (viewName === 'welcome') {
    if (mainNav) mainNav.classList.add('hidden');
    if (headerActions) headerActions.style.display = 'none';
  } else {
    if (mainNav) mainNav.classList.remove('hidden');
    if (headerActions) headerActions.style.display = 'flex';
  }

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
  if (viewName === 'patient-home') {
    loadFeaturedDoctorsHome();
  } else if (viewName === 'doctors') {
    loadDoctorsDirectory();
  } else if (viewName === 'appointments') {
    if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role === 'doctor') {
      switchView('doctor-portal');
      if (typeof DoctorSuite !== 'undefined') {
        DoctorSuite.switchSubView('appointments');
      }
      return;
    }
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
    else switchView('patient-home');
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
    brandLink.addEventListener('click', () => {
      if (Auth.currentUser) {
        if (Auth.currentUser.role === 'doctor') switchView('doctor-portal');
        else if (Auth.currentUser.role === 'clinic') switchView('clinic-portal');
        else switchView('patient-home');
      } else {
        switchView('welcome');
      }
    });
  }
}
