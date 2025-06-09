export function isSatisfiesElementFilter<
  T extends {
    tags: Set<string> | null;
    filter: ((item: unknown) => boolean) | null;
  },
>(config: T, item: object, eventTagsSet: Set<string>) {
  return (
    (!config.tags || config.tags.isSubsetOf(eventTagsSet)) &&
    (!config.filter || config.filter(item))
  );
}
