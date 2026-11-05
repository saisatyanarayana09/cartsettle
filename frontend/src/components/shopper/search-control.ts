export function showIdleAssistant({ enabled, focused, query, listening }: {
  enabled: boolean;
  focused: boolean;
  query: string;
  listening: boolean;
}) {
  return Boolean(enabled && !focused && query.length === 0 && !listening);
}