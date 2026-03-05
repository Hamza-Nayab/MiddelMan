#!/bin/bash

BASE_URL="http://localhost:5010"

echo "=== STEP 1: Check Database ==="
echo "SELECT id, review_id, evidence_url, evidence_mime FROM review_disputes ORDER BY id DESC LIMIT 5;" | sqlite3 middlemen.db 2>/dev/null || echo "Database check skipped (PostgreSQL in use)"

echo -e "\n=== STEP 2: Login as Seller ==="
SELLER_RESPONSE=$(curl -s -c seller_cookies.txt -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"Scalaris","password":"password"}')
echo "$SELLER_RESPONSE" | jq '.' 2>/dev/null || echo "$SELLER_RESPONSE"

echo -e "\n=== STEP 3: Get Seller Reviews ==="
REVIEWS_RESPONSE=$(curl -s -b seller_cookies.txt "${BASE_URL}/api/me/reviews")
echo "$REVIEWS_RESPONSE" | jq '.data.items[] | {id, rating, comment, dispute}' 2>/dev/null || echo "$REVIEWS_RESPONSE"

# Extract first review ID
REVIEW_ID=$(echo "$REVIEWS_RESPONSE" | jq -r '.data.items[0].id' 2>/dev/null)
echo -e "\nUsing Review ID: $REVIEW_ID"

echo -e "\n=== STEP 4: Create Dispute ==="
CREATE_DISPUTE_RESPONSE=$(curl -s -b seller_cookies.txt -X POST "${BASE_URL}/api/me/reviews/${REVIEW_ID}/dispute" \
  -H "Content-Type: application/json" \
  -d '{"reason":"fake-review","message":"Test dispute from bash script"}')
echo "$CREATE_DISPUTE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_DISPUTE_RESPONSE"

# Create a test PNG image
echo -e "\n=== STEP 5: Create Test Image ==="
echo -e '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > test-evidence.png
echo "Created test-evidence.png"

echo -e "\n=== STEP 6: Upload Evidence ==="
UPLOAD_RESPONSE=$(curl -s -b seller_cookies.txt -X POST "${BASE_URL}/api/me/reviews/${REVIEW_ID}/dispute/evidence" \
  -F "evidence=@test-evidence.png")
echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"

echo -e "\n=== STEP 7: Login as Admin ==="
ADMIN_RESPONSE=$(curl -s -c admin_cookies.txt -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"admin","password":"admin123"}')
echo "$ADMIN_RESPONSE" | jq '.' 2>/dev/null || echo "$ADMIN_RESPONSE"

echo -e "\n=== STEP 8: Get Admin Disputes ==="
DISPUTES_RESPONSE=$(curl -s -b admin_cookies.txt "${BASE_URL}/api/admin/disputes?status=open")
echo "$DISPUTES_RESPONSE" | jq '.data.items[] | {id, reviewId, evidenceUrl, evidenceMime}' 2>/dev/null || echo "$DISPUTES_RESPONSE"

echo -e "\n=== STEP 9: Check Evidence URLs ==="
echo "$DISPUTES_RESPONSE" | jq -r '.data.items[] | "Dispute #\(.id): evidenceUrl=\(.evidenceUrl // "NULL"), evidenceMime=\(.evidenceMime // "NULL")"' 2>/dev/null

# Cleanup
rm -f seller_cookies.txt admin_cookies.txt test-evidence.png

echo -e "\n=== TEST COMPLETE ==="
