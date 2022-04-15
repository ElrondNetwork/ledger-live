import { Flex, Text, Log } from "@ledgerhq/native-ui";
import React, { useEffect } from "react";
import Animation from "../Animation";
import getDeviceAnimation from "../DeviceAction/getDeviceAnimation";
import manager from "@ledgerhq/live-common/lib/manager";
import { useTranslation } from "react-i18next";
import { Device } from "@ledgerhq/live-common/lib/hw/actions/types";
import {
  DeviceInfo,
  FirmwareUpdateContext,
} from "@ledgerhq/live-common/lib/types/manager";
import { useTheme } from "styled-components/native";
import { track } from "../../analytics";

type Props = {
  device: Device;
  deviceInfo: DeviceInfo;
  latestFirmware?: FirmwareUpdateContext | null;
};

const ConfirmUpdateStep = ({ device, deviceInfo, latestFirmware }: Props) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  useEffect(() => {
    track("FirmwareUpdateConfirmOnDevice");
  }, []);

  return (
    <Flex alignItems="center">
      <Animation
        source={getDeviceAnimation({
          device,
          key: "validate",
          theme: theme as "light" | "dark" | undefined,
        })}
      />
      <Flex border={1} borderColor="neutral.c80" borderRadius={3} px={2} mt={4}>
        <Text variant="subtitle" color="neutral.c80" p={0} m={0}>
          {device.deviceName}
        </Text>
      </Flex>
      <Flex mt={7}>
        <Log>{t("FirmwareUpdate.pleaseConfirmUpdate")}</Log>
      </Flex>
      {latestFirmware?.osu?.hash && (
        <Flex mt={7} alignSelf="stretch" alignItems="center">
          <Text variant="h3">Identifier:</Text>
          <Flex
            border={1}
            py={2}
            px={3}
            borderRadius={5}
            alignItems="center"
            borderColor="neutral.c80"
            mt={4}
          >
            {manager
              .formatHashName(
                latestFirmware.osu.hash,
                device.modelId,
                deviceInfo,
              )
              .map((hash, i) => (
                <Text key={`${i}-${hash}`}>{hash}</Text>
              ))}
          </Flex>
        </Flex>
      )}
      <Flex
        grow={1}
        justifyContent="space-between"
        flexDirection="row"
        alignSelf="stretch"
        mt={10}
      >
        <Text variant="subtitle" color="neutral.c80">
          {t("FirmwareUpdate.currentVersionNumber")}
        </Text>
        <Text variant="subtitle">{deviceInfo.version}</Text>
      </Flex>
      <Flex
        grow={1}
        justifyContent="space-between"
        flexDirection="row"
        alignSelf="stretch"
        mt={5}
        mb={5}
      >
        <Text variant="subtitle" color="neutral.c80">
          {t("FirmwareUpdate.newVersionNumber")}
        </Text>
        <Text variant="subtitle">{latestFirmware?.final?.version}</Text>
      </Flex>
    </Flex>
  );
};

export default ConfirmUpdateStep;
