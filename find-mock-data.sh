#!/bin/bash
cd /workspaces/logistics-hub

echo "=== PAGE FILES ==="
find src -type f \( -name "*.jsx" -o -name "*.js" \) \
  | grep -iE "pages?/|views?/" | sort

echo ""
echo "=== WHICH PAGES ALREADY FETCH ==="
grep -rln "fetch(\|axios\|supabase\." src --include=*.jsx --include=*.js | sort

echo ""
echo "=== HARDCODED ARRAYS (likely mock data) ==="
grep -rn "const .* = \[" src --include=*.jsx --include=*.js \
  | grep -v node_modules | head -40

echo ""
echo "=== MOCK-ISH NAMES ==="
grep -rniE "mock|dummy|sample|placeholder|testData|fakeData" src \
  --include=*.jsx --include=*.js | head -30

echo ""
echo "=== LINE COUNTS ==="
find src -type f \( -name "*.jsx" -o -name "*.js" \) -exec wc -l {} + | sort -rn | head -20
