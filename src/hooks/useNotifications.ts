import process from "node:process";
import {
  type LinuxNotification,
  useLinuxNotifications,
} from "./useLinuxNotifications/useLinuxNotifications.ts";
import {
  useWindowsNotifications,
  type WindowsNotificationOptions,
} from "./useWindowsToasts/useWindowsToasts.ts";

type NotificationOptions = {
  linux: LinuxNotification;
  windows: WindowsNotificationOptions;
};

export const useNotifications = () => {
  if (process.platform === "win32") {
    const notify = useWindowsNotifications();

    return function (options: NotificationOptions) {
      notify(options.windows);
    };
  }

  if (process.platform === "linux") {
    const notify = useLinuxNotifications();

    return function (options: NotificationOptions) {
      notify(options.linux);
    };
  }

  throw new Error(
    `Unsupported platform for notifications: ${process.platform}`
  );
};
