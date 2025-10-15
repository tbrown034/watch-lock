#!/bin/bash

# Test the room creation API endpoint directly
echo "🧪 Testing Room Creation API..."
echo "================================"

# Generate random share code for testing
SHARE_CODE=$(openssl rand -hex 3 | tr '[:lower:]' '[:upper:]')

# Create JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "gameId": "test-game-123",
  "name": "Test Room $(date +%s)",
  "maxMembers": 10,
  "homeTeam": "Test Home",
  "awayTeam": "Test Away"
}
EOF
)

echo "📝 Request payload:"
echo "$JSON_PAYLOAD" | jq .
echo ""

# Make the API call
echo "📡 Calling API..."
RESPONSE=$(curl -s -X POST \
  http://localhost:3000/api/rooms/create \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

# Check if response is JSON
if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
  echo "📥 Response:"
  echo "$RESPONSE" | jq .

  # Check if successful
  if echo "$RESPONSE" | jq -e '.roomId' >/dev/null 2>&1; then
    echo ""
    echo "✅ SUCCESS! Room created!"
    echo "   Room ID: $(echo "$RESPONSE" | jq -r '.roomId')"
    echo "   Share Code: $(echo "$RESPONSE" | jq -r '.shareCode')"
  else
    echo ""
    echo "❌ FAILED! Error creating room"
    echo "   Error: $(echo "$RESPONSE" | jq -r '.error')"
    echo "   Details: $(echo "$RESPONSE" | jq -r '.details')"
  fi
else
  echo "❌ Invalid response (not JSON):"
  echo "$RESPONSE"
fi