#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${QWEN_ENDPOINT:-http://127.0.0.1:8080}"
RESULTS_DIR="$(cd "$(dirname "$0")" && pwd)/results"
TRIALS="${QWEN_TRIALS:-3}"

usage() {
  echo "Usage: qwen-bench.sh [--health] [--run <name> <prompt-json>] [--trials N]"
  echo "  --health        Check endpoint health and model info"
  echo "  --run NAME FILE Run experiment NAME using prompt JSON from FILE"
  echo "  --trials N      Override trial count (default: 3)"
  exit 1
}

health_check() {
  local health model
  health=$(curl -sf "$ENDPOINT/health" 2>/dev/null) || { echo "FAIL: endpoint unreachable at $ENDPOINT"; exit 1; }
  model=$(curl -sf "$ENDPOINT/v1/models" 2>/dev/null | jq -r '.data[0].id // "unknown"')
  echo "OK: $ENDPOINT — model: $model"
}

run_experiment() {
  local name="$1" prompt_file="$2"
  mkdir -p "$RESULTS_DIR"

  if [[ ! -f "$prompt_file" ]]; then
    echo "ERROR: prompt file not found: $prompt_file" >&2
    exit 1
  fi

  echo "=== $name ($TRIALS trials) ==="
  for i in $(seq 1 "$TRIALS"); do
    local out_file="$RESULTS_DIR/${name}_trial${i}.json"
    local start_ns end_ns latency_ms

    start_ns=$(python3 -c 'import time; print(int(time.time_ns()))')
    local response
    response=$(curl -sf "$ENDPOINT/v1/chat/completions" \
      -H "Content-Type: application/json" \
      -d @"$prompt_file" 2>/dev/null) || { echo "  Trial $i: CURL_FAIL"; continue; }
    end_ns=$(python3 -c 'import time; print(int(time.time_ns()))')

    latency_ms=$(( (end_ns - start_ns) / 1000000 ))
    local in_tok out_tok
    in_tok=$(echo "$response" | jq '.usage.prompt_tokens // 0')
    out_tok=$(echo "$response" | jq '.usage.completion_tokens // 0')
    local content
    content=$(echo "$response" | jq -r '.choices[0].message.content // ""')

    jq -n \
      --arg name "$name" \
      --argjson trial "$i" \
      --argjson latency "$latency_ms" \
      --argjson in_tokens "$in_tok" \
      --argjson out_tokens "$out_tok" \
      --arg content "$content" \
      --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{name: $name, trial: $trial, latency_ms: $latency, in_tokens: $in_tokens, out_tokens: $out_tokens, content: $content, timestamp: $timestamp}' \
      > "$out_file"

    printf "  Trial %d: %dms, in=%d, out=%d\n" "$i" "$latency_ms" "$in_tok" "$out_tok"
  done
}

if [[ $# -eq 0 ]]; then usage; fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --health) health_check; exit 0 ;;
    --trials) TRIALS="$2"; shift 2 ;;
    --run) run_experiment "$2" "$3"; exit 0 ;;
    *) usage ;;
  esac
done
