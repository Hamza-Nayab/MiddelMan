const { Pool } = require('pg');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5010';

// Step 1: Check database
async function checkDatabase() {
  console.log('\n=== STEP 1: Checking Database ===');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT id, review_id, seller_id, status, reason, evidence_url, evidence_mime, evidence_key 
      FROM review_disputes 
      ORDER BY id DESC 
      LIMIT 5
    `);
    console.log('Recent disputes in database:');
    console.table(result.rows);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await pool.end();
  }
}

// Step 2: Login as seller
async function loginAsSeller() {
  console.log('\n=== STEP 2: Login as Seller ===');
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Scalaris',
      password: 'password'
    })
  });
  
  const setCookie = response.headers.get('set-cookie');
  const data = await response.json();
  console.log('Login response:', data);
  console.log('Session cookie:', setCookie ? 'Present' : 'Missing');
  return setCookie;
}

// Step 3: Get seller's reviews
async function getSellerReviews(cookie) {
  console.log('\n=== STEP 3: Get Seller Reviews ===');
  const response = await fetch(`${BASE_URL}/api/me/reviews`, {
    headers: { 'Cookie': cookie }
  });
  
  const data = await response.json();
  console.log('Reviews response:', JSON.stringify(data, null, 2));
  return data.data?.items || [];
}

// Step 4: Create dispute
async function createDispute(cookie, reviewId) {
  console.log('\n=== STEP 4: Create Dispute ===');
  console.log('Creating dispute for review ID:', reviewId);
  
  const response = await fetch(`${BASE_URL}/api/me/reviews/${reviewId}/dispute`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie 
    },
    body: JSON.stringify({
      reason: 'fake-review',
      message: 'Testing evidence upload - automated test'
    })
  });
  
  const data = await response.json();
  console.log('Create dispute response:', JSON.stringify(data, null, 2));
  console.log('Status:', response.status);
  return data;
}

// Step 5: Upload evidence
async function uploadEvidence(cookie, reviewId, imagePath) {
  console.log('\n=== STEP 5: Upload Evidence ===');
  console.log('Uploading evidence for review ID:', reviewId);
  
  const formData = new FormData();
  formData.append('evidence', fs.createReadStream(imagePath));
  
  const response = await fetch(`${BASE_URL}/api/me/reviews/${reviewId}/dispute/evidence`, {
    method: 'POST',
    headers: { 
      'Cookie': cookie,
      ...formData.getHeaders()
    },
    body: formData
  });
  
  const data = await response.json();
  console.log('Upload evidence response:', JSON.stringify(data, null, 2));
  console.log('Status:', response.status);
  return data;
}

// Step 6: Login as admin
async function loginAsAdmin() {
  console.log('\n=== STEP 6: Login as Admin ===');
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  const setCookie = response.headers.get('set-cookie');
  const data = await response.json();
  console.log('Admin login response:', data);
  return setCookie;
}

// Step 7: Get admin disputes
async function getAdminDisputes(cookie) {
  console.log('\n=== STEP 7: Get Admin Disputes ===');
  const response = await fetch(`${BASE_URL}/api/admin/disputes?status=open`, {
    headers: { 'Cookie': cookie }
  });
  
  const data = await response.json();
  console.log('Admin disputes response:', JSON.stringify(data, null, 2));
  
  if (data.data?.items) {
    console.log('\nEvidence URLs in disputes:');
    data.data.items.forEach(dispute => {
      console.log(`Dispute #${dispute.id}:`, {
        evidenceUrl: dispute.evidenceUrl || 'MISSING',
        evidenceMime: dispute.evidenceMime || 'MISSING'
      });
    });
  }
  
  return data;
}

// Create a test image
function createTestImage() {
  console.log('\n=== Creating Test Image ===');
  const testImagePath = path.join(__dirname, 'test-evidence.png');
  
  // Create a simple 1x1 PNG
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(testImagePath, pngData);
  console.log('Test image created at:', testImagePath);
  return testImagePath;
}

// Main test flow
async function runTest() {
  try {
    // Check database first
    await checkDatabase();
    
    // Create test image
    const testImagePath = createTestImage();
    
    // Login as seller
    const sellerCookie = await loginAsSeller();
    if (!sellerCookie) {
      console.error('Failed to login as seller');
      return;
    }
    
    // Get reviews
    const reviews = await getSellerReviews(sellerCookie);
    if (reviews.length === 0) {
      console.error('No reviews found for seller');
      return;
    }
    
    // Find a review without existing dispute
    let reviewToDispute = null;
    for (const review of reviews) {
      if (!review.dispute) {
        reviewToDispute = review;
        break;
      }
    }
    
    if (!reviewToDispute) {
      console.log('All reviews already have disputes. Using first review:', reviews[0].id);
      reviewToDispute = reviews[0];
    }
    
    console.log('\nUsing review ID:', reviewToDispute.id);
    
    // Create dispute
    const disputeResult = await createDispute(sellerCookie, reviewToDispute.id);
    if (!disputeResult.success) {
      console.error('Failed to create dispute:', disputeResult);
      
      // If dispute exists, try to upload evidence anyway
      if (disputeResult.error?.code === 'DISPUTE_EXISTS') {
        console.log('Dispute already exists, trying to upload evidence...');
      } else {
        return;
      }
    }
    
    // Upload evidence
    const uploadResult = await uploadEvidence(sellerCookie, reviewToDispute.id, testImagePath);
    if (!uploadResult.success) {
      console.error('Failed to upload evidence:', uploadResult);
      // Continue anyway to check admin side
    }
    
    // Check database again
    await checkDatabase();
    
    // Login as admin
    const adminCookie = await loginAsAdmin();
    if (!adminCookie) {
      console.error('Failed to login as admin');
      return;
    }
    
    // Get admin disputes
    await getAdminDisputes(adminCookie);
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

runTest();
