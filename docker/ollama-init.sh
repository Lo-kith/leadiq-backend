#!/bin/sh
set -e
MODEL=""
until curl -s --fail http://ollama:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done
if curl -s http://ollama:11434/api/tags 2>/dev/null | grep -q "\"name\":\"\""; then
  echo "Model  exists"
else
  echo "Pulling ..."
  curl -s -X POST http://ollama:11434/api/pull -d "{\"name\":\"\"}" -H "Content-Type: application/json"
fi
