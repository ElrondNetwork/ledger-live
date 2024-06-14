import Transport, { StatusCodes } from "@ledgerhq/hw-transport";
import { LocalTracer } from "@ledgerhq/logs";
import { APDU } from "src/commands/entities/APDU";

/**
 * Name in documentation: INS_APP_STORAGE_BACKUP
 * cla: 0xe0
 * ins: 0x6b
 * p1: 0x00
 * p2: 0x00
 * lc: 0x00
 */
const BACKUP_APP_STORAGE: APDU = [0xe0, 0x6b, 0x00, 0x00, Buffer.from([0x00])];

/**
 * 0x9000: Success.
 * 0x5123: Invalid context, Get Info must be called.
 * 0x5419: Failed to generate AES key.
 * 0x541A: Internal error, crypto operation failed.
 * 0x541B: Internal error, failed to compute AES CMAC.
 * 0x541C: Failed to encrypt the app storage backup.
 * 0x662F: Invalid device state, recovery mode.
 * 0x6642: Invalid backup state, backup already performed.
 */
const RESPONSE_STATUS_SET: number[] = [
  StatusCodes.OK,
  StatusCodes.APP_NOT_FOUND_OR_INVALID_CONTEXT,
  StatusCodes.FAILED_GEN_AES_KEY,
  StatusCodes.INTERNAL_CRYPTO_OPERATION_FAILED,
  StatusCodes.INTERNAL_COMPUTE_AES_CMAC_FAILED,
  StatusCodes.APP_STORAGE_ENCRYPT_FAILED,
  StatusCodes.CUSTOM_IMAGE_BOOTLOADER,
  StatusCodes.INVALID_BACKUP_STATE,
];

/**
 * Retrieves the app storage information from the device and returns it as a string.
 *
 * @param transport - The transport object used to communicate with the device.
 * @returns A promise that resolves to the app storage information as a string.
 */
export async function bakcupAppStorage(transport: Transport): Promise<string> {
  const tracer = new LocalTracer("hw", {
    transport: transport.getTraceContext(),
    function: "bakcupAppStorage",
  });
  tracer.trace("Start");

  const response = await transport.send(...BACKUP_APP_STORAGE, RESPONSE_STATUS_SET);
  return parseResponse(response);
}

/**
 * Parses the response data buffer and returns it as a string.
 *
 * @param data - The response data buffer.
 * @returns The response data as a string.
 */
function parseResponse(data: Buffer): string {
  return data.toString("utf-8");
}
