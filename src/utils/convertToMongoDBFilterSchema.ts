import * as v from "valibot";

type Schema =
  | v.AnySchema
  | v.UnknownSchema
  | v.NullableSchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.Default<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>, null>
  >
  | v.NullishSchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.Default<
      v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
      null | undefined
    >
  >
  | v.NullSchema<v.ErrorMessage<v.NullIssue> | undefined>
  | v.StringSchema<v.ErrorMessage<v.StringIssue> | undefined>
  | v.BooleanSchema<v.ErrorMessage<v.BooleanIssue> | undefined>
  | v.NumberSchema<v.ErrorMessage<v.NumberIssue> | undefined>
  | v.LiteralSchema<v.Literal, v.ErrorMessage<v.LiteralIssue> | undefined>
  | v.PicklistSchema<
    v.PicklistOptions,
    v.ErrorMessage<v.PicklistIssue> | undefined
  >
  | v.EnumSchema<v.Enum, v.ErrorMessage<v.EnumIssue> | undefined>
  | v.VariantSchema<
    string,
    v.VariantOptions<string>,
    v.ErrorMessage<v.VariantIssue> | undefined
  >
  | v.UnionSchema<
    v.UnionOptions,
    v.ErrorMessage<v.UnionIssue<v.BaseIssue<unknown>>> | undefined
  >
  | v.IntersectSchema<
    v.IntersectOptions,
    v.ErrorMessage<v.IntersectIssue> | undefined
  >
  | v.ObjectSchema<v.ObjectEntries, v.ErrorMessage<v.ObjectIssue> | undefined>
  | v.ObjectWithRestSchema<
    v.ObjectEntries,
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.ErrorMessage<v.ObjectWithRestIssue> | undefined
  >
  | v.ExactOptionalSchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.Default<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>, undefined>
  >
  | v.OptionalSchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.Default<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>, undefined>
  >
  | v.UndefinedableSchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.Default<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>, undefined>
  >
  | v.StrictObjectSchema<
    v.ObjectEntries,
    v.ErrorMessage<v.StrictObjectIssue> | undefined
  >
  | v.LooseObjectSchema<
    v.ObjectEntries,
    v.ErrorMessage<v.LooseObjectIssue> | undefined
  >
  | v.RecordSchema<
    v.BaseSchema<string, string | number | symbol, v.BaseIssue<unknown>>,
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.ErrorMessage<v.RecordIssue> | undefined
  >
  | v.TupleSchema<v.TupleItems, v.ErrorMessage<v.TupleIssue> | undefined>
  | v.TupleWithRestSchema<
    v.TupleItems,
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.ErrorMessage<v.TupleWithRestIssue> | undefined
  >
  | v.LooseTupleSchema<
    v.TupleItems,
    v.ErrorMessage<v.LooseTupleIssue> | undefined
  >
  | v.StrictTupleSchema<
    v.TupleItems,
    v.ErrorMessage<v.StrictTupleIssue> | undefined
  >
  | v.ArraySchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    v.ErrorMessage<v.ArrayIssue> | undefined
  >
  | v.LazySchema<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>;

type SchemaOrPipe =
  | Schema
  | v.SchemaWithPipe<
    readonly [
      Schema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(Schema | v.PipeAction<any, any, v.BaseIssue<unknown>>)[],
    ]
  >;

function flattenEntries(
  entries: v.ObjectSchema<any, any>["entries"],
  prefix = "",
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const key in entries) {
    const schema = entries[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (schema.type === "object") {
      Object.assign(flat, flattenEntries(schema.entries, path));
    } else {
      flat[path] = v.optional(
        v.union([schema, convertPrimitiveToMongoDBFilterSchema(schema)]),
      );
    }
  }
  return flat;
}

export function convertObjectToMongoDBFilterSchema(
  schema: v.ObjectSchema<
    v.ObjectEntries,
    v.ErrorMessage<v.ObjectIssue> | undefined
  >,
) {
  const flatDef = flattenEntries(schema.entries);

  const fullSchema: v.StrictObjectSchema<
    v.ObjectEntries,
    v.ErrorMessage<v.StrictObjectIssue> | undefined
  > = v.strictObject({
    ...flatDef,
    $and: v.optional(v.array(v.lazy(() => fullSchema))),
    $or: v.optional(v.array(v.lazy(() => fullSchema))),
    $not: v.optional(v.lazy(() => fullSchema)),
    $nor: v.optional(v.lazy(() => fullSchema)),
  });

  return fullSchema;
}

export function convertPrimitiveToMongoDBFilterSchema(
  schema: SchemaOrPipe,
): v.GenericSchema {
  if ("pipe" in schema) {
    // Process each item in the pipe
    const pipeFilters = schema.pipe.map((item) => {
      if (item.kind === "schema") {
        return convertPrimitiveToMongoDBFilterSchema(item);
      }
      // For pipe actions, we'll handle common transformations
      return item;
    });

    // @ts-expect-error Combine all pipe filters with AND logic
    return v.pipe(...pipeFilters);
  }

  if (schema.type === "picklist") {
    const picklistFilter = v.strictObject({
      $eq: v.optional(v.picklist(schema.options)),
      $ne: v.optional(v.picklist(schema.options)),
      $in: v.optional(v.array(v.picklist(schema.options))),
      $nin: v.optional(v.array(v.picklist(schema.options))),
      $exists: v.optional(v.boolean()),
    });
    return picklistFilter;
  }

  if (schema.type === "enum") {
    const enumFilter = v.strictObject({
      $eq: v.optional(v.picklist(schema.options)),
      $ne: v.optional(v.picklist(schema.options)),
      $in: v.optional(v.array(v.picklist(schema.options))),
      $nin: v.optional(v.array(v.picklist(schema.options))),
      $exists: v.optional(v.boolean()),
    });
    return enumFilter;
  }

  // Handle primitive types with recursive $not
  if (schema.type === "string") {
    const stringFilter = v.strictObject({
      $eq: v.optional(v.string()),
      $ne: v.optional(v.string()),
      $regex: v.optional(v.string()),
      $in: v.optional(v.array(v.string())),
      $nin: v.optional(v.array(v.string())),
      $exists: v.optional(v.boolean()),
    });
    return stringFilter;
  }

  if (schema.type === "number") {
    const numberFilter = v.strictObject({
      $eq: v.optional(v.number()),
      $ne: v.optional(v.number()),
      $gt: v.optional(v.number()),
      $gte: v.optional(v.number()),
      $lt: v.optional(v.number()),
      $lte: v.optional(v.number()),
      $in: v.optional(v.array(v.number())),
      $nin: v.optional(v.array(v.number())),
      $exists: v.optional(v.boolean()),
    });
    return numberFilter;
  }

  if (schema.type === "boolean") {
    const booleanFilter = v.strictObject({
      $eq: v.optional(v.boolean()),
      $ne: v.optional(v.boolean()),
      $exists: v.optional(v.boolean()),
    });
    return booleanFilter;
  }

  // Handle arrays with elemMatch and logical operators
  if (schema.type === "array") {
    const elementFilter = convertPrimitiveToMongoDBFilterSchema(
      schema.item as Schema,
    );
    return v.union([
      schema.item,
      v.strictObject({
        $elemMatch: v.optional(elementFilter),
        $size: v.optional(v.number()),
        $all: v.optional(v.array(v.union([schema.item, elementFilter]))),
        $exists: v.optional(v.boolean()),
      }),
    ]);
  }

  // Handle objects with recursive logical operators
  if (schema.type === "object") {
    return convertObjectToMongoDBFilterSchema(schema);
  }

  // Handle unions and optionals
  if (schema.type === "union") {
    return v.union(
      schema.options.map((el) =>
        convertPrimitiveToMongoDBFilterSchema(el as Schema)
      ),
    );
  }

  if (schema.type === "optional") {
    return convertPrimitiveToMongoDBFilterSchema(schema.wrapped as Schema);
  }

  throw new Error(`Unsupported schema type: ${schema.type}`);
}
