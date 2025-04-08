import type { Config } from "../hooks/useConfig.ts";

export function configToString(conf: Config) {
  let result = "";
  const nl = "\\n";

  if (conf.enabled === false) {
    result += "Отключен";
    return result;
  }

  if (conf.notifications.length > 0) {
    result += "Уведомления: ";
    result += conf.notifications
      .map((el) => el.name)
      .join(", ");
    result += nl;
  }

  if (conf.commands.length > 0) {
    result += "Команды: ";
    result += conf.commands
      .map((el) => el.name)
      .join(", ");
    result += nl;
  }

  if (conf.notifications.length == 0 && conf.commands.length == 0) {
    result += "<Пусто>";
  }

  return result.trimEnd();
}
