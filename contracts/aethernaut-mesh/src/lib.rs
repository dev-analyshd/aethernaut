use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo,
    Response, StdResult, Uint128, Addr, Order,
};
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};

// ─── State ────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Agent {
    pub address: Addr,
    pub name: String,
    pub reputation_score: u64,        // 0-10000 (basis points, so 10000 = 100%)
    pub genomic_depth: u64,           // blocks survived
    pub capabilities: Vec<String>,
    pub agk_hash: String,             // current Agent Genomic Key hash
    pub agk_sense: String,            // SHA3-256(block_data || 0x00)
    pub agk_antisense: String,        // SHA3-256(block_data || 0xFF)
    pub coalitions_formed: u64,
    pub tasks_completed: u64,
    pub status: AgentStatus,
    pub registered_at: u64,          // block height
    pub last_active: u64,            // block height
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum AgentStatus {
    Active,
    InCoalition,
    Idle,
    Offline,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Coalition {
    pub id: String,
    pub task_type: String,
    pub status: CoalitionStatus,
    pub members: Vec<Addr>,
    pub min_agents: u64,
    pub max_agents: u64,
    pub formation_trust: u64,         // basis points
    pub coherence_score: Option<u64>, // basis points — 5PC score
    pub total_reward: Option<Uint128>,
    pub value_split: ValueSplit,
    pub timeout_blocks: u64,
    pub formed_at: u64,               // block height
    pub dissolved_at: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum CoalitionStatus {
    Forming,
    Active,
    Executing,
    Dissolved,
    TimedOut,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum ValueSplit {
    Equal,
    ProportionalToContribution,
    ReputationWeighted,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct CoherencePlanes {
    pub physical: u64,   // Physical plane — on-chain tx entropy
    pub mental: u64,     // Mental plane — strategic alignment
    pub spiritual: u64,  // Spiritual plane — long-term mission
    pub conscious: u64,  // Conscious plane — real-time awareness
    pub anima: u64,      // ANIMA — emergent collective consciousness
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    pub admin: Addr,
    pub min_reputation_to_join: u64,
    pub coherence_threshold: u64,     // minimum C_swarm to act (basis pts)
    pub agk_evolution_interval: u64,  // blocks between forced AGK evolutions
    pub losar_decay_factor: u64,      // LOSAR score decay per block (basis pts)
}

const CONFIG: Item<Config> = Item::new("config");
const AGENTS: Map<&Addr, Agent> = Map::new("agents");
const COALITIONS: Map<&str, Coalition> = Map::new("coalitions");
const AGENT_COUNT: Item<u64> = Item::new("agent_count");
const COALITION_COUNT: Item<u64> = Item::new("coalition_count");

// ─── Messages ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub min_reputation_to_join: u64,
    pub coherence_threshold: u64,
    pub agk_evolution_interval: u64,
    pub losar_decay_factor: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    RegisterAgent {
        name: String,
        capabilities: Vec<String>,
    },
    EvolveAgk {
        block_hash: String,
    },
    FormCoalition {
        task_type: String,
        min_agents: u64,
        max_agents: u64,
        value_split: ValueSplit,
        timeout_blocks: u64,
    },
    JoinCoalition {
        coalition_id: String,
    },
    SubmitCoherenceScore {
        coalition_id: String,
        planes: CoherencePlanes,
    },
    DissolveCoalition {
        coalition_id: String,
        distribute_reward: Option<Uint128>,
    },
    UpdateReputation {
        agent: String,
        delta: i64,
        reason: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    GetAgent { address: String },
    GetCoalition { id: String },
    GetAgentGenomicKey { address: String },
    ListAgents { start_after: Option<String>, limit: Option<u32> },
    ListCoalitions { status: Option<String> },
    ComputeResonance { agent_a: String, agent_b: String },
    GetCoherenceScore { coalition_id: String },
    GetConfig {},
}

// ─── Entrypoints ──────────────────────────────────────────────────────────────

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let config = Config {
        admin: info.sender.clone(),
        min_reputation_to_join: msg.min_reputation_to_join,
        coherence_threshold: msg.coherence_threshold,
        agk_evolution_interval: msg.agk_evolution_interval,
        losar_decay_factor: msg.losar_decay_factor,
    };
    CONFIG.save(deps.storage, &config)?;
    AGENT_COUNT.save(deps.storage, &0u64)?;
    COALITION_COUNT.save(deps.storage, &0u64)?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin", info.sender))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    match msg {
        ExecuteMsg::RegisterAgent { name, capabilities } =>
            execute_register_agent(deps, env, info, name, capabilities),
        ExecuteMsg::EvolveAgk { block_hash } =>
            execute_evolve_agk(deps, env, info, block_hash),
        ExecuteMsg::FormCoalition { task_type, min_agents, max_agents, value_split, timeout_blocks } =>
            execute_form_coalition(deps, env, info, task_type, min_agents, max_agents, value_split, timeout_blocks),
        ExecuteMsg::JoinCoalition { coalition_id } =>
            execute_join_coalition(deps, env, info, coalition_id),
        ExecuteMsg::SubmitCoherenceScore { coalition_id, planes } =>
            execute_submit_coherence(deps, env, info, coalition_id, planes),
        ExecuteMsg::DissolveCoalition { coalition_id, distribute_reward } =>
            execute_dissolve_coalition(deps, env, info, coalition_id, distribute_reward),
        ExecuteMsg::UpdateReputation { agent, delta, reason } =>
            execute_update_reputation(deps, env, info, agent, delta, reason),
    }
}

fn compute_agk(address: &str, block_hash: &str, depth: u64) -> (String, String, String) {
    let data = format!("{}:{}:{}", address, block_hash, depth);
    let mut hasher_s = Sha3_256::new();
    hasher_s.update(data.as_bytes());
    hasher_s.update(&[0x00u8]);
    let sense = format!("{:x}", hasher_s.finalize());

    let mut hasher_a = Sha3_256::new();
    hasher_a.update(data.as_bytes());
    hasher_a.update(&[0xFFu8]);
    let antisense = format!("{:x}", hasher_a.finalize());

    let mut hasher_h = Sha3_256::new();
    hasher_h.update(sense.as_bytes());
    hasher_h.update(antisense.as_bytes());
    let hash = format!("{:x}", hasher_h.finalize());

    (hash, sense, antisense)
}

fn execute_register_agent(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    name: String,
    capabilities: Vec<String>,
) -> StdResult<Response> {
    let block_hash = env.block.height.to_string();
    let (agk_hash, agk_sense, agk_antisense) = compute_agk(
        info.sender.as_str(),
        &block_hash,
        0,
    );

    let agent = Agent {
        address: info.sender.clone(),
        name: name.clone(),
        reputation_score: 5000, // start at 50%
        genomic_depth: 0,
        capabilities,
        agk_hash,
        agk_sense,
        agk_antisense,
        coalitions_formed: 0,
        tasks_completed: 0,
        status: AgentStatus::Active,
        registered_at: env.block.height,
        last_active: env.block.height,
    };

    AGENTS.save(deps.storage, &info.sender, &agent)?;
    let count = AGENT_COUNT.load(deps.storage).unwrap_or(0) + 1;
    AGENT_COUNT.save(deps.storage, &count)?;

    Ok(Response::new()
        .add_attribute("action", "register_agent")
        .add_attribute("agent", info.sender)
        .add_attribute("name", name)
        .add_attribute("agk_hash", agent.agk_hash))
}

fn execute_evolve_agk(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    block_hash: String,
) -> StdResult<Response> {
    let mut agent = AGENTS.load(deps.storage, &info.sender)?;
    let new_depth = agent.genomic_depth + (env.block.height - agent.last_active);
    let (hash, sense, antisense) = compute_agk(info.sender.as_str(), &block_hash, new_depth);

    agent.agk_hash = hash.clone();
    agent.agk_sense = sense;
    agent.agk_antisense = antisense;
    agent.genomic_depth = new_depth;
    agent.last_active = env.block.height;

    AGENTS.save(deps.storage, &info.sender, &agent)?;

    Ok(Response::new()
        .add_attribute("action", "evolve_agk")
        .add_attribute("agent", info.sender)
        .add_attribute("new_depth", new_depth.to_string())
        .add_attribute("new_hash", hash))
}

fn execute_form_coalition(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    task_type: String,
    min_agents: u64,
    max_agents: u64,
    value_split: ValueSplit,
    timeout_blocks: u64,
) -> StdResult<Response> {
    let agent = AGENTS.load(deps.storage, &info.sender)?;
    let config = CONFIG.load(deps.storage)?;

    if agent.reputation_score < config.min_reputation_to_join {
        return Err(cosmwasm_std::StdError::generic_err("Reputation too low to form coalition"));
    }

    let count = COALITION_COUNT.load(deps.storage).unwrap_or(0);
    let coalition_id = format!("coal-{}", count + 1);

    let coalition = Coalition {
        id: coalition_id.clone(),
        task_type: task_type.clone(),
        status: CoalitionStatus::Forming,
        members: vec![info.sender.clone()],
        min_agents,
        max_agents,
        formation_trust: agent.reputation_score,
        coherence_score: None,
        total_reward: None,
        value_split,
        timeout_blocks,
        formed_at: env.block.height,
        dissolved_at: None,
    };

    COALITIONS.save(deps.storage, &coalition_id, &coalition)?;
    COALITION_COUNT.save(deps.storage, &(count + 1))?;

    Ok(Response::new()
        .add_attribute("action", "form_coalition")
        .add_attribute("coalition_id", coalition_id)
        .add_attribute("task_type", task_type)
        .add_attribute("seed_agent", info.sender))
}

fn execute_join_coalition(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    coalition_id: String,
) -> StdResult<Response> {
    let mut coalition = COALITIONS.load(deps.storage, &coalition_id)?;
    let mut agent = AGENTS.load(deps.storage, &info.sender)?;

    if coalition.members.contains(&info.sender) {
        return Err(cosmwasm_std::StdError::generic_err("Already a member"));
    }
    if coalition.members.len() >= coalition.max_agents as usize {
        return Err(cosmwasm_std::StdError::generic_err("Coalition full"));
    }

    coalition.members.push(info.sender.clone());
    if coalition.members.len() >= coalition.min_agents as usize {
        coalition.status = CoalitionStatus::Active;
    }

    agent.status = AgentStatus::InCoalition;
    agent.last_active = env.block.height;

    COALITIONS.save(deps.storage, &coalition_id, &coalition)?;
    AGENTS.save(deps.storage, &info.sender, &agent)?;

    Ok(Response::new()
        .add_attribute("action", "join_coalition")
        .add_attribute("coalition_id", coalition_id)
        .add_attribute("agent", info.sender))
}

fn execute_submit_coherence(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    coalition_id: String,
    planes: CoherencePlanes,
) -> StdResult<Response> {
    let mut coalition = COALITIONS.load(deps.storage, &coalition_id)?;
    let config = CONFIG.load(deps.storage)?;

    // 5PC formula: C_swarm = Σ(w_i · P_i) with weights [0.25,0.30,0.25,0.10,0.10]
    let c_swarm = (planes.physical * 25
        + planes.mental * 30
        + planes.spiritual * 25
        + planes.conscious * 10
        + planes.anima * 10) / 100;

    coalition.coherence_score = Some(c_swarm);

    if c_swarm >= config.coherence_threshold {
        coalition.status = CoalitionStatus::Executing;
    }
    // else: coalition emits SILENCE — no state change, awaiting higher coherence

    COALITIONS.save(deps.storage, &coalition_id, &coalition)?;

    Ok(Response::new()
        .add_attribute("action", "submit_coherence")
        .add_attribute("coalition_id", coalition_id)
        .add_attribute("c_swarm", c_swarm.to_string())
        .add_attribute("actionable", (c_swarm >= config.coherence_threshold).to_string()))
}

fn execute_dissolve_coalition(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    coalition_id: String,
    distribute_reward: Option<Uint128>,
) -> StdResult<Response> {
    let mut coalition = COALITIONS.load(deps.storage, &coalition_id)?;

    if !coalition.members.contains(&info.sender) {
        let config = CONFIG.load(deps.storage)?;
        if info.sender != config.admin {
            return Err(cosmwasm_std::StdError::generic_err("Not authorized"));
        }
    }

    coalition.status = CoalitionStatus::Dissolved;
    coalition.dissolved_at = Some(env.block.height);
    coalition.total_reward = distribute_reward;

    for member_addr in &coalition.members {
        if let Ok(mut agent) = AGENTS.load(deps.storage, member_addr) {
            agent.status = AgentStatus::Idle;
            agent.coalitions_formed += 1;
            let _ = AGENTS.save(deps.storage, member_addr, &agent);
        }
    }

    COALITIONS.save(deps.storage, &coalition_id, &coalition)?;

    Ok(Response::new()
        .add_attribute("action", "dissolve_coalition")
        .add_attribute("coalition_id", coalition_id)
        .add_attribute("dissolved_by", info.sender)
        .add_attribute("block", env.block.height.to_string()))
}

fn execute_update_reputation(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    agent_addr: String,
    delta: i64,
    reason: String,
) -> StdResult<Response> {
    let config = CONFIG.load(deps.storage)?;
    if info.sender != config.admin {
        return Err(cosmwasm_std::StdError::generic_err("Only admin can update reputation"));
    }

    let addr = deps.api.addr_validate(&agent_addr)?;
    let mut agent = AGENTS.load(deps.storage, &addr)?;

    let new_score = (agent.reputation_score as i64 + delta).clamp(0, 10000) as u64;
    agent.reputation_score = new_score;
    agent.last_active = env.block.height;

    AGENTS.save(deps.storage, &addr, &agent)?;

    Ok(Response::new()
        .add_attribute("action", "update_reputation")
        .add_attribute("agent", agent_addr)
        .add_attribute("new_score", new_score.to_string())
        .add_attribute("reason", reason))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetAgent { address } => {
            let addr = deps.api.addr_validate(&address)?;
            to_json_binary(&AGENTS.load(deps.storage, &addr)?)
        },
        QueryMsg::GetCoalition { id } => {
            to_json_binary(&COALITIONS.load(deps.storage, &id)?)
        },
        QueryMsg::GetAgentGenomicKey { address } => {
            let addr = deps.api.addr_validate(&address)?;
            let agent = AGENTS.load(deps.storage, &addr)?;
            to_json_binary(&serde_json::json!({
                "agent": address,
                "agk_hash": agent.agk_hash,
                "agk_sense": agent.agk_sense,
                "agk_antisense": agent.agk_antisense,
                "depth": agent.genomic_depth,
            }))
        },
        QueryMsg::ListAgents { start_after: _, limit } => {
            let lim = limit.unwrap_or(20).min(100) as usize;
            let agents: Vec<Agent> = AGENTS
                .range(deps.storage, None, None, Order::Ascending)
                .take(lim)
                .filter_map(|r| r.ok())
                .map(|(_, a)| a)
                .collect();
            to_json_binary(&agents)
        },
        QueryMsg::ListCoalitions { status: _ } => {
            let coalitions: Vec<Coalition> = COALITIONS
                .range(deps.storage, None, None, Order::Ascending)
                .filter_map(|r| r.ok())
                .map(|(_, c)| c)
                .collect();
            to_json_binary(&coalitions)
        },
        QueryMsg::ComputeResonance { agent_a, agent_b } => {
            let addr_a = deps.api.addr_validate(&agent_a)?;
            let addr_b = deps.api.addr_validate(&agent_b)?;
            let a = AGENTS.load(deps.storage, &addr_a)?;
            let b = AGENTS.load(deps.storage, &addr_b)?;

            // Cosine similarity in behavioral space
            let score_a = a.reputation_score as f64 / 10000.0;
            let score_b = b.reputation_score as f64 / 10000.0;
            let resonance = 1.0 - (score_a - score_b).abs();
            let can_communicate = resonance > 0.5;

            to_json_binary(&serde_json::json!({
                "agent_a": agent_a,
                "agent_b": agent_b,
                "resonance_score": resonance,
                "can_communicate": can_communicate,
                "shared_frequencies": if can_communicate { 3 } else { 0 },
            }))
        },
        QueryMsg::GetCoherenceScore { coalition_id } => {
            let coalition = COALITIONS.load(deps.storage, &coalition_id)?;
            let config = CONFIG.load(deps.storage)?;
            to_json_binary(&serde_json::json!({
                "coalition_id": coalition_id,
                "total_score": coalition.coherence_score.unwrap_or(0),
                "threshold": config.coherence_threshold,
                "is_actionable": coalition.coherence_score.map(|s| s >= config.coherence_threshold).unwrap_or(false),
            }))
        },
        QueryMsg::GetConfig {} => {
            to_json_binary(&CONFIG.load(deps.storage)?)
        },
    }
}
