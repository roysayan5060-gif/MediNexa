// MediNexa Authentication & Role Controller
const Auth = {
  currentUser: null,
  currentProfile: null,

  init() {
    this.checkSession();
    this.setupAuthModalEvents();
  },

  async checkSession() {
    const token = API.getToken();
    if (!token) {
      this.updateUIForLoggedOut();
      switchView('welcome');
      return;
    }

    try {
      const data = await API.getMe();
      this.currentUser = data.user;
      this.currentProfile = data.profile;
      this.updateUIForLoggedIn();

      // Route to appropriate portal if activeView is welcome or default
      if (this.currentUser.role === 'doctor') {
        switchView('doctor-portal');
      } else if (this.currentUser.role === 'clinic') {
        switchView('clinic-portal');
      } else {
        switchView('patient-home');
      }
    } catch (err) {
      this.logout();
    }
  },

  updateUIForLoggedIn() {
    const user = this.currentUser;
    const authBtn = document.getElementById('btn-header-auth');
    const roleBadge = document.getElementById('role-badge');
    const headerActions = document.getElementById('header-actions');
    const mainNav = document.getElementById('main-nav-links');

    if (roleBadge) {
      roleBadge.textContent = `${user.role.toUpperCase()} MODE`;
      roleBadge.className = `role-badge ${user.role}`;
      roleBadge.style.display = 'inline-flex';
    }

    if (authBtn) {
      authBtn.innerHTML = `<span>👤</span> ${user.name.split(' ')[0]} (Logout)`;
      authBtn.onclick = () => this.logout();
    }

    if (headerActions) {
      headerActions.style.display = 'flex';
    }

    // Role-specific navigation links
    const navPatientHome = document.getElementById('nav-btn-patient-home');
    const navDoctors = document.getElementById('nav-btn-doctors');
    const navAppointments = document.getElementById('nav-btn-appointments');
    const navDocPortal = document.getElementById('nav-btn-doctor-portal');
    const navClinicPortal = document.getElementById('nav-btn-clinic-portal');

    if (user.role === 'doctor') {
      if (navPatientHome) navPatientHome.style.display = 'none';
      if (navDoctors) navDoctors.style.display = 'none';
      if (navAppointments) navAppointments.style.display = 'none';
      if (navDocPortal) navDocPortal.style.display = 'inline-flex';
      if (navClinicPortal) navClinicPortal.style.display = 'none';
    } else if (user.role === 'clinic') {
      if (navPatientHome) navPatientHome.style.display = 'none';
      if (navDoctors) navDoctors.style.display = 'none';
      if (navAppointments) navAppointments.style.display = 'none';
      if (navDocPortal) navDocPortal.style.display = 'none';
      if (navClinicPortal) navClinicPortal.style.display = 'inline-flex';
    } else {
      if (navPatientHome) navPatientHome.style.display = 'inline-flex';
      if (navDoctors) navDoctors.style.display = 'inline-flex';
      if (navAppointments) navAppointments.style.display = 'inline-flex';
      if (navDocPortal) navDocPortal.style.display = 'none';
      if (navClinicPortal) navClinicPortal.style.display = 'none';
    }

    if (mainNav) {
      mainNav.classList.remove('hidden');
    }

    // Update portal views if in doctor or clinic mode
    if (user.role === 'doctor') {
      const docBadge = document.getElementById('doctor-status-badge');
      if (docBadge && this.currentProfile) {
        docBadge.textContent = this.currentProfile.verification_status || 'WBMC Verified';
      }
      if (typeof DoctorSuite !== 'undefined') {
        DoctorSuite.setDoctorInfo(user, this.currentProfile);
      }
    }
  },

  updateUIForLoggedOut() {
    this.currentUser = null;
    this.currentProfile = null;
    localStorage.removeItem('medinexa_token');

    if (typeof DoctorSuite !== 'undefined') {
      DoctorSuite.setDoctorInfo({ name: 'Doctor', role: 'doctor' }, { specialty: 'General Medicine' });
    }

    const authBtn = document.getElementById('btn-header-auth');
    const roleBadge = document.getElementById('role-badge');
    const headerActions = document.getElementById('header-actions');
    const mainNav = document.getElementById('main-nav-links');

    if (roleBadge) {
      roleBadge.textContent = 'PATIENT VIEW';
      roleBadge.className = 'role-badge patient';
    }

    if (authBtn) {
      authBtn.innerHTML = '<span>🔒</span> Login / Register';
      authBtn.onclick = () => this.openAuthModal('patient');
    }

    if (headerActions) {
      headerActions.style.display = 'none';
    }

    if (mainNav) {
      mainNav.classList.add('hidden');
    }
  },

  logout() {
    localStorage.removeItem('medinexa_token');
    this.currentUser = null;
    this.currentProfile = null;
    this.updateUIForLoggedOut();
    showToast('You have been logged out successfully.', 'info');
    switchView('welcome');
  },

  currentModalRole: 'patient',

  updateModalHeader(role, isRegister = false) {
    this.currentModalRole = role;
    const badge = document.getElementById('auth-modal-role-badge');
    const title = document.getElementById('auth-modal-title');
    const subtitle = document.getElementById('auth-modal-subtitle');
    const demoCode = document.querySelector('#form-auth-login code');

    const roleConfigs = {
      patient: {
        badgeText: 'PATIENT PORTAL',
        badgeClass: 'role-badge patient',
        loginTitle: 'Sign In as Patient',
        registerTitle: 'Create Patient Account',
        subtitle: 'Access medical consultations, verified doctors & prescriptions',
        demo: 'rahul.sharma@example.com / password123'
      },
      doctor: {
        badgeText: 'DOCTOR PORTAL',
        badgeClass: 'role-badge doctor',
        loginTitle: 'Sign In as Doctor',
        registerTitle: 'Doctor Registration (WBMC)',
        subtitle: 'Manage patient consultations, WBMC verification & WhatsApp Rx',
        demo: 'marcus.vance@medinexa.health / password123'
      },
      clinic: {
        badgeText: 'CLINIC PORTAL',
        badgeClass: 'role-badge clinic',
        loginTitle: 'Sign In as Clinic',
        registerTitle: 'Clinic Registration',
        subtitle: 'Access financial accounting, verified gateway settlements & doctor payouts',
        demo: 'alexander.cross@medinexa.health / password123'
      }
    };

    const config = roleConfigs[role] || roleConfigs.patient;
    if (badge) {
      badge.textContent = config.badgeText;
      badge.className = config.badgeClass;
    }
    if (title) {
      title.textContent = isRegister ? config.registerTitle : config.loginTitle;
    }
    if (subtitle) {
      subtitle.textContent = config.subtitle;
    }
    if (demoCode) {
      demoCode.textContent = config.demo;
    }
  },

  openAuthModal(intendedRole = 'patient', isRegister = false) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    this.updateModalHeader(intendedRole, isRegister);
    const roleSelect = document.getElementById('auth-role-select');
    if (roleSelect) roleSelect.value = intendedRole;
    this.toggleRoleSpecificFields(intendedRole);

    if (isRegister) {
      document.getElementById('tab-auth-register').click();
    } else {
      document.getElementById('tab-auth-login').click();
    }

    modal.classList.add('active');
  },

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  },

  setupAuthModalEvents() {
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('btn-close-auth-modal');
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-auth-login');
    const formRegister = document.getElementById('form-auth-register');
    const roleSelect = document.getElementById('auth-role-select');

    if (closeBtn) closeBtn.onclick = () => this.closeAuthModal();
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) this.closeAuthModal();
      };
    }

    if (tabLogin && tabRegister) {
      tabLogin.onclick = () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
        this.updateModalHeader(this.currentModalRole, false);
      };

      tabRegister.onclick = () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.style.display = 'block';
        formLogin.style.display = 'none';
        this.updateModalHeader(this.currentModalRole, true);
      };
    }

    if (roleSelect) {
      roleSelect.onchange = (e) => {
        this.toggleRoleSpecificFields(e.target.value);
        this.updateModalHeader(e.target.value, true);
      };
    }

    // Login Form Submit
    if (formLogin) {
      formLogin.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = formLogin.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying credentials...';

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
          const res = await API.login({ email, password });
          localStorage.setItem('medinexa_token', res.token);
          this.currentUser = res.user;
          this.currentProfile = res.profile;
          this.updateUIForLoggedIn();
          this.closeAuthModal();
          formLogin.reset();
          showToast(`Welcome back, ${res.user.name}!`, 'success');

          // Direct role redirection
          if (res.user.role === 'doctor') {
            switchView('doctor-portal');
          } else if (res.user.role === 'clinic') {
            switchView('clinic-portal');
          } else {
            switchView('patient-home');
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to MediNexa';
        }
      };
    }

    // Register Form Submit
    if (formRegister) {
      formRegister.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = formRegister.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering account...';

        const role = roleSelect.value;
        const payload = {
          name: document.getElementById('reg-name').value.trim(),
          email: document.getElementById('reg-email').value.trim(),
          password: document.getElementById('reg-password').value,
          role,
          phone: document.getElementById('reg-phone').value.trim(),
          city: document.getElementById('reg-city').value.trim()
        };

        if (role === 'doctor') {
          payload.specialty = document.getElementById('reg-doc-specialty').value;
          payload.qualification = document.getElementById('reg-doc-qualification').value.trim();
          payload.fee = document.getElementById('reg-doc-fee').value;
          payload.registration_number = document.getElementById('reg-doc-regno').value.trim();
          payload.registration_authority = document.getElementById('reg-doc-authority').value;
        } else if (role === 'clinic') {
          payload.clinic_name = document.getElementById('reg-clinic-name').value.trim() || payload.name;
          payload.license_number = document.getElementById('reg-clinic-license').value.trim();
        }

        try {
          const res = await API.register(payload);
          localStorage.setItem('medinexa_token', res.token);
          this.currentUser = res.user;
          this.currentProfile = res.profile;
          this.updateUIForLoggedIn();
          this.closeAuthModal();
          formRegister.reset();
          showToast(`Account created successfully as ${res.user.role.toUpperCase()}!`, 'success');

          if (res.user.role === 'doctor') {
            switchView('doctor-portal');
          } else if (res.user.role === 'clinic') {
            switchView('clinic-portal');
          } else {
            switchView('patient-home');
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create MediNexa Account';
        }
      };
    }
  },

  toggleRoleSpecificFields(role) {
    const docFields = document.getElementById('reg-doctor-fields');
    const clinicFields = document.getElementById('reg-clinic-fields');

    if (docFields) docFields.style.display = role === 'doctor' ? 'block' : 'none';
    if (clinicFields) clinicFields.style.display = role === 'clinic' ? 'block' : 'none';
  }
};
