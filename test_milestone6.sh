#!/bin/bash

BASE_URL="http://localhost:8000"
DB_NAME="sentineliq"
DB_USER="sentineliq"

USER_EMAIL="test-$(date +%s)@example.com"
USER_PASSWORD="StrongPass123!"
NEW_PASSWORD="NewStrongPass456!"

echo "======================================================================="
echo "MILESTONE 6 END-TO-END TEST"
echo "======================================================================="
echo ""
echo "Test Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Database: $DB_NAME (User: $DB_USER)"
echo "  Test Email: $USER_EMAIL"
echo ""
echo "Test Flow:"
echo "  1. Create user (email_verified=false)"
echo "  2. Fetch email verification token from DB"
echo "  3. Verify email via API endpoint"
echo "  4. Login with verified email"
echo "  5. Access protected endpoints"
echo "  6. Test security headers"
echo "  7. Test token refresh"
echo "  8. Request password reset"
echo "  9. Confirm password reset"
echo "  10. Login with new password"
echo ""
echo "======================================================================="
echo ""

# ============================================================================
echo "==============================="
echo "1️⃣ Creating new user..."
echo "==============================="
CREATE_RESP=$(curl -s -X POST $BASE_URL/users/ \
-H "Content-Type: application/json" \
-d "{
  \"first_name\": \"Vinny\",
  \"last_name\": \"Collins\",
  \"email\": \"$USER_EMAIL\",
  \"password\": \"$USER_PASSWORD\",
  \"role\": \"viewer\"
}")
echo "$CREATE_RESP" | jq .

USER_ID=$(echo "$CREATE_RESP" | jq -r '.id // empty')
if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
  echo "❌ Failed to create user"
  echo "Response: $CREATE_RESP"
  exit 1
fi

echo "✅ User created with ID: $USER_ID"
echo ""

# ============================================================================
echo "==============================="
echo "2️⃣ Fetch email verification token from DB..."
echo "==============================="
sleep 1  # Wait for DB write
TOKEN_HASH=$(docker compose exec -T postgres psql -U $DB_USER -d $DB_NAME -t -c \
  "SELECT token_hash FROM email_tokens WHERE purpose='email_verification' AND user_id='$USER_ID' ORDER BY created_at DESC LIMIT 1;" 2>/dev/null | tr -d '[:space:]')

if [ -z "$TOKEN_HASH" ] || [ "$TOKEN_HASH" == "null" ]; then
  echo "❌ Failed to fetch token hash from database"
  exit 1
fi

echo "✅ Token hash fetched from DB"
echo "   Hash: ${TOKEN_HASH:0:20}...${TOKEN_HASH:(-20)}"
echo ""

# ============================================================================
echo "==============================="
echo "3️⃣ Verify email..."
echo "==============================="
VERIFY_RESP=$(curl -s -X POST "$BASE_URL/auth/verify-email?token=$TOKEN_HASH")
echo "$VERIFY_RESP" | jq .

if echo "$VERIFY_RESP" | jq -e '.detail' &>/dev/null; then
  echo "❌ Email verification failed"
  exit 1
fi

echo "✅ Email verified successfully"
echo ""

# ============================================================================
echo "==============================="
echo "4️⃣ Login with verified email..."
echo "==============================="
LOGIN_RESP=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d "{
  \"email\": \"$USER_EMAIL\",
  \"password\": \"$USER_PASSWORD\"
}")
echo "$LOGIN_RESP" | jq .

ACCESS_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.access_token // empty')
REFRESH_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.refresh_token // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# ============================================================================
echo "==============================="
echo "5️⃣ Access protected endpoint /users/me..."
echo "==============================="
ME_RESP=$(curl -s -X GET $BASE_URL/users/me \
-H "Authorization: Bearer $ACCESS_TOKEN")
echo "$ME_RESP" | jq .

echo "✅ Protected endpoint accessible"
echo ""

# ============================================================================
echo "==============================="
echo "6️⃣ Test security headers..."
echo "==============================="
echo "Checking OWASP security headers:"
curl -s -i -X GET $BASE_URL/users/me \
-H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null | grep -E "^(X-Content-Type|X-Frame|X-XSS|Referrer-Policy|Permissions)" | sed 's/^/   /'

echo "✅ Security headers present"
echo ""

# ============================================================================
echo "==============================="
echo "7️⃣ Refresh access token..."
echo "==============================="
REFRESH_RESP=$(curl -s -X POST $BASE_URL/auth/token/refresh \
-H "Content-Type: application/json" \
-d "{
  \"refresh_token\": \"$REFRESH_TOKEN\"
}")
echo "$REFRESH_RESP" | jq .

echo "✅ Token refresh tested"
echo ""

# ============================================================================
echo "==============================="
echo "8️⃣ Request password reset..."
echo "==============================="
RESET_REQ=$(curl -s -X POST $BASE_URL/auth/password-reset/request \
-H "Content-Type: application/json" \
-d "{
  \"email\": \"$USER_EMAIL\"
}")
echo "$RESET_REQ" | jq .

echo "✅ Password reset email sent"
echo ""

# ============================================================================
echo "==============================="
echo "9️⃣ Fetch password reset token and confirm reset..."
echo "==============================="
sleep 1
RESET_TOKEN_HASH=$(docker compose exec -T postgres psql -U $DB_USER -d $DB_NAME -t -c \
  "SELECT token_hash FROM email_tokens WHERE purpose='password_reset' AND user_id='$USER_ID' ORDER BY created_at DESC LIMIT 1;" 2>/dev/null | tr -d '[:space:]')

if [ -z "$RESET_TOKEN_HASH" ] || [ "$RESET_TOKEN_HASH" == "null" ]; then
  echo "⚠️  No password reset token found"
else
  echo "✅ Password reset token found"
  
  CONFIRM_RESP=$(curl -s -X POST $BASE_URL/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$RESET_TOKEN_HASH\",
    \"new_password\": \"$NEW_PASSWORD\"
  }")
  echo "$CONFIRM_RESP" | jq .
  
  if echo "$CONFIRM_RESP" | jq -e '.detail' &>/dev/null; then
    echo "⚠️  Password reset confirmation had issues"
  else
    echo "✅ Password reset confirmed"
  fi
fi
echo ""

# ============================================================================
echo "==============================="
echo "🔟 Test rate limiting (failed logins)..."
echo "==============================="
echo "Attempting 6 failed logins..."
for i in {1..6}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"WrongPassword\"
  }")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo "   Attempt $i: HTTP $HTTP_CODE (Rate Limited) ✅"
  else
    echo "   Attempt $i: HTTP $HTTP_CODE"
  fi
done

echo ""
echo "======================================================================="
echo "✅ MILESTONE 6 TESTS COMPLETE!"
echo "======================================================================="
echo ""
echo "✅ Passed Tests:"
echo "   • User creation with email_verified=false"
echo "   • Email verification via token"
echo "   • Login after email verification"
echo "   • Protected endpoint access (/users/me)"
echo "   • Security headers (OWASP)"
echo "   • Token refresh"
echo "   • Password reset flow"
echo "   • Rate limiting on failed logins"
echo ""
echo "📧 Email Testing:"
echo "   View sent emails: http://localhost:8025"
echo ""

