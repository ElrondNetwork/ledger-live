import React, { useEffect, useCallback, useState, useReducer } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ScrollView, NativeModules, Linking } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import type { Device } from "@ledgerhq/live-common/lib/hw/actions/types";
import { useTheme } from "styled-components/native";
import { Button, Checkbox, Flex, Text, Link, Icons, Log, NumberedList } from "@ledgerhq/native-ui";
import { BackgroundEvent, nextBackgroundEventSelector } from "../../reducers/appstate";
import { clearBackgroundEvents, dequeueBackgroundEvent } from "../../actions/appstate";
import FirmwareProgress from "../FirmwareProgress";
import BottomModal from "../BottomModal";
import GenericErrorView from "../GenericErrorView";
import Animation from "../Animation";
import getDeviceAnimation from "../DeviceAction/getDeviceAnimation";
import { DeviceInfo } from "@ledgerhq/live-common/lib/types/manager";
import useLatestFirmware from "../../hooks/useLatestFirmware";
import { urls } from "../../config/urls";
import SafeMarkdown from "../SafeMarkdown";

type Props = {
  device: Device,
  deviceInfo: DeviceInfo,
  isOpen: boolean,
  onClose: (restoreApps?: boolean) => void
};

type FwUpdateStep = "confirmRecoveryBackup" | "downloadingUpdate" | "error" | "flashingMcu" | "confirmPin" | "confirmUpdate" | "firmwareUpdated";
type FwUpdateState = { step: FwUpdateStep, progress?: number, error?: any, installing?: string | null };

// reducer for the firmware update state machine
const fwUpdateStateReducer = (state: FwUpdateState, event: BackgroundEvent | { type: "reset" }): FwUpdateState => {
  switch(event.type) {
    case "confirmPin":
      return { step: "confirmPin" };
    case "downloadingUpdate":
      return { step: "downloadingUpdate", progress: event.progress };
    case "confirmUpdate":
      return { step: "confirmUpdate" };
    case "flashingMcu":
      return { step: "flashingMcu", progress: event.progress, installing: event.installing };      
    case "firmwareUpdated":
      return { step: "firmwareUpdated" };
    case "error":
      return { step: "error", error: event.error };
    case "reset":
      return { step: "confirmRecoveryBackup", error: undefined, progress: undefined };
    default:
      return { ...state }
  }
}


export default function FirmwareUpdate({ device, deviceInfo, onClose, isOpen }: Props) {
  const nextBackgroundEvent = useSelector(nextBackgroundEventSelector);
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const latestFirmware = useLatestFirmware(deviceInfo);

  const { t } = useTranslation();

  const [state, dispatchEvent] = useReducer(fwUpdateStateReducer, { step: "confirmRecoveryBackup", progress: undefined, error: undefined, installing: undefined });

  const { step, progress, error, installing } = state;

  const onReset = useCallback(() => {
    dispatchEvent({type: "reset"});
    dispatch(clearBackgroundEvents());
    NativeModules.BackgroundRunner.stop();
  }, [dispatch]);

  const onTryClose = useCallback((restoreApps?: boolean) => {
    // only allow closing of the modal when the update is not in an intermediate step
    if(step === "confirmRecoveryBackup" || step === "firmwareUpdated" || step === "error") {
      // prevent the firmware update modal from opening again without the user explicit clicking on update
      onClose(restoreApps);
    }
  }, [step]);

  useEffect(() => {
    // reset the state whenever we re-open the modal
    if(isOpen) {
      onReset();
    }
   }, [isOpen, onReset]);

  useEffect(() => {
    if (!nextBackgroundEvent) return;

    dispatchEvent(nextBackgroundEvent);
    dispatch(dequeueBackgroundEvent());
  }, [nextBackgroundEvent, dispatch, dispatchEvent]);


  const launchUpdate = useCallback(() => {
    if(latestFirmware) {
      NativeModules.BackgroundRunner.start(device.deviceId, JSON.stringify(latestFirmware));
      dispatchEvent({ type: "downloadingUpdate", progress: 0 });
    }
  }, [latestFirmware]);

  const [confirmRecoveryPhraseBackup, setConfirmRecoveryPhraseBackup] = useState(false);

  const toggleConfirmRecoveryPhraseBackup = useCallback(() => {
    setConfirmRecoveryPhraseBackup(!confirmRecoveryPhraseBackup);
  }, [confirmRecoveryPhraseBackup]);

  const openRecoveryPhraseInfo = React.useCallback(async () => {
    // Checking if the link is supported for links with custom URL scheme.
    const supported = await Linking.canOpenURL(urls.recoveryPhraseInfo);
    if (!supported) return;

    // Opening the link with some app, if the URL scheme is "http" the web link should be opened
    // by some browser in the mobile
    await Linking.openURL(urls.recoveryPhraseInfo);
  }, [urls.recoveryPhraseInfo]);

  const firmwareVersion = latestFirmware?.final?.name ?? "";

  return (
    <BottomModal
      id="DeviceActionModal"
      isOpened={isOpen}
      onClose={onTryClose}
      onModalHide={onTryClose}
    >
        {
          step === "confirmRecoveryBackup" && (
            <Flex height="100%">
              <ScrollView>
                <Text variant="h2" fontWeight="semiBold" mb={4}>
                  <Trans
                    i18nKey="FirmwareUpdateReleaseNotes.introTitle"
                    values={{ version: firmwareVersion }}
                  >
                    {"You are about to install "}
                    <Text variant="h2" fontWeight="semiBold">{`firmware version ${firmwareVersion}`}</Text>
                  </Trans>
                </Text>
                <SafeMarkdown markdown={latestFirmware?.osu?.notes} />
              </ScrollView>
                <Text variant="paragraph" color="neutral.c80" mt={6}>
                  {t("FirmwareUpdateReleaseNotes.recoveryPhraseBackupInstructions")}
                </Text>
                <Flex mt={6}>
                  <Link
                    onPress={openRecoveryPhraseInfo}
                    Icon={Icons.ExternalLinkMedium}
                    iconPosition="right"
                    type="color"
                    style={{ justifyContent: "flex-start" }}                
                  >
                    {t("onboarding.stepSetupDevice.recoveryPhraseSetup.infoModal.link")}
                  </Link>
                </Flex>
                <Flex height={1} mt={7} backgroundColor="neutral.c40" />
              {/** TODO: replace by divider component when we have one */}
              <Flex backgroundColor="neutral.c30" p={7} mt={8} borderRadius={5}>
                <Checkbox checked={confirmRecoveryPhraseBackup} onChange={toggleConfirmRecoveryPhraseBackup} label={t("FirmwareUpdateReleaseNotes.confirmRecoveryPhrase")} />
              </Flex>
            <Button onPress={launchUpdate} type="main" mt={8} disabled={!confirmRecoveryPhraseBackup}>
              {t("common.continue")}
            </Button>
            <Button onPress={() => onTryClose()} mt={6}>
              {t("common.cancel")}
            </Button>
            </Flex>
          )
        }
        {
          step === "flashingMcu" && (
            <Flex alignItems="center">
              <FirmwareProgress progress={progress} />              
              <Text variant="h2" mt={8}>              
                {progress && installing ? t(`FirmwareUpdate.steps.${installing}`) : t("FirmwareUpdate.steps.preparing")}
              </Text>
              <Text variant="small" color="neutral.c70" my={6}>
                {t("FirmwareUpdate.pleaseWaitUpdate")}
              </Text>
            </Flex>
          )
        }
        {
          step === "firmwareUpdated" && (
            <Flex alignItems="center">
              <Icons.CircledCheckSolidLight size={56} color="success.c100" />
              <Flex my={7}>
              <Log>
                {t("FirmwareUpdate.success")}
              </Log>
              </Flex>
              <Text variant="paragraph">
                {t("FirmwareUpdate.pleaseReinstallApps")}
              </Text>
              <Button type="main" alignSelf="stretch" mt={10}>
                {t("FirmwareUpdate.reinstallApps")}
              </Button>
            </Flex>
          )
        }
        {
          step === "error" && (
            <>
            <GenericErrorView error={error} />
            {/* TODO: the button is here only for testing, remove it (maybe?) */}
            <Button type="main" alignSelf="stretch" mt={10} onPress={() => onTryClose(true)}>
              {t("FirmwareUpdate.reinstallApps")}
            </Button>
            </>
          )
        }
        {
          step === "confirmPin" && (
            <Flex alignItems="center">
            <Animation
              source={getDeviceAnimation({
                device,
                key: "enterPinCode",
                theme: theme as "light" | "dark" | undefined,
              })}
            />
            <Flex border={1} borderColor="neutral.c80" borderRadius={3} px={2} mt={4}>
              <Text variant="subtitle" color="neutral.c80" p={0} m={0}>
               {device.deviceName}
              </Text>
            </Flex>
            <Flex mt={7}>
              <Log>
                {t("FirmwareUpdate.pleaseConfirmUpdate")}
              </Log>
            </Flex>
            <Flex border={1} borderColor="neutral.c80" alignSelf="stretch" px={6} pt={6} borderRadius={5} mt={10}>
                <NumberedList items={[{
                  description: t("FirmwareUpdate.waitForFirmwareUpdate"),
                },{
                  description: t("FirmwareUpdate.unlockDeviceWithPin")
                },]} itemContainerProps={{
                  
                }} />
            </Flex>
          </Flex>
          )
        }
        {
          step === "confirmUpdate" && (
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
                <Log>
                  {t("FirmwareUpdate.pleaseConfirmUpdate")}
                </Log>
              </Flex>
              <Flex grow={1} justifyContent="space-between" flexDirection="row" alignSelf="stretch" mt={10}>
                <Text variant="subtitle" color="neutral.c80">
                {t("FirmwareUpdate.currentVersionNumber")}
                </Text>
                <Text variant="subtitle">
                  {deviceInfo.version}          
                </Text>
              </Flex>
              <Flex grow={1} justifyContent="space-between" flexDirection="row"  alignSelf="stretch" mt={5} mb={5}>
                <Text variant="subtitle" color="neutral.c80">
                  {t("FirmwareUpdate.newVersionNumber")}
                </Text>
                <Text variant="subtitle">
                  {firmwareVersion}
                </Text>
              </Flex>
            </Flex>
          )
        }
        { 
        step === "downloadingUpdate" && (
          <Flex alignItems="center">
            <FirmwareProgress progress={progress} />              
            <Text variant="h2" mt={8}>              
              {progress ? t("FirmwareUpdate.steps.firmware") : t("FirmwareUpdate.steps.preparing")}
            </Text>
            <Text variant="small" color="neutral.c70" my={6}>
              {t("FirmwareUpdate.pleaseWaitDownload")}
            </Text>
          </Flex>
        )}
    </BottomModal>
  );
}