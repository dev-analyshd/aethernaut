/**
 * Contract proxy routes — when CONTRACT_ADDRESS is set in env,
 * these endpoints forward reads to the live CosmWasm contract on Injective.
 * Falls back silently to the DB-backed routes if not configured.
 */
import { Router } from "express";

const router = Router();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const INJECTIVE_NETWORK = process.env.INJECTIVE_NETWORK || "testnet";

const RPC = INJECTIVE_NETWORK === "mainnet"
  ? "https://sentry.tm.injective.network:443"
  : "https://testnet.sentry.tm.injective.network:443";

async function queryContract(msg: unknown): Promise<unknown> {
  const url = `${RPC}/cosmwasm/wasm/v1/contract/${CONTRACT_ADDRESS}/smart/${Buffer.from(JSON.stringify(msg)).toString("base64")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Contract query failed: ${res.status}`);
  const { data } = await res.json() as { data: unknown };
  return data;
}

router.get("/contract/info", async (req, res) => {
  if (!CONTRACT_ADDRESS) {
    res.json({
      configured: false,
      message: "Set CONTRACT_ADDRESS env var to connect to the deployed Injective contract",
    });
    return;
  }

  try {
    const config = await queryContract({ get_config: {} });
    res.json({
      configured: true,
      contractAddress: CONTRACT_ADDRESS,
      network: INJECTIVE_NETWORK,
      rpc: RPC,
      config,
    });
  } catch (err) {
    res.status(502).json({ error: "Contract query failed", detail: (err as Error).message });
  }
});

router.get("/contract/agents", async (req, res) => {
  if (!CONTRACT_ADDRESS) { res.status(404).json({ error: "CONTRACT_ADDRESS not set" }); return; }
  try {
    const agents = await queryContract({ list_agents: { limit: 50 } });
    res.json(agents);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.get("/contract/coalitions", async (req, res) => {
  if (!CONTRACT_ADDRESS) { res.status(404).json({ error: "CONTRACT_ADDRESS not set" }); return; }
  try {
    const coalitions = await queryContract({ list_coalitions: {} });
    res.json(coalitions);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.get("/contract/agent/:address", async (req, res) => {
  if (!CONTRACT_ADDRESS) { res.status(404).json({ error: "CONTRACT_ADDRESS not set" }); return; }
  try {
    const agent = await queryContract({ get_agent: { address: req.params.address } });
    res.json(agent);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.get("/contract/agent/:address/agk", async (req, res) => {
  if (!CONTRACT_ADDRESS) { res.status(404).json({ error: "CONTRACT_ADDRESS not set" }); return; }
  try {
    const agk = await queryContract({ get_agent_genomic_key: { address: req.params.address } });
    res.json(agk);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.post("/contract/resonance", async (req, res) => {
  if (!CONTRACT_ADDRESS) { res.status(404).json({ error: "CONTRACT_ADDRESS not set" }); return; }
  const { agentA, agentB } = req.body;
  try {
    const result = await queryContract({ compute_resonance: { agent_a: agentA, agent_b: agentB } });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

export default router;
