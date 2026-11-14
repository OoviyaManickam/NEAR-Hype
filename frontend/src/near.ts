import { setupWalletSelector } from "@near-wallet-selector/core";
import type { WalletSelector, AccountState } from "@near-wallet-selector/core";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { providers, utils } from "near-api-js";
import { actionCreators } from "@near-js/transactions";

export const CONTRACT_ID = "hype-token-test.testnet";
const NETWORK_ID = "testnet";

let _selector: WalletSelector | null = null;
let _modal: WalletSelectorModal | null = null;

export async function getSelector(): Promise<WalletSelector> {
  if (_selector) return _selector;
  _selector = await setupWalletSelector({
    network: {
      networkId: NETWORK_ID,
      nodeUrl: "https://rpc.testnet.near.org",
      helperUrl: "https://helper.testnet.near.org",
      explorerUrl: "https://testnet.nearblocks.io",
      indexerUrl: "https://testnet-api.kitwallet.app",
    },
    modules: [setupMeteorWallet()],
  });
  return _selector;
}

export async function getModal(): Promise<WalletSelectorModal> {
  if (_modal) return _modal;
  const selector = await getSelector();
  _modal = setupModal(selector, { contractId: CONTRACT_ID });
  return _modal;
}

export async function signIn() {
  const modal = await getModal();
  modal.show();
}

export async function signOut() {
  const selector = await getSelector();
  const wallet = await selector.wallet();
  await wallet.signOut();
  window.location.reload();
}

export async function getAccountId(): Promise<string | null> {
  const selector = await getSelector();
  const accounts: AccountState[] = selector.store.getState().accounts;
  const active = accounts.find(a => a.active);
  return active?.accountId ?? null;
}

// ─── RPC provider for view calls ─────────────────────────────────────────────
function rpc() {
  return new providers.JsonRpcProvider({ url: "http://localhost:5173/rpc" });
}

async function viewFunction(methodName: string, args: object) {
  const result = await rpc().query({
    request_type: "call_function",
    account_id: CONTRACT_ID,
    method_name: methodName,
    args_base64: btoa(JSON.stringify(args)),
    finality: "optimistic",
  }) as unknown as { result: number[] };
  const bytes = new Uint8Array(result.result);
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function getContractState() {
  return viewFunction("get_state", {});
}

export async function getHistory() {
  return viewFunction("get_history", {});
}

export async function getBalance(accountId: string): Promise<string> {
  return viewFunction("ft_balance_of", { account_id: accountId });
}

export async function getStorageBalance(accountId: string) {
  return viewFunction("storage_balance_of", { account_id: accountId });
}

// ─── Write calls via wallet-selector ─────────────────────────────────────────
const STORAGE_DEPOSIT_YOCTO = "1250000000000000000000"; // 0.00125 NEAR
const GAS = BigInt("30000000000000");

export async function ensureStorageRegistered(accountId: string) {
  const existing = await getStorageBalance(accountId);
  if (existing) return;

  const selector = await getSelector();
  const wallet = await selector.wallet();
  await wallet.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [
      actionCreators.functionCall(
        "storage_deposit",
        { account_id: accountId, registration_only: true },
        GAS,
        BigInt(STORAGE_DEPOSIT_YOCTO)
      ),
    ],
  });
}

export async function buyHype(nearAmount: string): Promise<void> {
  const yocto = BigInt(utils.format.parseNearAmount(nearAmount)!);
  const selector = await getSelector();
  const wallet = await selector.wallet();
  await wallet.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [
      actionCreators.functionCall("buy_hype", {}, GAS, yocto),
    ],
  });
}
