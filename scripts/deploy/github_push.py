"""
Push AETHERNAUT codebase to GitHub via REST API.
Uses only: requests, base64 (no git needed).
"""

import os, json, base64, time, sys
import requests

TOKEN = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN") or os.environ.get("GITHUB_TOKEN")
OWNER = "dev-analyshd"
REPO  = "aethernaut"
BRANCH = "main"
BASE = f"https://api.github.com/repos/{OWNER}/{REPO}"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

def get_sha(path: str) -> str | None:
    r = requests.get(f"{BASE}/contents/{path}?ref={BRANCH}", headers=headers)
    if r.status_code == 200:
        return r.json().get("sha")
    return None

def push_file(repo_path: str, local_path: str, message: str) -> bool:
    try:
        with open(local_path, "rb") as f:
            content = base64.b64encode(f.read()).decode()
        sha = get_sha(repo_path)
        payload = {"message": message, "content": content, "branch": BRANCH}
        if sha:
            payload["sha"] = sha
        r = requests.put(f"{BASE}/contents/{repo_path}", headers=headers, json=payload)
        if r.status_code in (200, 201):
            print(f"  ✓ {repo_path}")
            return True
        else:
            print(f"  ✗ {repo_path} — {r.status_code}: {r.text[:100]}")
            return False
    except Exception as e:
        print(f"  ✗ {repo_path} — {e}")
        return False

def push_text(repo_path: str, content: str, message: str) -> bool:
    try:
        encoded = base64.b64encode(content.encode()).decode()
        sha = get_sha(repo_path)
        payload = {"message": message, "content": encoded, "branch": BRANCH}
        if sha:
            payload["sha"] = sha
        r = requests.put(f"{BASE}/contents/{repo_path}", headers=headers, json=payload)
        if r.status_code in (200, 201):
            print(f"  ✓ {repo_path}")
            return True
        else:
            print(f"  ✗ {repo_path} — {r.status_code}: {r.text[:100]}")
            return False
    except Exception as e:
        print(f"  ✗ {repo_path} — {e}")
        return False

ROOT = "/home/runner/workspace"

# Files to push: (repo_path, local_path)
FILES = [
    # Root config
    ("package.json",             f"{ROOT}/package.json"),
    ("pnpm-workspace.yaml",      f"{ROOT}/pnpm-workspace.yaml"),
    ("tsconfig.json",            f"{ROOT}/tsconfig.json"),
    ("tsconfig.base.json",       f"{ROOT}/tsconfig.base.json"),
    ("replit.md",                f"{ROOT}/replit.md"),

    # Contract
    ("contracts/aethernaut-mesh/Cargo.toml",     f"{ROOT}/contracts/aethernaut-mesh/Cargo.toml"),
    ("contracts/aethernaut-mesh/Cargo.lock",     f"{ROOT}/contracts/aethernaut-mesh/Cargo.lock"),
    ("contracts/aethernaut-mesh/src/contract.rs",f"{ROOT}/contracts/aethernaut-mesh/src/contract.rs"),
    ("contracts/aethernaut-mesh/src/lib.rs",     f"{ROOT}/contracts/aethernaut-mesh/src/lib.rs"),

    # SDK
    ("sdk/aethernaut-sdk/package.json",    f"{ROOT}/sdk/aethernaut-sdk/package.json"),
    ("sdk/aethernaut-sdk/tsconfig.json",   f"{ROOT}/sdk/aethernaut-sdk/tsconfig.json"),
    ("sdk/aethernaut-sdk/src/index.ts",    f"{ROOT}/sdk/aethernaut-sdk/src/index.ts"),

    # API spec
    ("lib/api-spec/openapi.yaml",          f"{ROOT}/lib/api-spec/openapi.yaml"),
    ("lib/api-spec/package.json",          f"{ROOT}/lib/api-spec/package.json"),

    # DB schema
    ("lib/db/src/schema/agents.ts",        f"{ROOT}/lib/db/src/schema/agents.ts"),
    ("lib/db/src/schema/coalitions.ts",    f"{ROOT}/lib/db/src/schema/coalitions.ts"),
    ("lib/db/src/schema/tasks.ts",         f"{ROOT}/lib/db/src/schema/tasks.ts"),
    ("lib/db/src/schema/behavioral.ts",    f"{ROOT}/lib/db/src/schema/behavioral.ts"),
    ("lib/db/src/index.ts",                f"{ROOT}/lib/db/src/index.ts"),
    ("lib/db/package.json",                f"{ROOT}/lib/db/package.json"),

    # API server
    ("artifacts/api-server/src/index.ts",           f"{ROOT}/artifacts/api-server/src/index.ts"),
    ("artifacts/api-server/src/routes/agents.ts",   f"{ROOT}/artifacts/api-server/src/routes/agents.ts"),
    ("artifacts/api-server/src/routes/coalitions.ts", f"{ROOT}/artifacts/api-server/src/routes/coalitions.ts"),
    ("artifacts/api-server/src/routes/tasks.ts",    f"{ROOT}/artifacts/api-server/src/routes/tasks.ts"),
    ("artifacts/api-server/src/routes/network.ts",  f"{ROOT}/artifacts/api-server/src/routes/network.ts"),
    ("artifacts/api-server/src/routes/behavioral.ts", f"{ROOT}/artifacts/api-server/src/routes/behavioral.ts"),
    ("artifacts/api-server/src/routes/contract.ts", f"{ROOT}/artifacts/api-server/src/routes/contract.ts"),
    ("artifacts/api-server/package.json",           f"{ROOT}/artifacts/api-server/package.json"),

    # Frontend pages
    ("artifacts/aethernaut/src/pages/NetworkOverview.tsx",    f"{ROOT}/artifacts/aethernaut/src/pages/NetworkOverview.tsx"),
    ("artifacts/aethernaut/src/pages/AgentRegistry.tsx",      f"{ROOT}/artifacts/aethernaut/src/pages/AgentRegistry.tsx"),
    ("artifacts/aethernaut/src/pages/CoalitionLifecycle.tsx", f"{ROOT}/artifacts/aethernaut/src/pages/CoalitionLifecycle.tsx"),
    ("artifacts/aethernaut/src/pages/TaskExecution.tsx",      f"{ROOT}/artifacts/aethernaut/src/pages/TaskExecution.tsx"),
    ("artifacts/aethernaut/src/pages/BehavioralLab.tsx",      f"{ROOT}/artifacts/aethernaut/src/pages/BehavioralLab.tsx"),
    ("artifacts/aethernaut/src/pages/AgentDetail.tsx",        f"{ROOT}/artifacts/aethernaut/src/pages/AgentDetail.tsx"),
    ("artifacts/aethernaut/src/pages/CoalitionDetail.tsx",    f"{ROOT}/artifacts/aethernaut/src/pages/CoalitionDetail.tsx"),
    ("artifacts/aethernaut/src/components/layout/AppLayout.tsx", f"{ROOT}/artifacts/aethernaut/src/components/layout/AppLayout.tsx"),
    ("artifacts/aethernaut/src/App.tsx",                      f"{ROOT}/artifacts/aethernaut/src/App.tsx"),
    ("artifacts/aethernaut/src/main.tsx",                     f"{ROOT}/artifacts/aethernaut/src/main.tsx"),
    ("artifacts/aethernaut/src/index.css",                    f"{ROOT}/artifacts/aethernaut/src/index.css"),
    ("artifacts/aethernaut/src/lib/format.ts",                f"{ROOT}/artifacts/aethernaut/src/lib/format.ts"),
    ("artifacts/aethernaut/package.json",                     f"{ROOT}/artifacts/aethernaut/package.json"),
    ("artifacts/aethernaut/index.html",                       f"{ROOT}/artifacts/aethernaut/index.html"),
    ("artifacts/aethernaut/vite.config.ts",                   f"{ROOT}/artifacts/aethernaut/vite.config.ts"),

    # Deploy scripts
    ("scripts/deploy/package.json",              f"{ROOT}/scripts/deploy/package.json"),
    ("scripts/deploy/injective_sign.py",         f"{ROOT}/scripts/deploy/injective_sign.py"),
    ("scripts/deploy/deploy_and_interact.py",    f"{ROOT}/scripts/deploy/deploy_and_interact.py"),
]

def ensure_repo_exists():
    r = requests.get(BASE, headers=headers)
    if r.status_code == 404:
        print(f"Creating repo {OWNER}/{REPO}...")
        create_r = requests.post(
            f"https://api.github.com/user/repos",
            headers=headers,
            json={"name": REPO, "description": "AETHERNAUT — Agentic Mesh Network on Injective", "private": False}
        )
        if create_r.status_code == 201:
            print(f"  ✓ Repo created")
            time.sleep(2)
        else:
            print(f"  ✗ Could not create repo: {create_r.text[:200]}")
            return False
    elif r.status_code == 200:
        print(f"  ✓ Repo exists: {r.json().get('html_url')}")
    return True

def ensure_branch():
    r = requests.get(f"{BASE}/branches/{BRANCH}", headers=headers)
    if r.status_code == 404:
        # Try to create main branch with initial commit
        print(f"Creating {BRANCH} branch...")
        init_r = requests.put(
            f"{BASE}/contents/README.md",
            headers=headers,
            json={
                "message": "Initial commit: AETHERNAUT Hackathon Project",
                "content": base64.b64encode(b"# AETHERNAUT\n\nSelf-organizing agentic mesh network on Injective blockchain.\n").decode()
            }
        )
        if init_r.status_code in (200, 201):
            print(f"  ✓ Branch {BRANCH} created with initial commit")
        else:
            print(f"  ? Branch may already exist: {init_r.status_code}")
    else:
        print(f"  ✓ Branch {BRANCH} exists")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  AETHERNAUT — GitHub Push via REST API")
    print("="*60)

    if not TOKEN:
        print("ERROR: No GitHub token found")
        sys.exit(1)

    print(f"  Repo: https://github.com/{OWNER}/{REPO}")

    ensure_repo_exists()
    ensure_branch()

    print(f"\n  Pushing {len(FILES)} files...")
    ok = fail = 0
    for repo_path, local_path in FILES:
        if os.path.exists(local_path):
            if push_file(repo_path, local_path, f"feat: add {repo_path}"):
                ok += 1
            else:
                fail += 1
            time.sleep(0.3)  # rate limit
        else:
            print(f"  - SKIP {repo_path} (not found locally)")

    print(f"\n  Done: {ok} pushed, {fail} failed")
    print(f"  GitHub: https://github.com/{OWNER}/{REPO}")
