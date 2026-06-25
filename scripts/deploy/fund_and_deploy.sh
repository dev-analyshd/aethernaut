#!/usr/bin/env bash
# AETHERNAUT — Auto-deploy once address is funded
# Usage: bash fund_and_deploy.sh
# 
# Fund address first:
#   https://testnet.faucet.injective.network/
#   Address: inj15d69fyxxxwdkr7pecmxyr245w5jqchm955e2mk
#   (or) https://cloud.google.com/application/web3/faucet/injective/testnet

set -e
PYTHONPATH="/home/runner/workspace/.pythonlibs/lib/python3.11/site-packages:$PYTHONPATH"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ADDRESS="inj15d69fyxxxwdkr7pecmxyr245w5jqchm955e2mk"
REST="https://testnet.sentry.lcd.injective.network"

echo "================================================================"
echo "  AETHERNAUT — Injective Testnet Deployment"
echo "================================================================"
echo "  Address: $ADDRESS"
echo ""
echo "  To fund (requires browser):"
echo "  → https://testnet.faucet.injective.network/"
echo "  → https://cloud.google.com/application/web3/faucet/injective/testnet"
echo ""
echo "  Polling balance every 10s..."
echo "----------------------------------------------------------------"

while true; do
  BAL=$(curl -sf "$REST/cosmos/bank/v1beta1/balances/$ADDRESS/inj" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('balance',{}).get('amount','0'))" 2>/dev/null || echo "0")
  
  INJ=$(python3 -c "print(f'{int(\"$BAL\")/1e18:.4f}')" 2>/dev/null || echo "0.0000")
  echo "  $(date '+%H:%M:%S') Balance: $INJ INJ ($BAL atto-INJ)"
  
  if [ "$BAL" -gt "100000000000000000" ] 2>/dev/null; then
    echo ""
    echo "  ✓ Funded! Starting deployment..."
    echo "================================================================"
    cd "$SCRIPT_DIR"
    python3 deploy_and_interact.py
    exit 0
  fi
  
  sleep 10
done
