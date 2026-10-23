/**
 * MediNexa West Bengal Doctor Verification Service
 * Handles official WBMC validation and third-party Emver API integration.
 */

const https = require('https');
const http = require('http');

// Recognized representations of the West Bengal Medical Council
const WBMC_COUNCILS = [
  'west bengal medical council',
  'west bengal medical council (wbmc)',
  'wbmc',
  'west bengal'
];

/**
 * Checks whether the submitted registration authority is West Bengal Medical Council
 */
function isWBMCCouncil(authority) {
  if (!authority || typeof authority !== 'string') return false;
  const clean = authority.trim().toLowerCase();
  return WBMC_COUNCILS.some(c => clean === c || clean.includes('west bengal'));
}

/**
 * Cleans and tokenizes doctor names for resilient comparison
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/^dr\.?\s+/i, '')
    .replace(/^doctor\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Checks if two doctor names match with reasonable tolerance for token ordering & honorifics
 */
function namesMatch(submittedName, recordName) {
  const normSub = normalizeName(submittedName);
  const normRec = normalizeName(recordName);

  if (!normSub || !normRec) return false;
  if (normSub === normRec) return true;

  const subTokens = normSub.split(/\s+/).filter(Boolean);
  const recTokens = normRec.split(/\s+/).filter(Boolean);

  // If all tokens of the submitted name are found in the record name, or vice versa
  const subInRec = subTokens.every(t => recTokens.includes(t));
  const recInSub = recTokens.every(t => subTokens.includes(t));

  return subInRec || recInSub;
}

/**
 * Makes a secure outbound request to the Emver Doctor Verification API
 */
async function queryEmverApi(regNumber, councilName) {
  const apiKey = process.env.EMVER_API_KEY;
  if (!apiKey) {
    return {
      available: false,
      reason: 'PROVIDER_KEY_NOT_CONFIGURED',
      error: 'Emver API key is not configured in server environment.'
    };
  }

  const endpoint = process.env.EMVER_API_URL || 'https://app.emver.io/api/sandbox/v1/doctor-verification';

  try {
    const parsedUrl = new URL(endpoint);
    const postData = JSON.stringify({
      reg_number: String(regNumber).trim(),
      medical_council: councilName || 'West Bengal Medical Council'
    });

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    return await new Promise((resolve) => {
      const req = client.request(parsedUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 5000 // 5-second strict timeout
      }, (res) => {
        let rawBody = '';
        res.on('data', chunk => rawBody += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(rawBody);
            resolve({
              available: true,
              statusCode: res.statusCode,
              data
            });
          } catch (e) {
            resolve({
              available: false,
              statusCode: res.statusCode,
              reason: 'INVALID_JSON_RESPONSE',
              error: 'Provider returned non-JSON response.'
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          available: false,
          reason: 'TIMEOUT',
          error: 'Emver API request timed out after 5000ms.'
        });
      });

      req.on('error', (err) => {
        // Redact any potential query params or secrets from logging
        console.warn(`[DoctorVerification] Emver request error: ${err.message}`);
        resolve({
          available: false,
          reason: 'NETWORK_ERROR',
          error: err.message
        });
      });

      req.write(postData);
      req.end();
    });
  } catch (err) {
    return {
      available: false,
      reason: 'CONFIGURATION_ERROR',
      error: err.message
    };
  }
}

/**
 * Main verification pipeline for incoming doctor registrations
 */
async function verifyDoctorCredentials({ name, registration_number, registration_authority, registration_year }) {
  // 1. Council Eligibility: Only WBMC is supported in this release
  if (!isWBMCCouncil(registration_authority)) {
    return {
      eligible: false,
      status: 'REJECTED',
      source: 'NONE',
      reason: 'UNSUPPORTED_COUNCIL',
      notes: 'Registration rejected: For this release, only doctors registered with the West Bengal Medical Council (WBMC) are supported.'
    };
  }

  // 2. Validate registration number format (string, non-empty, preserving leading zeros)
  const cleanRegNo = String(registration_number || '').trim();
  if (!cleanRegNo) {
    return {
      eligible: false,
      status: 'REJECTED',
      source: 'NONE',
      reason: 'MISSING_REGISTRATION_NUMBER',
      notes: 'Registration number is mandatory for WBMC medical license verification.'
    };
  }

  // 3. Query third-party Emver API if configured
  const apiResult = await queryEmverApi(cleanRegNo, 'West Bengal Medical Council');

  // If automated API check was successfully conducted
  if (apiResult.available && apiResult.statusCode === 200 && apiResult.data) {
    const payload = apiResult.data;
    const returnedCouncil = payload.medical_council || payload.council || '';
    const returnedRegNo = String(payload.reg_number || payload.registration_number || '').trim();
    const returnedName = payload.name || payload.doctor_name || payload.registered_name || '';
    const isActive = payload.status === 'active' || payload.is_verified === true || payload.status === 'VERIFIED';

    // Strict multi-factor verification check:
    const councilMatches = isWBMCCouncil(returnedCouncil);
    const regMatches = returnedRegNo.toLowerCase() === cleanRegNo.toLowerCase();
    const nameMatches = namesMatch(name, returnedName);

    if (councilMatches && regMatches && nameMatches && isActive) {
      return {
        eligible: true,
        status: 'VERIFIED',
        source: 'EMVER_API_AUTOMATED',
        verified_at: new Date(),
        notes: `Verified automatically via Emver against WBMC roll. License registered to ${returnedName}.`,
        record: {
          council: returnedCouncil,
          reg_number: returnedRegNo,
          name: returnedName,
          year: payload.year_of_registration || registration_year
        }
      };
    } else if (!nameMatches && regMatches) {
      return {
        eligible: true,
        status: 'UNDER_REVIEW',
        source: 'EMVER_API_AUTOMATED',
        reason: 'NAME_MISMATCH',
        notes: `WBMC license #${cleanRegNo} exists, but applicant name (${name}) does not closely match council record name (${returnedName}). Held for administrative review.`
      };
    } else {
      return {
        eligible: true,
        status: 'UNDER_REVIEW',
        source: 'EMVER_API_AUTOMATED',
        reason: 'INCONCLUSIVE_MATCH',
        notes: `Automated match inconclusive. Held for manual comparison on official WBMC search.`
      };
    }
  }

  // 4. Fallback: Automated check unavailable or in sandbox without key
  // Doctor is placed in UNDER_REVIEW for manual verification against https://wbmc.wb.gov.in/index.php/doctor_search
  return {
    eligible: true,
    status: 'UNDER_REVIEW',
    source: 'NONE',
    reason: apiResult.reason || 'QUEUED_FOR_MANUAL_REVIEW',
    notes: `Submitted for official West Bengal Medical Council verification. Enqueued for administrative audit against official WBMC register (wbmc.wb.gov.in).`
  };
}

module.exports = {
  isWBMCCouncil,
  normalizeName,
  namesMatch,
  queryEmverApi,
  verifyDoctorCredentials
};
