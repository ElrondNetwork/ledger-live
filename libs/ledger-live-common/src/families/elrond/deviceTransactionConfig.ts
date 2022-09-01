import type { DeviceTransactionField } from "../../transaction";
import type { TransactionStatus, Transaction } from "./types";

function getDeviceTransactionConfig({
  transaction: { recipient },
  status: { estimatedFees },
}: {
  transaction: Transaction;
  status: TransactionStatus;
}): Array<DeviceTransactionField> {
  const fields: Array<DeviceTransactionField> = [];

  fields.push({
    type: "address",
    label: "Receiver",
    address: recipient,
  });

  fields.push({
    type: "amount",
    label: "Amount",
  });

  if (!estimatedFees.isZero()) {
    fields.push({
      type: "fees",
      label: "Fee",
    });
  }

  return fields;
}

export default getDeviceTransactionConfig;
