import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  apiRequest,
  configureProvider as configureProviderApi,
  disableProvider as disableProviderApi,
  enableProvider as enableProviderApi,
  listProviderInstallations,
  repairProvider as repairProviderApi,
  setupProvider as setupProviderApi,
  uninstallProvider as uninstallProviderApi,
} from "@/lib/windieApi";
import {
  providerInstallationsFromApi,
  toolCatalogFromApi,
  toolProviderStatusesFromApi,
} from "@/lib/windieMappers";

/** Owns available tool schemas and executable provider lifecycle projections. */
export function useToolCatalog({ onError }) {
  const [availableToolSchemas, setAvailableToolSchemas] = useState([]);
  const [availableToolsLoading, setAvailableToolsLoading] = useState(false);
  const [toolProviderStatuses, setToolProviderStatuses] = useState([]);
  const [providerInstallations, setProviderInstallations] = useState([]);
  const [providerInstallationsLoading, setProviderInstallationsLoading] = useState(false);
  const [providerInstallationsLoaded, setProviderInstallationsLoaded] = useState(false);

  const refreshAvailableTools = useCallback(async () => {
    setAvailableToolsLoading(true);
    try {
      const body = await apiRequest("/api/tools");
      const tools = toolCatalogFromApi(body);
      setAvailableToolSchemas(tools);
      setToolProviderStatuses(toolProviderStatusesFromApi(body));
      return tools;
    } finally {
      setAvailableToolsLoading(false);
    }
  }, []);

  const refreshProviderInstallations = useCallback(async () => {
    setProviderInstallationsLoading(true);
    try {
      const nextProviders = providerInstallationsFromApi(await listProviderInstallations());
      setProviderInstallations(nextProviders);
      return nextProviders;
    } finally {
      setProviderInstallationsLoading(false);
      setProviderInstallationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshAvailableTools().catch(onError);
  }, [onError, refreshAvailableTools]);

  useEffect(() => {
    refreshProviderInstallations().catch(onError);
  }, [onError, refreshProviderInstallations]);

  const runProviderAction = useCallback(
    async (action, providerId) => {
      const progressPoll = window.setInterval(() => {
        refreshProviderInstallations().catch(onError);
      }, 500);
      try {
        const result = await action(providerId);
        await refreshProviderInstallations();
        await refreshAvailableTools();
        return result;
      } catch (error) {
        onError(error);
        toast.error(error.message);
        throw error;
      } finally {
        window.clearInterval(progressPoll);
      }
    },
    [onError, refreshAvailableTools, refreshProviderInstallations]
  );

  const setupProvider = useCallback(
    (providerId, chromeDevtoolsMode = null) =>
      runProviderAction(
        (id) => setupProviderApi(id, chromeDevtoolsMode),
        providerId
      ),
    [runProviderAction]
  );
  const configureProvider = useCallback(
    (providerId, chromeDevtoolsMode) =>
      runProviderAction(
        (id) => configureProviderApi(id, chromeDevtoolsMode),
        providerId
      ),
    [runProviderAction]
  );
  const enableProvider = useCallback(
    (providerId) => runProviderAction(enableProviderApi, providerId),
    [runProviderAction]
  );
  const disableProvider = useCallback(
    (providerId) => runProviderAction(disableProviderApi, providerId),
    [runProviderAction]
  );
  const repairProvider = useCallback(
    (providerId) => runProviderAction(repairProviderApi, providerId),
    [runProviderAction]
  );
  const uninstallProvider = useCallback(
    (providerId) => runProviderAction(uninstallProviderApi, providerId),
    [runProviderAction]
  );

  return {
    availableToolSchemas,
    availableToolsLoading,
    toolProviderStatuses,
    providerInstallations,
    providerInstallationsLoading,
    providerInstallationsLoaded,
    refreshAvailableTools,
    refreshProviderInstallations,
    setupProvider,
    configureProvider,
    enableProvider,
    disableProvider,
    repairProvider,
    uninstallProvider,
  };
}
