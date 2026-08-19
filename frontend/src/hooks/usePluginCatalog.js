import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  installPlugin as installPluginApi,
  listPlugins,
  uninstallPlugin as uninstallPluginApi,
} from "@/lib/windieApi";
import { pluginMarketplaceFromApi } from "@/lib/windieMappers";

/** Owns marketplace discovery and the outer plugin install lifecycle. */
export function usePluginCatalog({ onError, onPluginChanged }) {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pendingPluginId, setPendingPluginId] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextPlugins = pluginMarketplaceFromApi(await listPlugins());
      setPlugins(nextPlugins);
      return nextPlugins;
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh().catch(onError);
  }, [onError, refresh]);

  const runPluginAction = useCallback(
    async (action, pluginId, successMessage) => {
      if (pendingPluginId) return null;
      setPendingPluginId(pluginId);
      try {
        const result = await action(pluginId);
        await refresh();
        await onPluginChanged?.();
        toast.message(successMessage);
        return result;
      } catch (error) {
        onError(error);
        toast.error(error.message);
        throw error;
      } finally {
        setPendingPluginId(null);
      }
    },
    [onError, onPluginChanged, pendingPluginId, refresh]
  );

  const installPlugin = useCallback(
    (pluginId) => runPluginAction(installPluginApi, pluginId, "plugin installed"),
    [runPluginAction]
  );
  const uninstallPlugin = useCallback(
    (pluginId) => runPluginAction(uninstallPluginApi, pluginId, "plugin removed"),
    [runPluginAction]
  );

  return {
    plugins,
    loading,
    loaded,
    pendingPluginId,
    refresh,
    installPlugin,
    uninstallPlugin,
  };
}
