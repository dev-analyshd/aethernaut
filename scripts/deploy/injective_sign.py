"""
Injective testnet signing + broadcasting via REST API.
Uses only: ecdsa, hashlib, requests, bech32 (all pip-installable, no protobufjs).
Protobuf encoding is done manually for the specific message types needed.
"""

import hashlib
import hmac
import struct
import json
import base64
import time
import requests
from ecdsa import SigningKey, SECP256k1
from ecdsa.util import sigencode_string
import bech32

# ─── Config ─────────────────────────────────────────────────────────────────

PRIVATE_KEY_HEX = "93fd4461112f6e7a0cb14f6a71d8953f1351d76c71ee4026710ecb5399469a9d"
CHAIN_ID        = "injective-888"
REST_URL        = "https://testnet.sentry.lcd.injective.network"
GAS_LIMIT       = 4_000_000
GAS_PRICE       = "500000000"   # 0.5 INJ (in atto-INJ)
DENOM           = "inj"

# ─── Key derivation ──────────────────────────────────────────────────────────

def private_key_to_address(priv_hex: str) -> tuple[str, bytes, bytes]:
    """Returns (inj_address, compressed_pub_bytes, signing_key)"""
    sk = SigningKey.from_string(bytes.fromhex(priv_hex), curve=SECP256k1)
    vk = sk.get_verifying_key()
    # Compressed pubkey
    prefix = b'\x02' if vk.pubkey.point.y() % 2 == 0 else b'\x03'
    pub_compressed = prefix + vk.pubkey.point.x().to_bytes(32, 'big')
    # Address = RIPEMD160(SHA256(compressed_pubkey))
    sha = hashlib.sha256(pub_compressed).digest()
    h = hashlib.new('ripemd160', sha).digest()
    # Bech32 encode
    addr = bech32.bech32_encode("inj", bech32.convertbits(h, 8, 5))
    return addr, pub_compressed, sk

ADDRESS, PUB_COMPRESSED, SIGNING_KEY = private_key_to_address(PRIVATE_KEY_HEX)
print(f"[AETHERNAUT] Deployer address: {ADDRESS}")

# ─── Protobuf minimal encoder ─────────────────────────────────────────────────

def pb_varint(n: int) -> bytes:
    out = b""
    while n > 0x7F:
        out += bytes([(n & 0x7F) | 0x80])
        n >>= 7
    out += bytes([n & 0x7F])
    return out

def pb_field(field_num: int, wire_type: int) -> bytes:
    return pb_varint((field_num << 3) | wire_type)

def pb_bytes(field_num: int, data: bytes) -> bytes:
    return pb_field(field_num, 2) + pb_varint(len(data)) + data

def pb_string(field_num: int, s: str) -> bytes:
    return pb_bytes(field_num, s.encode())

def pb_varint_field(field_num: int, n: int) -> bytes:
    return pb_field(field_num, 0) + pb_varint(n)

# ─── REST helpers ────────────────────────────────────────────────────────────

def get_account_info():
    url = f"{REST_URL}/cosmos/auth/v1beta1/accounts/{ADDRESS}"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    d = r.json()["account"]
    # Handle both base and eth account types
    acct = d.get("base_account") or d.get("base_vesting_account", {}).get("base_account") or d
    return int(acct.get("account_number", 0)), int(acct.get("sequence", 0))

def get_balance():
    url = f"{REST_URL}/cosmos/bank/v1beta1/balances/{ADDRESS}/{DENOM}"
    r = requests.get(url, timeout=10)
    if r.status_code == 200:
        amt = r.json().get("balance", {}).get("amount", "0")
        return int(amt)
    return 0

def broadcast_tx(tx_bytes: bytes) -> dict:
    payload = {
        "tx_bytes": base64.b64encode(tx_bytes).decode(),
        "mode": "BROADCAST_MODE_SYNC"
    }
    url = f"{REST_URL}/cosmos/tx/v1beta1/txs"
    r = requests.post(url, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()

# ─── Transaction builder ────────────────────────────────────────────────────

def build_and_sign_tx(msg_type_url: str, msg_body_bytes: bytes,
                      account_number: int, sequence: int,
                      memo: str = "") -> bytes:
    """Build and sign a Cosmos SDK transaction (protobuf encoding)."""

    # Any message wrapper
    # Any = { type_url (field 1), value (field 2) }
    any_msg = pb_string(1, msg_type_url) + pb_bytes(2, msg_body_bytes)

    # TxBody = { messages (field 1), memo (field 2) }
    tx_body = pb_bytes(1, any_msg) + pb_string(2, memo)

    # Fee: Coin { denom, amount }
    fee_amount = str(GAS_LIMIT)  # 1:1 with gas at 500000000 atto-INJ
    coin = pb_string(1, DENOM) + pb_string(2, fee_amount)
    # Fee { amount (field 1), gas_limit (field 2) }
    fee = pb_bytes(1, coin) + pb_varint_field(2, GAS_LIMIT)

    # SignerInfo: PublicKey + ModeInfo
    # PubKey Any wrapper (secp256k1)
    pubkey_proto = pb_bytes(1, PUB_COMPRESSED)  # key field=1
    pubkey_any = (pb_string(1, "/cosmos.crypto.secp256k1.PubKey")
                  + pb_bytes(2, pubkey_proto))

    # ModeInfo: single direct
    single = pb_varint_field(1, 1)  # mode = SIGN_MODE_DIRECT (1)
    mode_info = pb_bytes(1, single)

    signer_info = pb_bytes(1, pubkey_any) + pb_bytes(2, mode_info) + pb_varint_field(3, sequence)

    # AuthInfo = { signer_infos (field 1), fee (field 2) }
    auth_info = pb_bytes(1, signer_info) + pb_bytes(2, fee)

    # SignDoc = { body_bytes, auth_info_bytes, chain_id, account_number }
    sign_doc = (pb_bytes(1, tx_body)
                + pb_bytes(2, auth_info)
                + pb_string(3, CHAIN_ID)
                + pb_varint_field(4, account_number))

    # Sign
    digest = hashlib.sha256(sign_doc).digest()
    sig_bytes = SIGNING_KEY.sign_digest_deterministic(
        digest, hashfunc=hashlib.sha256, sigencode=sigencode_string)

    # TxRaw = { body_bytes (1), auth_info_bytes (2), signatures (3) }
    tx_raw = (pb_bytes(1, tx_body)
              + pb_bytes(2, auth_info)
              + pb_bytes(3, sig_bytes))

    return tx_raw

# ─── Specific message encoders ────────────────────────────────────────────────

def msg_store_code(wasm_bytes: bytes) -> tuple[str, bytes]:
    """MsgStoreCode for uploading contract bytecode."""
    body = pb_string(1, ADDRESS) + pb_bytes(2, wasm_bytes)
    return "/cosmwasm.wasm.v1.MsgStoreCode", body

def msg_instantiate(code_id: int, label: str, init_msg: dict,
                    admin: str = "") -> tuple[str, bytes]:
    """MsgInstantiateContract."""
    msg_bytes = json.dumps(init_msg, separators=(',', ':')).encode()
    body = (pb_string(1, ADDRESS)
            + pb_string(2, admin or ADDRESS)
            + pb_varint_field(3, code_id)
            + pb_string(4, label)
            + pb_bytes(5, msg_bytes))
    return "/cosmwasm.wasm.v1.MsgInstantiateContract", body

def msg_execute(contract: str, exec_msg: dict) -> tuple[str, bytes]:
    """MsgExecuteContract."""
    msg_bytes = json.dumps(exec_msg, separators=(',', ':')).encode()
    body = (pb_string(1, ADDRESS)
            + pb_string(2, contract)
            + pb_bytes(3, msg_bytes))
    return "/cosmwasm.wasm.v1.MsgExecuteContract", body

# ─── Tx helpers ──────────────────────────────────────────────────────────────

def send_tx(type_url: str, msg_body: bytes, seq: int, acc: int,
            memo: str = "", wait: float = 1.5) -> tuple[dict, int]:
    tx = build_and_sign_tx(type_url, msg_body, acc, seq, memo)
    result = broadcast_tx(tx)
    time.sleep(wait)
    return result, seq + 1

def check_tx(result: dict, label: str):
    code = result.get("tx_response", {}).get("code", -1)
    txhash = result.get("tx_response", {}).get("txhash", "?")
    if code == 0:
        print(f"  ✓ {label} — tx: {txhash[:16]}...")
    else:
        raw = result.get("tx_response", {}).get("raw_log", "")
        print(f"  ✗ {label} — code={code} {raw[:120]}")
    return code == 0
