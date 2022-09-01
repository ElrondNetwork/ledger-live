import type { DeviceTransactionField } from "../../transaction";
import type { TransactionStatus, Transaction } from "./types";

function getDeviceTransactionConfig({
  transaction: { mode, recipient },
  status: { estimatedFees },
}: {
  transaction: Transaction;
  status: TransactionStatus;
}): Array<DeviceTransactionField> {
  const fields: Array<DeviceTransactionField> = [];
  const isDelegationOperation = mode !== "send";

  fields.push({
    type: "amount",
    label: "Amount",
  });

  if (!estimatedFees.isZero()) {
    fields.push({
      type: "fees",
      label: "Fees",
    });
  }

  if (isDelegationOperation) {
    fields.push({
      type: "address",
      label: "Receiver",
      address: recipient,
    });
  }
  return fields;
}

export default getDeviceTransactionConfig;
