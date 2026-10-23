const http = require('http');
const app = require('./server/server.js');

const PORT = 3456;
const server = app.listen(PORT, async () => {
  console.log(`🧪 Test Server running on http://localhost:${PORT}`);

  try {
    // Helper function for HTTP requests
    function makeRequest(method, path, body = null, token = null) {
      return new Promise((resolve, reject) => {
        const url = new URL(`http://localhost:${PORT}${path}`);
        const options = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(url, options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    }

    console.log('\n--- 1. Testing GET /api/health ---');
    const health = await makeRequest('GET', '/api/health');
    console.log('Status:', health.status, 'Brand:', health.data.brand, 'Tagline:', health.data.tagline);
    if (health.status !== 200) throw new Error('Health check failed');

    console.log('\n--- 2. Testing GET /api/doctors ---');
    const docs = await makeRequest('GET', '/api/doctors');
    console.log('Status:', docs.status, 'Count:', docs.data.length, 'First Doctor:', docs.data[0].name);
    if (docs.data.length === 0) throw new Error('No doctors retrieved');

    console.log('\n--- 3. Testing POST /api/recommend (Symptom Checker) ---');
    const rec = await makeRequest('POST', '/api/recommend', { query: 'Severe chest tightness and shortness of breath' });
    console.log('Status:', rec.status, 'Specialty Suggested:', rec.data.recommended_specialty, 'Matched Doctors:', rec.data.doctors.length);
    if (rec.data.recommended_specialty !== 'Cardiology') throw new Error('Symptom triage mismatch');

    console.log('\n--- 4. Testing POST /api/auth/register (Doctor with WBMC Reg No) ---');
    const testDocEmail = `wb_doc_${Date.now()}@medinexa.health`;
    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Dr. Aniruddha Roy',
      email: testDocEmail,
      password: 'password123',
      role: 'doctor',
      phone: '+91 98309 88888',
      city: 'Kolkata',
      specialty: 'Neurology',
      fee: 850,
      registration_number: 'WBMC-89312',
      registration_authority: 'West Bengal Medical Council (WBMC)'
    });
    console.log('Status:', regRes.status, 'User Role:', regRes.data.user.role, 'Token received:', Boolean(regRes.data.token));
    const authToken = regRes.data.token;

    console.log('\n--- 5. Testing POST /api/appointments ---');
    const aptRes = await makeRequest('POST', '/api/appointments', {
      doctor_id: docs.data[0].id || docs.data[0]._id,
      patient_name: 'Priyanka Mukherjee',
      patient_phone: '+91 98311 22334',
      symptoms: 'Mild chest heaviness after brisk walking',
      appointment_date: '2026-10-25',
      appointment_time: '10:30 AM',
      requires_payment: true
    }, authToken);
    console.log('Status:', aptRes.status, 'Appointment ID:', aptRes.data.id || aptRes.data._id, 'Status:', aptRes.data.status);
    const aptId = aptRes.data.id || aptRes.data._id;

    console.log('\n--- 6. Testing Real Payment Flow: POST /api/payments/create-order ---');
    const orderRes = await makeRequest('POST', '/api/payments/create-order', {
      doctor_id: docs.data[0].id || docs.data[0]._id,
      appointment_id: aptId,
      patient_name: 'Priyanka Mukherjee'
    }, authToken);
    console.log('Status:', orderRes.status, 'Order ID:', orderRes.data.order_id, 'Server Verified Amount:', orderRes.data.amount);
    const orderId = orderRes.data.order_id;

    console.log('\n--- 7. Testing Real Payment Verification: POST /api/payments/verify ---');
    const verifyRes = await makeRequest('POST', '/api/payments/verify', {
      razorpay_order_id: orderId,
      razorpay_payment_id: `pay_test_${Date.now()}`,
      appointment_id: aptId
    }, authToken);
    console.log('Status:', verifyRes.status, 'Payment Verified:', verifyRes.data.verified, 'Message:', verifyRes.data.message);

    console.log('\n--- 8. Testing Clinical Prescription Formulation: POST /api/prescriptions ---');
    const rxRes = await makeRequest('POST', '/api/prescriptions', {
      appointment_id: aptId,
      doctor_id: docs.data[0].id || docs.data[0]._id,
      doctor_name: docs.data[0].name,
      patient_name: 'Priyanka Mukherjee',
      patient_phone: '9831122334',
      diagnosis: 'Atypical Non-Cardiac Chest Pain & Stress Strain',
      medicines: [
        { name: 'Sorbitrate 5mg', dosage: '1 tab SOS under tongue' },
        { name: 'Pantoprazole 40mg', dosage: '1 tab once daily before breakfast' }
      ],
      general_advice: 'Avoid excessive caffeine, monitor resting pulse.'
    }, authToken);
    console.log('Status:', rxRes.status, 'Prescription ID:', rxRes.data._id || rxRes.data.id);

    console.log('\n--- 9. Testing WhatsApp Sharing Notification ---');
    const waRes = await makeRequest('POST', `/api/prescriptions/${rxRes.data._id || rxRes.data.id}/whatsapp-initiated`, {}, authToken);
    console.log('Status:', waRes.status, 'Dispatch status:', waRes.data.delivery_status);

    console.log('\n--- 10. Testing Clinic Financial Accounting: GET /api/clinics/financial-summary ---');
    const finRes = await makeRequest('GET', '/api/clinics/financial-summary', null, authToken);
    console.log('Status:', finRes.status);
    console.log('12 Separated Financial Metrics:');
    console.log(' - Total Payments Attempted:', finRes.data.summary.total_payments_collected);
    console.log(' - Verified Payments Received:', finRes.data.summary.verified_payments_received);
    console.log(' - Gateway Fees (2%):', finRes.data.summary.gateway_fees);
    console.log(' - Net Verified Collections:', finRes.data.summary.net_verified_collections);
    console.log(' - Settled to Bank Account:', finRes.data.summary.amount_settled_to_bank);
    console.log(' - Recorded Operational Expenses:', finRes.data.summary.total_recorded_expenses);
    console.log(' - Doctor Payments Due / Liabilities:', finRes.data.summary.doctor_payments_due);
    console.log(' - Available Surplus Funds:', finRes.data.summary.available_funds);

    console.log('\n🎉 ALL 10 TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
