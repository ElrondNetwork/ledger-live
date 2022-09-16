import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import { TokenCurrency } from "@ledgerhq/types-cryptoassets";
import { Account, SyncConfig, TokenAccount } from "@ledgerhq/types-live";
import BigNumber from "bignumber.js";
import { emptyHistoryCache } from "../../account";
import { mergeOps } from "../../bridge/jsHelpers";
import { getAccountESDTOperations, getAccountESDTTokens } from "./api";
import { ESDTToken } from "./types";

async function buildElrondESDTTokenAccount({
  parentAccountId,
  accountAddress,
  token,
  balance,
}: {
  parentAccountId: string;
  accountAddress: string;
  token: TokenCurrency;
  balance: BigNumber;
}) {
  const extractedId = token.id;
  const id = parentAccountId + "+" + extractedId;
  const tokenIdentifier = token.id.split("/")[2];

  const operations = await getAccountESDTOperations(
    parentAccountId,
    accountAddress,
    tokenIdentifier,
    0
  );

  const tokenAccount: TokenAccount = {
    type: "TokenAccount",
    id,
    parentId: parentAccountId,
    starred: false,
    token,
    operationsCount: operations.length,
    operations,
    pendingOperations: [],
    balance,
    spendableBalance: balance,
    swapHistory: [],
    creationDate:
      operations.length > 0
        ? operations[operations.length - 1].date
        : new Date(),
    balanceHistoryCache: emptyHistoryCache, // calculated in the jsHelpers
  };
  return tokenAccount;
}

async function syncESDTTokenAccountOperations(
  tokenAccount: TokenAccount,
  address: string
): Promise<TokenAccount> {
  const oldOperations = tokenAccount?.operations || [];
  // Needed for incremental synchronisation
  const startAt = oldOperations.length
    ? Math.floor(oldOperations[0].date.valueOf() / 1000)
    : 0;

  const extractedId = tokenAccount.token.id;
  const tokenIdentifier = extractedId.split("/")[2];

  // Merge new operations with the previously synced ones
  const newOperations = await getAccountESDTOperations(
    tokenAccount.parentId,
    address,
    tokenIdentifier,
    startAt
  );
  const operations = mergeOps(oldOperations, newOperations);

  tokenAccount.operations = operations;
  tokenAccount.operationsCount = operations.length;

  return tokenAccount;
}

function convertESDTToToken(esdt: ESDTToken): TokenCurrency {
  const ELROND_ESDT_CONTRACT =
    "erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u";

  return {
    type: "TokenCurrency",
    id: `elrond/esdt/${esdt.identifier}`,
    contractAddress: ELROND_ESDT_CONTRACT,
    ledgerSignature: esdt.ledgerSignature,
    parentCurrency: getCryptoCurrencyById("elrond"),
    tokenType: "esdt",
    name: esdt.name,
    ticker: esdt.ticker,
    units: [
      {
        name: esdt.name,
        code: esdt.ticker,
        magnitude: esdt.decimals,
      },
    ],
  };
}

async function elrondBuildESDTTokenAccounts({
  accountId,
  accountAddress,
  existingAccount,
  syncConfig,
}: {
  accountId: string;
  accountAddress: string;
  existingAccount: Account | null | undefined;
  syncConfig: SyncConfig;
}): Promise<TokenAccount[] | undefined> {
  const { blacklistedTokenIds = [] } = syncConfig;

  const tokenAccounts: TokenAccount[] = [];

  const existingAccountByTicker: { [key: string]: TokenAccount } = {}; // used for fast lookup

  const existingAccountTickers: string[] = []; // used to keep track of ordering

  if (existingAccount && existingAccount.subAccounts) {
    for (const existingSubAccount of existingAccount.subAccounts) {
      if (existingSubAccount.type === "TokenAccount") {
        const { ticker, id } = existingSubAccount.token;

        if (!blacklistedTokenIds.includes(id)) {
          existingAccountTickers.push(ticker);
          existingAccountByTicker[ticker] = existingSubAccount;
        }
      }
    }
  }

  const accountESDTs = await getAccountESDTTokens(accountAddress);
  for (const esdt of accountESDTs) {
    const token: TokenCurrency = convertESDTToToken(esdt);

    if (token && !blacklistedTokenIds.includes(token.id)) {
      let tokenAccount = existingAccountByTicker[token.ticker];
      if (!tokenAccount) {
        tokenAccount = await buildElrondESDTTokenAccount({
          parentAccountId: accountId,
          accountAddress,
          token,
          balance: new BigNumber(esdt.balance),
        });
      } else {
        tokenAccount = await syncESDTTokenAccountOperations(
          tokenAccount,
          accountAddress
        );
      }

      if (tokenAccount) {
        tokenAccounts.push(tokenAccount);
        existingAccountTickers.push(token.ticker);
        existingAccountByTicker[token.ticker] = tokenAccount;
      }
    }
  }

  // Preserve order of tokenAccounts from the existing token accounts
  tokenAccounts.sort((a, b) => {
    const i = existingAccountTickers.indexOf(a.token.ticker);
    const j = existingAccountTickers.indexOf(b.token.ticker);
    if (i === j) return 0;
    if (i < 0) return 1;
    if (j < 0) return -1;
    return i - j;
  });

  return tokenAccounts;
}

export default elrondBuildESDTTokenAccounts;
