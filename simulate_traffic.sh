#!/bin/bash
echo "Starting webhook simulation traffic..."

repos=("company/backend-api:python" "company/frontend:javascript" "company/auth:java" "company/payments:python" "company/mobile:node")

for i in {1..20}; do
  # Pick random repo
  item=${repos[$RANDOM % ${#repos[@]}]}
  repo=$(echo $item | cut -d: -f1)
  lang=$(echo $item | cut -d: -f2)
  
  echo "Sending webhook for $repo ($lang)..."
  
  curl -s -X POST http://localhost:3000/webhook \
    -H "Content-Type: application/json" \
    -d "{\"repo\":\"$repo\",\"branch\":\"main\",\"language\":\"$lang\"}" > /dev/null
  
  # Random delay between 1-5 seconds
  sleep $((RANDOM % 5 + 1))
done

echo "Done sending 20 webhooks!"
