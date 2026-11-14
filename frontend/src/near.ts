import { connect, keyStores, WalletConnection, Contract, utils } from "near-api-js";

export const CONTRACT_ID = "hype-token-test.testnet";
const NETWORK_ID = "testnet";

const config = {
  networkId: NETWORK_ID,
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.meteorwallet.app",
  helperUrl: "https://helper.testnet.near.org",
};

let _near: Awaited<ReturnType<typeof connect>> | null = null;
let _wallet: WalletConnection | null = null;

export async function getNear() {
  if (!_near) _near = await connect(config);
  return _near;
}

export async function getWallet() {
  if (!_wallet) {
    const near = await getNear();
    _wallet = new WalletConnection(near, "hype-app");
  }
  return _wallet;
}

export async function signIn() {
  const wallet = await getWallet();
  wallet.requestSignIn({ contractId: CONTRACT_ID });
}

export async function signOut() {
  const wallet = await getWallet();
  wallet.signOut();
  window.location.reload();
}

export async function isSignedIn(): Promise<boolean> {
  const wallet = await getWallet();
  return wallet.isSignedIn();
}

export async function getAccountId(): Promise<string | null> {
  const wallet = await getWallet();
  return wallet.isSignedIn() ? wallet.getAccountId() : null;
}

// ─── View calls (free, no gas) ────────────────────────────────────────────────

export async function getContractState() {
  const near = await getNear();
  const account = await near.account(CONTRACT_ID);
  return account.viewFunction({ contractId: CONTRACT_ID, methodName: "get_state", args: {} });
}

export async function getHistory() {
  const near = await getNear();
  const account = await near.account(CONTRACT_ID);
  return account.viewFunction({ contractId: CONTRACT_ID, methodName: "get_history", args: {} });
}

export async function getBalance(accountId: string): Promise<string> {
  const near = await getNear();
  const account = await near.account(CONTRACT_ID);
  return account.viewFunction({
    contractId: CONTRACT_ID,
    methodName: "ft_balance_of",
    args: { account_id: accountId },
  });
}

export async function getStorageBalance(accountId: string) {
  const near = await getNear();
  const account = await near.account(CONTRACT_ID);
  return account.viewFunction({
    contractId: CONTRACT_ID,
    methodName: "storage_balance_of",
    args: { account_id: accountId },
  });
}

// ─── Write calls ──────────────────────────────────────────────────────────────

const STORAGE_DEPOSIT = utils.format.parseNearAmount("0.00125")!; // 0.00125 NEAR
const BUY_RATE = 1000n; // 1 NEAR = 1000 HYPE

export async function ensureStorageRegistered(accountId: string) {
  const existing = await getStorageBalance(accountId);
  if (existing) return; // already registered

  const wallet = await getWallet();
  const account = wallet.account();
  await account.functionCall({
    contractId: CONTRACT_ID,
    methodName: "storage_deposit",
    args: { account_id: accountId, registration_only: true },
    attachedDeposit: BigInt(STORAGE_DEPOSIT),
    gas: BigInt("30000000000000"),
  });
}

export async function buyHype(nearAmount: string): Promise<void> {
  const wallet = await getWallet();
  const account = wallet.account();
  const yocto = BigInt(utils.format.parseNearAmount(nearAmount)!);

  // storage_deposit is also the buy — contract grants tokens for NEAR attached
  // We call buy_hype on the contract (Option A fixed rate)
  await account.functionCall({
    contractId: CONTRACT_ID,
    methodName: "buy_hype",
    args: {},
    attachedDeposit: yocto,
    gas: BigInt("30000000000000"),
  });
}
