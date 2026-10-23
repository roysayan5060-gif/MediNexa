// Clinic Dashboard & Financial Accounting Controller
const ClinicApp = {
  currentFilterDoctor: 'All',
  currentDateFrom: '',
  currentDateTo: '',

  init() {
    this.setupEvents();
  },

  setupEvents() {
    // Sub-tab switcher in clinic portal
    document.querySelectorAll('.tab-btn[data-target^="clinic-"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn[data-target^="clinic-"]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.portal-view[id^="clinic-"]').forEach(v => v.classList.remove('active'));

        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.target);
        if (target) target.classList.add('active');

        if (btn.dataset.target === 'clinic-financials') {
          this.loadFinancialSummary();
        } else if (btn.dataset.target === 'clinic-expenses') {
          this.loadExpensesList();
        } else if (btn.dataset.target === 'clinic-settlements') {
          this.loadSettlementsList();
        }
      });
    });

    // Financial filters
    const filterDoc = document.getElementById('clinic-filter-doctor');
    const filterFrom = document.getElementById('clinic-filter-from');
    const filterTo = document.getElementById('clinic-filter-to');
    const btnApply = document.getElementById('btn-apply-clinic-filters');

    if (btnApply) {
      btnApply.addEventListener('click', () => {
        if (filterDoc) this.currentFilterDoctor = filterDoc.value;
        if (filterFrom) this.currentDateFrom = filterFrom.value;
        if (filterTo) this.currentDateTo = filterTo.value;
        this.loadFinancialSummary();
      });
    }

    // Record Expense Form
    const expForm = document.getElementById('form-record-expense');
    if (expForm) {
      expForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = expForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const payload = {
          title: document.getElementById('exp-title').value.trim(),
          category: document.getElementById('exp-category').value,
          amount: document.getElementById('exp-amount').value,
          expense_date: document.getElementById('exp-date').value,
          description: document.getElementById('exp-desc').value.trim(),
          recorded_by: (Auth.currentUser && Auth.currentUser.name) || 'Clinic Admin'
        };

        try {
          await API.recordClinicExpense(payload);
          showToast('Operational expense recorded successfully!', 'success');
          document.getElementById('modal-record-expense').classList.remove('active');
          expForm.reset();
          this.loadFinancialSummary();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    // Record Settlement Form
    const setForm = document.getElementById('form-record-settlement');
    if (setForm) {
      setForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = setForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const payload = {
          type: document.getElementById('set-type').value,
          amount: document.getElementById('set-amount').value,
          doctor_name: document.getElementById('set-doctor-name').value.trim(),
          payment_method: document.getElementById('set-method').value,
          transaction_reference: document.getElementById('set-ref').value.trim(),
          notes: document.getElementById('set-notes').value.trim()
        };

        try {
          await API.recordClinicSettlement(payload);
          showToast('Settlement record registered successfully!', 'success');
          document.getElementById('modal-record-settlement').classList.remove('active');
          setForm.reset();
          this.loadFinancialSummary();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }
  },

  async loadFinancialSummary() {
    try {
      const params = {};
      if (this.currentFilterDoctor !== 'All') params.doctor_id = this.currentFilterDoctor;
      if (this.currentDateFrom) params.dateFrom = this.currentDateFrom;
      if (this.currentDateTo) params.dateTo = this.currentDateTo;

      const data = await API.getClinicFinancialSummary(params);
      const s = data.summary;

      // Update 12 Separated Financial Metrics
      document.getElementById('metric-total-collected').textContent = `₹${s.total_payments_collected.toLocaleString()}`;
      document.getElementById('metric-pending-verification').textContent = `₹${s.payments_pending_verification.toLocaleString()}`;
      document.getElementById('metric-verified-received').textContent = `₹${s.verified_payments_received.toLocaleString()}`;
      document.getElementById('metric-gateway-fees').textContent = `₹${s.gateway_fees.toLocaleString()}`;
      document.getElementById('metric-refunds-total').textContent = `₹${s.refunds_total.toLocaleString()}`;
      document.getElementById('metric-settled-to-bank').textContent = `₹${s.amount_settled_to_bank.toLocaleString()}`;
      document.getElementById('metric-available-funds').textContent = `₹${s.available_funds.toLocaleString()}`;
      document.getElementById('metric-recorded-expenses').textContent = `₹${s.total_recorded_expenses.toLocaleString()}`;
      document.getElementById('metric-doctor-due').textContent = `₹${s.doctor_payments_due.toLocaleString()}`;
      document.getElementById('metric-doctor-settled').textContent = `₹${s.doctor_settlements_completed.toLocaleString()}`;
      document.getElementById('metric-outstanding-liabilities').textContent = `₹${s.outstanding_doctor_liabilities.toLocaleString()}`;
      document.getElementById('metric-accounting-balance').textContent = `₹${s.internal_accounting_balance.toLocaleString()}`;

      // Populate doctor filter options if not yet populated
      const filterDoc = document.getElementById('clinic-filter-doctor');
      if (filterDoc && filterDoc.children.length <= 1 && data.available_doctors) {
        data.available_doctors.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = `${d.name} (${d.specialty})`;
          filterDoc.appendChild(opt);
        });
      }

      // Render Verified Payments Transaction Table
      this.renderTransactionsTable(data.verified_payments);
      // Render Recorded Expenses Table
      this.renderExpensesTable(data.recorded_expenses);
      // Render Settlements Table
      this.renderSettlementsTable(data.settlements);

    } catch (err) {
      console.error('Error loading clinic financials:', err);
      showToast('Could not load financial data: ' + err.message, 'error');
    }
  },

  renderTransactionsTable(transactions) {
    const tableBody = document.getElementById('clinic-transactions-body');
    if (!tableBody) return;

    if (!transactions || transactions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No verified transactions found matching criteria.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = '';
    transactions.forEach(t => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.85rem 1rem; color: var(--text-white); font-weight: 700;">${t.order_id}</td>
        <td style="padding: 0.85rem 1rem;">${t.patient_name || 'Patient'}</td>
        <td style="padding: 0.85rem 1rem;">${t.doctor_name || 'Assigned Doctor'}</td>
        <td style="padding: 0.85rem 1rem; font-weight: 800; color: var(--text-white);">₹${t.amount}</td>
        <td style="padding: 0.85rem 1rem; color: var(--text-muted);">₹${t.gateway_fee || (t.amount * 0.02).toFixed(2)}</td>
        <td style="padding: 0.85rem 1rem;"><span class="status-badge confirmed">${t.status}</span></td>
        <td style="padding: 0.85rem 1rem; color: var(--text-secondary); font-size: 0.8rem;">
          ${new Date(t.created_at || Date.now()).toLocaleDateString()}
        </td>
      `;
      tableBody.appendChild(tr);
    });
  },

  renderExpensesTable(expenses) {
    const tableBody = document.getElementById('clinic-expenses-body');
    if (!tableBody) return;

    if (!expenses || expenses.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No operational expenses recorded.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = '';
    expenses.forEach(e => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.85rem 1rem; color: var(--text-white); font-weight: 700;">${e.title}</td>
        <td style="padding: 0.85rem 1rem;"><span class="role-badge patient" style="font-size: 0.72rem;">${e.category}</span></td>
        <td style="padding: 0.85rem 1rem; font-weight: 800; color: #f87171;">₹${e.amount}</td>
        <td style="padding: 0.85rem 1rem; color: var(--text-secondary);">${e.recorded_by}</td>
        <td style="padding: 0.85rem 1rem;">
          <span class="role-badge clinic" style="font-size: 0.68rem; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);">
            RECORDED EXPENSE
          </span>
        </td>
        <td style="padding: 0.85rem 1rem; color: var(--text-secondary); font-size: 0.8rem;">${e.expense_date}</td>
      `;
      tableBody.appendChild(tr);
    });
  },

  renderSettlementsTable(settlements) {
    const tableBody = document.getElementById('clinic-settlements-body');
    if (!tableBody) return;

    if (!settlements || settlements.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No settlements or payouts registered.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = '';
    settlements.forEach(s => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.85rem 1rem; color: var(--text-white); font-weight: 700;">
          ${s.type === 'bank_withdrawal' ? '🏦 Bank Settlement' : '👨‍⚕️ Doctor Payout'}
        </td>
        <td style="padding: 0.85rem 1rem;">${s.doctor_name || 'Clinic Account'}</td>
        <td style="padding: 0.85rem 1rem; font-weight: 800; color: #34d399;">₹${s.amount}</td>
        <td style="padding: 0.85rem 1rem; color: var(--text-secondary);">${s.payment_method}</td>
        <td style="padding: 0.85rem 1rem; font-family: monospace; font-size: 0.8rem;">${s.transaction_reference}</td>
        <td style="padding: 0.85rem 1rem;"><span class="status-badge confirmed">${s.status}</span></td>
      `;
      tableBody.appendChild(tr);
    });
  }
};
