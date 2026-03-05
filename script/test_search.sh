#!/bin/bash
# Test script to verify search functionality is working correctly

echo "🔍 Testing Search API..."
echo ""

# Test 1: Basic search
echo "Test 1: Search for 'seller_1'"
curl -s 'http://localhost:5010/api/search?q=seller_1&limit=1' | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['ok']:
    r = data['data']['results'][0]
    print(f\"✅ Username: {r['username']}\")
    print(f\"✅ Display Name: {r['displayName']}\")
    print(f\"✅ Bio: {r['bio'] or 'None'}\")
    print(f\"✅ Avatar: {'Set' if r['avatarUrl'] else 'Default'}\")
else:
    print('❌ Search failed')
"
echo ""

# Test 2: Multiple results
echo "Test 2: Search for 'seller' (multiple results)"
curl -s 'http://localhost:5010/api/search?q=seller&limit=3' | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['ok']:
    results = data['data']['results']
    print(f\"✅ Found {len(results)} results\")
    for r in results:
        print(f\"   - @{r['username']}: {r['displayName']}\")
else:
    print('❌ Search failed')
"
echo ""

# Test 3: Search suggestions
echo "Test 3: Search suggestions for 'seller'"
curl -s 'http://localhost:5010/api/search/suggest?q=seller' | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['ok']:
    suggestions = data['data']['suggestions']
    print(f\"✅ Found {len(suggestions)} suggestions\")
    for s in suggestions[:3]:
        print(f\"   - @{s['username']}: {s['displayName']}\")
else:
    print('❌ Suggestions failed')
"
echo ""

# Test 4: Verify response structure
echo "Test 4: Verify flat response structure"
curl -s 'http://localhost:5010/api/search?q=seller_5&limit=1' | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['ok']:
    r = data['data']['results'][0]
    # Check for flat structure (no nested 'user', 'profile', 'stats')
    if all(k in r for k in ['username', 'displayName', 'bio', 'avatarUrl', 'avgRating', 'totalReviews']):
        if 'user' not in r and 'profile' not in r and 'stats' not in r:
            print('✅ Response has correct flat structure')
            print(f\"   Fields: {', '.join(r.keys())}\")
        else:
            print('❌ Response has nested structure (user/profile/stats)')
    else:
        print('❌ Response missing required fields')
else:
    print('❌ Search failed')
"
echo ""
echo "✅ All tests completed!"
