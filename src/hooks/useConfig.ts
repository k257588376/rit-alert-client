import { computed, toValue, type MaybeRefOrGetter } from "@vue/reactivity";
import * as v from "valibot";
import { convertObjectToMongoDBFilterSchema } from "../utils/convertToMongoDBFilterSchema.ts";
import JSONC from "tiny-jsonc";
import { usePersisedJSONCConfig } from "./usePersisedJSONCConfig.ts";

const getConfigSchema = <T extends string>(tagsArray: T[] | null) => {
  const AccessGrantedEventUserSchema = v.object({
    id: v.number(),
    firstName: v.string(),
    lastName: v.string(),
    surname: v.string(),
    fullName: v.string(),
  });

  const tagType = tagsArray != null ? v.picklist(tagsArray) : v.string();

  const AccessGrantedEventDoorSchema = v.object({
    id: v.number(),
    name: v.string(),
    side: v.picklist(["Enter", "Exit"]),
  });

  const AccessGrantedEventSchema = v.object({
    scannerId: v.number(),
    eventDate: v.pipe(v.string(), v.isoTimestamp()),
    user: AccessGrantedEventUserSchema,
    door: AccessGrantedEventDoorSchema,
    tags: v.array(tagType),
  });

  const mongodbLikeFilter = convertObjectToMongoDBFilterSchema(
    AccessGrantedEventSchema
  );

  const commonFields = {
    name: v.pipe(
      v.string(),
      v.description(
        "Имя условия. Будет показываться в уведомлении о конфигурации при запуске"
      )
    ),
    tags: v.pipe(
      v.optional(v.array(tagType)),
      v.description("Список тегов, которые должны быть в событии")
    ),
    filter: v.pipe(
      v.optional(mongodbLikeFilter),
      v.description(
        "Фильтр события в синтаксисе фильтров MongoDB. https://www.mongodb.com/docs/manual/tutorial/query-documents/"
      )
    ),
  } as const;

  const ConfigSchema = v.strictObject({
    enabled: v.pipe(
      v.optional(v.boolean(), true),
      v.description(
        "Если включено, программа подписывается на события, показывает уведомления и выполняет команды. \nПо умолчанию: true"
      )
    ),
    serverUrl: v.pipe(
      v.string(),
      v.url(),
      v.description("Адрес сервера, на события которого надо подписаться")
    ),
    showConfigOnStartup: v.pipe(
      v.optional(v.boolean(), false),
      v.description(
        "Показывать ли уведомление с настройками программы при запуске?\nПо умолчанию: false"
      )
    ),
    windowsIsScreenLockedCheckInterval: v.pipe(
      v.optional(v.number(), 1000),
      v.description(
        "Интервал в миллисекундах вызова функции проверки заблокирован ли экран на Windows. \nПо умолчанию: 1000 мс"
      )
    ),
    notifications: v.pipe(
      v.array(
        v.strictObject({
          ...commonFields,
        })
      ),
      v.description("Условия при которых показываются уведомления.")
    ),
    commands: v.array(
      v.strictObject({
        ...commonFields,
        file: v.pipe(v.string(), v.description("Путь к исполнямому файлу")),
        args: v.pipe(
          v.array(v.string()),
          v.description("Массив аргументов при выполнении исполнямого файла")
        ),
      })
    ),
  });

  return { ConfigSchema, AccessGrantedEventSchema };
};

export type Config = v.InferOutput<
  ReturnType<typeof getConfigSchema>["ConfigSchema"]
>;
export type AccessGrantedEvent = v.InferOutput<
  ReturnType<typeof getConfigSchema>["AccessGrantedEventSchema"]
>;

export const useConfig = (tagsList: MaybeRefOrGetter<string[] | null>) => {
  const schema = computed(() => getConfigSchema(toValue(tagsList)));

  const jsonc = usePersisedJSONCConfig();

  const config = computed(() => {
    const value = JSONC.parse(jsonc.value) as Config;
    return v.parse(schema.value.ConfigSchema, value);
  });

  return { config, schema, jsonc };
};
