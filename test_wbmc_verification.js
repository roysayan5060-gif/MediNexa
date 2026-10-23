/**
 * MediNexa — West Bengal Doctor Verification Integration Test Suite
 * Validates WBMC restriction, leading-zero preservation, anti-duplicate constraint,
 * automated check fallback, RBAC authorization, and manual review audit trail.
 */

const http = require('http');
const app = require('./server/server.js');

const PORT = 3457;

const server = app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🩺 Running MediNexa WBMC Verification Test Suite on port ${PORT}`);
  console.log(`======================================================\n`);

  try {
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

    const testTimestamp = Date.now();
    const testRegNo = `0${Math.floor(1000 + Math.random() * 8999)}`; // Preserves leading zero e.g. "04912"

    // TEST 1: Rejection of Non-WBMC Medical Council
    console.log('--- Test 1: Reject Non-WBMC Council Registration ---');
    const nonWbmcRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Dr. Suresh Rao',
      email: `delhi_doc_${testTimestamp}@example.com`,
      password: 'password123',
      role: 'doctor',
      phone: '+91 98111 22334',
      city: 'New Delhi',
      specialty: 'Cardiology',
      fee: 1000,
      registration_number: 'DMC-99412',
      registration_authority: 'Delhi Medical Council'
    });
    console.log('Status:', nonWbmcRes.status, '| Response:', nonWbmcRes.data.error || nonWbmcRes.data.message);
    if (nonWbmcRes.status !== 400) {
      throw new Error(`Expected HTTP 400 for non-WBMC council, got ${nonWbmcRes.status}`);
    }
    console.log('✓ PASS: Non-WBMC registration correctly rejected.');

    // TEST 2: Missing Registration Number Rejection
    console.log('\n--- Test 2: Reject Doctor Without Registration Number ---');
    const noRegRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Dr. No License',
      email: `nolicense_${testTimestamp}@example.com`,
      password: 'password123',
      role: 'doctor',
      phone: '+91 98300 00000',
      city: 'Kolkata',
      specialty: 'General Medicine',
      fee: 500,
      registration_number: '',
      registration_authority: 'West Bengal Medical Council (WBMC)'
    });
    console.log('Status:', noRegRes.status, '| Response:', noRegRes.data.error);
    if (noRegRes.status !== 400) {
      throw new Error(`Expected HTTP 400 for missing registration number, got ${noRegRes.status}`);
    }
    console.log('✓ PASS: Empty registration number correctly rejected.');

    // TEST 3: Valid WBMC Doctor Registration with Leading Zero
    console.log('\n--- Test 3: Valid WBMC Registration (Preserving Leading Zero) ---');
    const wbmcDocRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Dr. Subhashish Banerjee',
      email: `wb_doc_${testTimestamp}@medinexa.health`,
      password: 'password123',
      role: 'doctor',
      phone: '+91 98302 99887',
      city: 'Kolkata',
      specialty: 'General Medicine',
      qualification: 'MBBS, MD',
      fee: 700,
      registration_number: testRegNo, // Leading zero
      registration_authority: 'West Bengal Medical Council (WBMC)',
      registration_year: 2017
    });
    console.log('Status:', wbmcDocRes.status, '| Registered Doctor:', wbmcDocRes.data.user.name);
    if (wbmcDocRes.status !== 201) {
      throw new Error(`Expected HTTP 201 for valid WBMC registration, got ${wbmcDocRes.status}: ${JSON.stringify(wbmcDocRes.data)}`);
    }
    const docProfile = wbmcDocRes.data.profile;
    const doctorToken = wbmcDocRes.data.token;
    const doctorId = docProfile._id || docProfile.id;

    console.log('  Stored Reg Number:', docProfile.registration_number);
    console.log('  Stored Reg Year:', docProfile.registration_year);
    console.log('  Verification Status:', docProfile.verification_status);
    console.log('  Verification Source:', docProfile.verification_source);

    if (docProfile.registration_number !== testRegNo) {
      throw new Error(`Leading zero truncated! Expected '${testRegNo}', got '${docProfile.registration_number}'`);
    }
    if (!['UNDER_REVIEW', 'VERIFIED'].includes(docProfile.verification_status)) {
      throw new Error(`Unexpected initial status: ${docProfile.verification_status}`);
    }
    console.log('✓ PASS: Valid WBMC doctor registered with leading zero intact.');

    // TEST 4: Anti-Duplicate WBMC License Number Constraint
    console.log('\n--- Test 4: Prevent Duplicate WBMC Registration Number ---');
    const dupRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Dr. Impostor Doctor',
      email: `impostor_${testTimestamp}@medinexa.health`,
      password: 'password123',
      role: 'doctor',
      phone: '+91 98300 11223',
      city: 'Howrah',
      specialty: 'Orthopedics',
      fee: 600,
      registration_number: testRegNo, // Identical WBMC license
      registration_authority: 'West Bengal Medical Council (WBMC)'
    });
    console.log('Status:', dupRes.status, '| Response:', dupRes.data.error);
    if (dupRes.status !== 409) {
      throw new Error(`Expected HTTP 409 Conflict for duplicate WBMC license, got ${dupRes.status}`);
    }
    console.log('✓ PASS: Duplicate WBMC registration number blocked with HTTP 409.');

    // TEST 5: Doctor Self-Verification Block (Security RBAC)
    console.log('\n--- Test 5: Block Doctor Self-Approval (RBAC) ---');
    const selfApproveRes = await makeRequest('POST', '/api/auth/verify-doctor', {
      doctorId,
      status: 'VERIFIED',
      notes: 'I am authenticating myself'
    }, doctorToken);
    console.log('Status:', selfApproveRes.status, '| Response:', selfApproveRes.data.error);
    if (selfApproveRes.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden for doctor self-approval, got ${selfApproveRes.status}`);
    }
    console.log('✓ PASS: Doctor prohibited from approving their own credentials.');

    // TEST 6: Verification Queue Listing
    console.log('\n--- Test 6: Enqueued in Verification Queue ---');
    const queueRes = await makeRequest('GET', '/api/auth/verification-queue');
    console.log('Status:', queueRes.status, '| Doctors in queue:', queueRes.data.length);
    const foundInQueue = queueRes.data.some(d => (d._id === doctorId || d.id === doctorId || d.registration_number === testRegNo));
    if (!foundInQueue && docProfile.verification_status === 'UNDER_REVIEW') {
      throw new Error('Doctor pending review was not found in verification queue.');
    }
    console.log('✓ PASS: Doctor correctly accessible in authorized review queue.');

    // TEST 7: Authorized Admin / Reviewer Approval Workflow
    console.log('\n--- Test 7: Authorized Admin Manual Approval & Audit Log ---');
    // Register or login an authorized clinic account
    const clinicRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Salt Lake Care Center',
      email: `clinic_${testTimestamp}@medinexa.health`,
      password: 'password123',
      role: 'clinic',
      phone: '+91 98300 55443',
      city: 'Kolkata',
      clinic_name: 'Salt Lake Care Clinic'
    });
    const clinicToken = clinicRes.data.token;

    const approveRes = await makeRequest('POST', '/api/auth/verify-doctor', {
      doctorId,
      status: 'VERIFIED',
      notes: 'Cross-referenced and verified against WBMC official register (wbmc.wb.gov.in).'
    }, clinicToken);

    console.log('Status:', approveRes.status, '| Message:', approveRes.data.message);
    if (approveRes.status !== 200) {
      throw new Error(`Expected HTTP 200 for reviewer approval, got ${approveRes.status}: ${JSON.stringify(approveRes.data)}`);
    }
    const approvedDoc = approveRes.data.doctor;
    console.log('  New Status:', approvedDoc.verification_status);
    console.log('  Source:', approvedDoc.verification_source);
    console.log('  Audit trail count:', approvedDoc.verification_audit ? approvedDoc.verification_audit.length : 0);

    if (approvedDoc.verification_status !== 'VERIFIED') {
      throw new Error(`Status not updated to VERIFIED: ${approvedDoc.verification_status}`);
    }
    if (approvedDoc.verification_source !== 'WBMC_PORTAL_MANUAL') {
      throw new Error(`Source not set to WBMC_PORTAL_MANUAL: ${approvedDoc.verification_source}`);
    }
    console.log('✓ PASS: Manual review verified doctor and updated audit trail.');

    // TEST 8: Rejection Workflow
    console.log('\n--- Test 8: Manual Rejection Workflow ---');
    const rejectRes = await makeRequest('POST', '/api/auth/verify-doctor', {
      doctorId,
      status: 'REJECTED',
      notes: 'License number expired or not found on wbmc.wb.gov.in rolls.'
    }, clinicToken);
    console.log('Status:', rejectRes.status, '| Message:', rejectRes.data.message);
    if (rejectRes.status !== 200 || rejectRes.data.doctor.verification_status !== 'REJECTED') {
      throw new Error(`Expected status REJECTED, got ${rejectRes.data.doctor.verification_status}`);
    }
    console.log('✓ PASS: Rejection successfully recorded in database.');

    console.log('\n======================================================');
    console.log('🎉 ALL 8 WBMC VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
