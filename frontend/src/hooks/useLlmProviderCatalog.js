import { useCallback, useEffect, useMemo, useState } from "react";
import { listLlmProviderKeys, listLlmProviders } from "@/lib/windieApi";

/**
 * Classifies one LLM provider for the provider-management UI.
 *
 * A key-backed provider is ready only when at least one enabled key has
 * successfully listed models. Providers that do not require authentication
 * are ready without a key.
 */
export function providerState(provider, keys = []) {
  if (provider.authentication === "none") {
    return { kind: "ready", label: "ready · no key needed" };
  }

  const invalidKeyCount = keys.filter(
    (key) => key.status === "list_models_failed"
  ).length;
  const readyKeyCount = keys.filter(
    (key) => key.enabled !== false && key.status === "success"
  ).length;

  if (readyKeyCount > 0) {
    return {
      kind: "ready",
      label: `ready · ${provider.key_count} key${provider.key_count === 1 ? "" : "s"}`,
    };
  }
  if (invalidKeyCount === keys.length && invalidKeyCount > 0) {
    return { kind: "invalid", label: "invalid key · check key" };
  }
  if (keys.length > 0 && readyKeyCount === 0) {
    return { kind: "disabled", label: "disabled · enable a key" };
  }
  return { kind: "needs-key", label: "needs API key" };
}

/** Returns whether the catalog contains one usable, enabled LLM provider. */
export function hasReadyEnabledProvider(providers, keysByProvider) {
  return providers.some((provider) => {
    if (provider.authentication === "none") {
      return provider.enabled !== false;
    }
    return (keysByProvider[provider.name] || []).some(
      (key) => key.enabled !== false && key.status === "success"
    );
  });
}

/** Owns the shared LLM provider/key catalog used by setup and welcome UI. */
export function useLlmProviderCatalog({ onError } = {}) {
  const [providers, setProviders] = useState([]);
  const [keysByProvider, setKeysByProvider] = useState({});
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await listLlmProviders();
      const keyEntries = await Promise.all(
        catalog.map(async (provider) => {
          if (provider.key_count === 0 || provider.authentication === "none") {
            return [provider.name, []];
          }
          try {
            return [provider.name, await listLlmProviderKeys(provider.name)];
          } catch {
            return [provider.name, null];
          }
        })
      );
      const nextKeysByProvider = Object.fromEntries(keyEntries);
      const sortedCatalog = [...catalog].sort((left, right) => {
        const rank = (provider) => {
          const kind = providerState(
            provider,
            nextKeysByProvider[provider.name] || []
          ).kind;
          return kind === "ready" ? 0 : kind === "needs-key" ? 1 : 2;
        };
        const leftRank = rank(left);
        const rightRank = rank(right);
        return (
          leftRank - rightRank ||
          left.display_name.localeCompare(right.display_name)
        );
      });
      setProviders(sortedCatalog);
      setKeysByProvider(nextKeysByProvider);
      return sortedCatalog;
    } catch (error) {
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasReadyEnabledLlmProvider = useMemo(
    () => hasReadyEnabledProvider(providers, keysByProvider),
    [providers, keysByProvider]
  );

  return {
    providers,
    keysByProvider,
    loading,
    loaded,
    refresh,
    hasReadyEnabledLlmProvider,
  };
}
