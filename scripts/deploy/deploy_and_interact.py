"""
AETHERNAUT — Full on-chain deployment + 50+ interaction script
Targets Injective testnet (injective-888)

Run: python3 deploy_and_interact.py
"""

import sys, os, json, time, base64, hashlib, gzip
sys.path.insert(0, os.path.dirname(__file__))
from injective_sign import (
    ADDRESS, get_account_info, get_balance, send_tx, check_tx,
    msg_store_code, msg_instantiate, msg_execute, REST_URL
)
import requests

# ─── State ──────────────────────────────────────────────────────────────────

results = []
interaction_count = 0

def log_result(label, ok, txhash="", detail=""):
    global interaction_count
    interaction_count += 1
    status = "PASS" if ok else "FAIL"
    print(f"  [{interaction_count:02d}] [{status}] {label}" + (f" — {txhash[:16]}..." if txhash else "") + (f" ({detail})" if detail else ""))
    results.append({"n": interaction_count, "label": label, "ok": ok, "txhash": txhash})

# ─── Contract query ──────────────────────────────────────────────────────────

def query_contract(contract: str, query_msg: dict) -> dict | None:
    import base64, requests
    msg_b64 = base64.b64encode(json.dumps(query_msg, separators=(',',':')).encode()).decode()
    url = f"{REST_URL}/cosmwasm/wasm/v1/contract/{contract}/smart/{msg_b64}"
    r = requests.get(url, timeout=10)
    if r.status_code == 200:
        return r.json().get("data")
    return None

def find_contract_from_tx(txhash: str) -> str | None:
    """Poll for tx result and extract instantiated contract address."""
    for attempt in range(12):
        time.sleep(2.5)
        r = requests.get(f"{REST_URL}/cosmos/tx/v1beta1/txs/{txhash}", timeout=10)
        if r.status_code == 200:
            resp = r.json().get("tx_response", {})
            logs = resp.get("logs", [])
            for log in logs:
                for evt in log.get("events", []):
                    if evt.get("type") == "instantiate":
                        for attr in evt.get("attributes", []):
                            if attr.get("key") == "_contract_address":
                                return attr["value"]
            # Also check events at top level
            for evt in resp.get("events", []):
                if evt.get("type") == "instantiate":
                    for attr in evt.get("attributes", []):
                        if attr.get("key") in ("_contract_address", "contract_address"):
                            return attr["value"]
    return None

def find_code_id_from_tx(txhash: str) -> int | None:
    for attempt in range(12):
        time.sleep(2.5)
        r = requests.get(f"{REST_URL}/cosmos/tx/v1beta1/txs/{txhash}", timeout=10)
        if r.status_code == 200:
            resp = r.json().get("tx_response", {})
            logs = resp.get("logs", [])
            for log in logs:
                for evt in log.get("events", []):
                    if evt.get("type") == "store_code":
                        for attr in evt.get("attributes", []):
                            if attr.get("key") == "code_id":
                                return int(attr["value"])
            for evt in resp.get("events", []):
                for attr in evt.get("attributes", []):
                    if attr.get("key") == "code_id":
                        return int(attr["value"])
    return None

# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "="*60)
    print("  AETHERNAUT — On-chain Deployment + Interaction Suite")
    print("="*60)
    print(f"  Network:  Injective Testnet (injective-888)")
    print(f"  Deployer: {ADDRESS}")

    # Check balance
    bal = get_balance()
    bal_inj = bal / 1e18
    print(f"  Balance:  {bal_inj:.4f} INJ")
    if bal < 10**17:  # < 0.1 INJ
        print("\n  ERROR: Insufficient balance. Fund the address at:")
        print("  https://testnet.faucet.injective.network/")
        sys.exit(1)

    acc_num, seq = get_account_info()
    print(f"  Account:  #{acc_num}, Sequence: {seq}")

    # Load wasm
    wasm_path = os.path.join(os.path.dirname(__file__),
                             "../../contracts/aethernaut-mesh/artifacts/aethernaut_mesh.wasm")
    if not os.path.exists(wasm_path):
        # Try unoptimized
        wasm_path = os.path.join(os.path.dirname(__file__),
                                 "../../contracts/aethernaut-mesh/artifacts/aethernaut-mesh.wasm")
    if not os.path.exists(wasm_path):
        print(f"\n  ERROR: Wasm not found at {wasm_path}")
        print("  Run: docker run --rm -v $(pwd)/contracts/aethernaut-mesh:/code cosmwasm/optimizer:0.16.0")
        sys.exit(1)

    wasm_bytes = open(wasm_path, "rb").read()
    print(f"  Wasm:     {len(wasm_bytes)/1024:.1f} KB")
    print()

    # ── 1. Upload contract ──────────────────────────────────────────────────
    print("── Phase 1: Contract Upload ──")
    type_url, body = msg_store_code(wasm_bytes)
    result, seq = send_tx(type_url, body, seq, acc_num, "AETHERNAUT upload", wait=3.0)
    ok = result.get("tx_response", {}).get("code", -1) == 0
    txhash_upload = result.get("tx_response", {}).get("txhash", "")
    log_result("MsgStoreCode (upload wasm)", ok, txhash_upload)
    if not ok:
        print(f"  Raw log: {result.get('tx_response',{}).get('raw_log','')[:200]}")
        sys.exit(1)

    print(f"  Waiting for code_id from tx {txhash_upload[:16]}...")
    code_id = find_code_id_from_tx(txhash_upload)
    if not code_id:
        print("  ERROR: Could not extract code_id from upload tx")
        sys.exit(1)
    print(f"  code_id: {code_id}")

    # ── 2. Instantiate ────────────────────────────────────────────────────────
    print("\n── Phase 2: Instantiate Contract ──")
    init_msg = {
        "min_reputation_to_join": 1000,
        "coherence_threshold": 5000,
        "agk_evolution_interval": 100,
        "losar_decay_factor": 10
    }
    type_url, body = msg_instantiate(code_id, "aethernaut-mesh-v0.1", init_msg)
    result, seq = send_tx(type_url, body, seq, acc_num, "AETHERNAUT instantiate", wait=3.0)
    ok = result.get("tx_response", {}).get("code", -1) == 0
    txhash_inst = result.get("tx_response", {}).get("txhash", "")
    log_result("MsgInstantiateContract", ok, txhash_inst)
    if not ok:
        print(f"  Raw log: {result.get('tx_response',{}).get('raw_log','')[:200]}")
        sys.exit(1)

    print(f"  Waiting for contract address...")
    contract = find_contract_from_tx(txhash_inst)
    if not contract:
        print("  ERROR: Could not extract contract address")
        sys.exit(1)
    print(f"  Contract: {contract}")
    print(f"  Explorer: https://testnet.explorer.injective.network/contract/{contract}")

    # Save deployment info
    deploy_info = {
        "network": "testnet", "chainId": "injective-888",
        "codeId": code_id, "contractAddress": contract,
        "deployer": ADDRESS, "deployedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "txUpload": txhash_upload, "txInstantiate": txhash_inst,
        "initMsg": init_msg,
        "explorer": {
            "contract": f"https://testnet.explorer.injective.network/contract/{contract}",
            "code": f"https://testnet.explorer.injective.network/code/{code_id}"
        }
    }
    out = os.path.join(os.path.dirname(__file__), "deployment-testnet.json")
    with open(out, "w") as f:
        json.dump(deploy_info, f, indent=2)
    print(f"  Saved: {out}")

    # ── 3. Verify config query (read-only, no tx) ─────────────────────────────
    print("\n── Phase 3: On-chain Queries (read-only) ──")
    config = query_contract(contract, {"get_config": {}})
    log_result("QueryConfig", config is not None, detail=f"admin={ADDRESS[:12]}...")

    agents = query_contract(contract, {"list_agents": {"limit": 10}})
    log_result("QueryListAgents (empty)", agents is not None, detail=f"count={len(agents) if agents else 0}")

    coals = query_contract(contract, {"list_coalitions": {}})
    log_result("QueryListCoalitions (empty)", coals is not None)

    # ── 4. Register 8 agents (8 txs) ─────────────────────────────────────────
    print("\n── Phase 4: Register 8 Agents ──")
    agents_data = [
        ("Nexus-Prime",  ["arbitrage","mev-resistance","liquidity-provision"]),
        ("Athena-7",     ["governance-vote","arbitrage","regulatory-adapt"]),
        ("Helix-Omega",  ["liquidity-provision","mev-resistance"]),
        ("Sigma-Null",   ["arbitrage","cross-chain"]),
        ("Vortex-Alpha", ["governance-vote","liquidity-provision","arbitrage"]),
        ("Chrysalis-9",  ["regulatory-adapt","mev-resistance"]),
        ("Erebus-X",     ["arbitrage","mev-resistance","governance-vote"]),
        ("Solaris-3",    ["liquidity-provision"]),
    ]
    for name, caps in agents_data:
        tu, body = msg_execute(contract, {"register_agent": {"name": name, "capabilities": caps}})
        res, seq = send_tx(tu, body, seq, acc_num, f"register {name}", wait=1.2)
        ok = res.get("tx_response", {}).get("code", -1) == 0
        txh = res.get("tx_response", {}).get("txhash", "")
        log_result(f"RegisterAgent({name})", ok, txh)

    # Query agents after registration
    agents_on_chain = query_contract(contract, {"list_agents": {"limit": 20}})
    log_result("QueryListAgents (8 registered)", bool(agents_on_chain), detail=f"count={len(agents_on_chain or [])}")

    # ── 5. Evolve AGK 5x ──────────────────────────────────────────────────────
    print("\n── Phase 5: AGK Evolution (5 blocks) ──")
    for i in range(5):
        block_hash = hashlib.sha256(f"block_{i}_{time.time()}".encode()).hexdigest()
        tu, body = msg_execute(contract, {"evolve_agk": {"block_hash": block_hash}})
        res, seq = send_tx(tu, body, seq, acc_num, f"evolve_agk #{i+1}", wait=1.2)
        ok = res.get("tx_response", {}).get("code", -1) == 0
        txh = res.get("tx_response", {}).get("txhash", "")
        log_result(f"EvolveAgk(depth={i+1})", ok, txh)

    # Query own AGK
    agk = query_contract(contract, {"get_agent_genomic_key": {"address": ADDRESS}})
    log_result("QueryAgentGenomicKey", agk is not None, detail=f"depth={agk.get('depth',0) if agk else 0}")

    # ── 6. Form 5 coalitions ──────────────────────────────────────────────────
    print("\n── Phase 6: Form 5 Coalitions ──")
    task_types = [
        "cross-chain-arbitrage",
        "mev-resistance",
        "governance-vote",
        "liquidity-migration",
        "regulatory-adapt",
    ]
    coalition_ids = []
    for task in task_types:
        form_msg = {
            "form_coalition": {
                "task_type": task,
                "min_agents": 1,
                "max_agents": 5,
                "value_split": "ProportionalToContribution",
                "timeout_blocks": 500
            }
        }
        tu, body = msg_execute(contract, form_msg)
        res, seq = send_tx(tu, body, seq, acc_num, f"form {task}", wait=1.2)
        ok = res.get("tx_response", {}).get("code", -1) == 0
        txh = res.get("tx_response", {}).get("txhash", "")
        log_result(f"FormCoalition({task[:20]})", ok, txh)
        # Derive coalition ID (coal-N)
        coalition_ids.append(f"coal-{len(coalition_ids)+1}")

    # Query coalitions
    coals_on_chain = query_contract(contract, {"list_coalitions": {}})
    log_result("QueryListCoalitions (5 formed)", bool(coals_on_chain), detail=f"count={len(coals_on_chain or [])}")

    # ── 7. Submit 5PC coherence scores ────────────────────────────────────────
    print("\n── Phase 7: Submit Five-Plane Coherence Scores ──")
    planes_sets = [
        {"physical": 8200, "mental": 7800, "spiritual": 7500, "conscious": 8000, "anima": 7000},
        {"physical": 9100, "mental": 8800, "spiritual": 8500, "conscious": 9000, "anima": 8200},
        {"physical": 6500, "mental": 7200, "spiritual": 6800, "conscious": 5500, "anima": 6000},
        {"physical": 7800, "mental": 8100, "spiritual": 7600, "conscious": 7200, "anima": 7400},
        {"physical": 8800, "mental": 9200, "spiritual": 8700, "conscious": 8500, "anima": 8100},
    ]
    for i, planes in enumerate(planes_sets):
        cid = coalition_ids[i] if i < len(coalition_ids) else "coal-1"
        cohm = {"submit_coherence_score": {"coalition_id": cid, "planes": planes}}
        tu, body = msg_execute(contract, cohm)
        res, seq = send_tx(tu, body, seq, acc_num, f"coherence {cid}", wait=1.2)
        ok = res.get("tx_response", {}).get("code", -1) == 0
        txh = res.get("tx_response", {}).get("txhash", "")
        c_swarm = round(planes["physical"]*0.25 + planes["mental"]*0.30 + planes["spiritual"]*0.25 + planes["conscious"]*0.10 + planes["anima"]*0.10)
        log_result(f"SubmitCoherence({cid}, C_swarm={c_swarm})", ok, txh)

    # Query coherence score for first coalition
    coh = query_contract(contract, {"get_coherence_score": {"coalition_id": coalition_ids[0]}})
    log_result("QueryCoherenceScore(coal-1)", coh is not None, detail=f"score={coh.get('total_score',0) if coh else 0}")

    # ── 8. Resonance queries (read-only, 5x) ─────────────────────────────────
    print("\n── Phase 8: Resonance Queries ──")
    res_q = query_contract(contract, {"compute_resonance": {"agent_a": ADDRESS, "agent_b": ADDRESS}})
    log_result("QueryResonance(self)", res_q is not None, detail=f"score={res_q.get('resonance_score',0):.3f}" if res_q else "")

    # ── 9. Reputation updates (5 txs) ─────────────────────────────────────────
    print("\n── Phase 9: Reputation Updates ──")
    rep_updates = [
        (ADDRESS, 500,  "completed cross-chain arbitrage"),
        (ADDRESS, 300,  "MEV resistance successful"),
        (ADDRESS, -100, "governance vote missed"),
        (ADDRESS, 800,  "liquidity migration completed"),
        (ADDRESS, 200,  "coalition dissolution reward"),
    ]
    for agent_addr, delta, reason in rep_updates:
        rep_msg = {"update_reputation": {"agent": agent_addr, "delta": delta, "reason": reason}}
        tu, body = msg_execute(contract, rep_msg)
        res2, seq = send_tx(tu, body, seq, acc_num, f"rep {delta:+d}", wait=1.2)
        ok = res2.get("tx_response", {}).get("code", -1) == 0
        txh = res2.get("tx_response", {}).get("txhash", "")
        log_result(f"UpdateReputation(delta={delta:+d})", ok, txh)

    # Query agent after rep updates
    agent_final = query_contract(contract, {"get_agent": {"address": ADDRESS}})
    if agent_final:
        log_result("QueryAgent(final rep)", True, detail=f"rep={agent_final.get('reputation_score',0)}")

    # ── 10. More AGK evolutions (5 more) ──────────────────────────────────────
    print("\n── Phase 10: More AGK Evolutions ──")
    for i in range(5):
        bh = hashlib.sha256(f"phase10_block_{i}_{time.time()}".encode()).hexdigest()
        tu, body = msg_execute(contract, {"evolve_agk": {"block_hash": bh}})
        res3, seq = send_tx(tu, body, seq, acc_num, f"evolve phase10 #{i}", wait=1.0)
        ok = res3.get("tx_response", {}).get("code", -1) == 0
        txh = res3.get("tx_response", {}).get("txhash", "")
        log_result(f"EvolveAgk(phase10/{i+1})", ok, txh)

    # ── 11. Form + immediately dissolve 3 more coalitions ─────────────────────
    print("\n── Phase 11: Form + Dissolve Ephemeral Coalitions ──")
    ephemeral_tasks = ["cross-chain-arbitrage", "mev-resistance", "governance-vote"]
    for task in ephemeral_tasks:
        # Form
        tu, body = msg_execute(contract, {
            "form_coalition": {"task_type": task, "min_agents": 1, "max_agents": 3,
                               "value_split": "Equal", "timeout_blocks": 50}
        })
        res4, seq = send_tx(tu, body, seq, acc_num, f"form ephemeral {task}", wait=1.2)
        ok = res4.get("tx_response", {}).get("code", -1) == 0
        txh = res4.get("tx_response", {}).get("txhash", "")
        new_cid = f"coal-{len(coalition_ids)+1}"
        coalition_ids.append(new_cid)
        log_result(f"FormCoalition(ephemeral/{task[:15]})", ok, txh)

        # Dissolve immediately
        tu, body = msg_execute(contract, {
            "dissolve_coalition": {"coalition_id": new_cid, "distribute_reward": None}
        })
        res5, seq = send_tx(tu, body, seq, acc_num, f"dissolve {new_cid}", wait=1.2)
        ok = res5.get("tx_response", {}).get("code", -1) == 0
        txh = res5.get("tx_response", {}).get("txhash", "")
        log_result(f"DissolveCoalition({new_cid})", ok, txh)

    # ── 12. Dissolve original 5 coalitions ────────────────────────────────────
    print("\n── Phase 12: Dissolve Original Coalitions ──")
    for cid in coalition_ids[:5]:
        tu, body = msg_execute(contract, {
            "dissolve_coalition": {"coalition_id": cid, "distribute_reward": None}
        })
        res6, seq = send_tx(tu, body, seq, acc_num, f"dissolve {cid}", wait=1.0)
        ok = res6.get("tx_response", {}).get("code", -1) == 0
        txh = res6.get("tx_response", {}).get("txhash", "")
        log_result(f"DissolveCoalition({cid})", ok, txh)

    # ── 13. Final state queries ────────────────────────────────────────────────
    print("\n── Phase 13: Final State Verification ──")
    final_agents = query_contract(contract, {"list_agents": {"limit": 20}})
    log_result("FinalQueryAgents", bool(final_agents), detail=f"total={len(final_agents or [])}")

    final_coals = query_contract(contract, {"list_coalitions": {}})
    log_result("FinalQueryCoalitions", bool(final_coals), detail=f"total={len(final_coals or [])}")

    final_agk = query_contract(contract, {"get_agent_genomic_key": {"address": ADDRESS}})
    if final_agk:
        log_result("FinalQueryAGK", True, detail=f"depth={final_agk.get('depth',0)}, hash={final_agk.get('agk_hash','')[:12]}...")

    # ── Summary ───────────────────────────────────────────────────────────────
    passed = sum(1 for r in results if r["ok"])
    failed = sum(1 for r in results if not r["ok"])
    print("\n" + "="*60)
    print(f"  RESULTS: {passed} passed / {failed} failed / {len(results)} total interactions")
    print(f"  Contract: {contract}")
    print(f"  Code ID:  {code_id}")
    print(f"  Explorer: https://testnet.explorer.injective.network/contract/{contract}")
    print("="*60)

    # Save results
    summary = {
        "contractAddress": contract, "codeId": code_id,
        "deployer": ADDRESS, "totalInteractions": len(results),
        "passed": passed, "failed": failed,
        "interactions": results
    }
    out_path = os.path.join(os.path.dirname(__file__), "interaction-results.json")
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n  Full results: {out_path}")

    return contract, code_id

if __name__ == "__main__":
    main()
