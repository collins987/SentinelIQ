#!/bin/bash

BASE_URL="http://localhost:8000"
DB_NAME="sentineliq"
DB_USER="sentineliq"

USER_EMAIL="vinny@example.com"
USER_PASSWORD="StrongPass123!"
NEW_PASSWORD="NewStrongPass456!"

echo "==============================="
echo "1️⃣ Creating new user..."
echo "==============================="
curl -s -X POST $BASE_URL/users/ \
-H "Content-Type: application/json" \
-d "{
  \"first_name\": \"Vinny\",
  \"last_name\": \"Collins\",
  \"email\": \"$USER_EMAIL\",
  \"password\": \"$USER_PASSWORD\",
  \"role\": \"viewer\"
}" | jq

echo
echo "==============================="
echo "2️⃣ Fetch email verification token from DB..."
echo "==============================="
TOKEN=$(docker compose exec -T postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT token_hash FROM email_tokens WHERE purpose='email_verification' ORDER BY created_at DESC LIMIT 1;" | tr -d '[:space:]')
echo "Token fetched: $TOKEN"

echo
echo "==============================="
echo "3️⃣ Verify email..."
echo "==============================="
curl -s -X POST "$BASE_URL/auth/verify-email?token=$TOKEN" | jq

echo
echo "==============================="
echo "4️⃣ Login with verified email..."
echo "==============================="
LOGIN_RESP=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d "{
  \"email\": \"$USER_EMAIL\",
  \"password\": \"$USER_PASSWORD\"
}")
echo $LOGIN_RESP | jq

ACCESS_TOKEN=$(echo $LOGIN_RESP | jq -r '.access_token')
REFRESH_TOKEN=$(echo $LOGIN_RESP | jq -r '.refresh_token')

echo
echo "==============================="
echo "5️⃣ Access protected endpoint /users/me..."
echo "==============================="
curl -s -X GET $BASE_URL/users/me \
-H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo
echo "==============================="
echo "6️⃣ Test security headers..."
echo "==============================="
curl -i -s -X GET $BASE_URL/users/me \
-H "Authorization: Bearer $ACCESS_TOKEN" | grep -E "X-|Content-Security-Policy|Referrer-Policy"

echo
echo "==============================="
echo "7️⃣ Refresh access token..."
echo "==============================="
REFRESH_RESP=$(curl -s -X POST $BASE_URL/auth/token/refresh \
-H "Content-Type: application/json" \
-d "{
  \"refresh_token\": \"$REFRESH_TOKEN\"
}")
echo $REFRESH_RESP | jq

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESP | jq -r '.access_token')

echo
echo "==============================="
echo "8️⃣ Request password reset..."
echo "==============================="
curl -s -X POST $BASE_URL/auth/password-reset/request \
-H "Content-Type: application/json" \
-d "{
  \"email\": \"$USER_EMAIL\"
}" | jq

echo
echo "==============================="
echo "9️⃣ Fetch password reset token from DB..."
echo "==============================="
RESET_TOKEN=$(docker compose exec -T postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT token_hash FROM email_tokens WHERE purpose='password_reset' ORDER BY created_at DESC LIMIT 1;" | tr -d '[:space:]')
echo "Reset token: $RESET_TOKEN"

echo
echo "==============================="
echo "🔟 Confirm password reset..."
echo "==============================="
curl -s -X POST $BASE_URL/auth/password-reset/confirm \
-H "Content-Type: application/json" \
-d "{
  \"token\": \"$RESET_TOKEN\",
  \"new_password\": \"$NEW_PASSWORD\"
}" | jq

echo
echo "==============================="
echo "1️⃣1️⃣ Login with new password..."
echo "==============================="
NEW_LOGIN=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d "{
  \"email\": \"$USER_EMAIL\",
  \"password\": \"$NEW_PASSWORD\"
}")
echo $NEW_LOGIN | jq

NEW_ACCESS_TOKEN=$(echo $NEW_LOGIN | jq -r '.access_token')

echo
echo "==============================="
echo "1️⃣2️⃣ Logout from single device..."
echo "==============================="
curl -s -X POST $BASE_URL/auth/logout \
-H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{}' | jq

echo
echo "==============================="
echo "1️⃣3️⃣ Logout from all devices..."
echo "==============================="
curl -s -X POST $BASE_URL/auth/logout-all-devices \
-H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq

echo
echo "==============================="
echo "1️⃣4️⃣ Test rate limiting (5 failed logins)..."
echo "==============================="
for i in {1..6}; do
  RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"WrongPassword\"
  }")
  echo "Attempt $i: $RESPONSE"
done

echo
echo "✅ All Milestone 6 tests completed!"
