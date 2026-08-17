import {
  pluginMarketplaceFromApi,
  providerInstallationsFromApi,
  upsertConversationMessage,
} from "./windieMappers";

describe("pluginMarketplaceFromApi", () => {
  test("maps marketplace presentation and installed state", () => {
    const [plugin] = pluginMarketplaceFromApi({
      source_url: "http://127.0.0.1:8788/index.json",
      index: {
        plugins: [
          {
            id: "parallel-search",
            versions: [
              {
                version: "1.0.0",
                components: ["mcp"],
                capabilities: ["web_search"],
                presentation: {
                  name: "Parallel Search",
                  description: "Search the web.",
                  icon_url: "plugins/parallel-search/icon.svg",
                },
                publisher: "parallel",
                status: "verified",
              },
            ],
          },
        ],
      },
      installed: [{
        id: "parallel-search",
        version: "1.0.0",
        components: [{ id: "parallel-search", type: "mcp" }],
      }],
    });

    expect(plugin.name).toBe("Parallel Search");
    expect(plugin.iconUrl).toBe("http://127.0.0.1:8788/plugins/parallel-search/icon.svg");
    expect(plugin.components).toEqual(["mcp"]);
    expect(plugin.installed.version).toBe("1.0.0");
    expect(plugin.installed.components).toEqual([{ id: "parallel-search", type: "mcp" }]);
  });
});

describe("providerInstallationsFromApi", () => {
  test("preserves actionable provider readiness", () => {
    const [provider] = providerInstallationsFromApi([
      {
        manifest: { provider_id: "brightdata", display_name: "Bright Data", runtime: "node" },
        installation: {
          state: "broken",
          readiness: "missing_secret",
          next_action: "configure the provider secret and repair",
          error: "missing required provider secret BRIGHTDATA_API_TOKEN",
        },
      },
    ]);

    expect(provider.installation.readiness).toBe("missing_secret");
    expect(provider.installation.nextAction).toContain("configure");
    expect(provider.installation.error).toContain("BRIGHTDATA");
    expect(provider.runtime).toBe("node");
  });

  test("maps hosted remote provider metadata and optional secrets", () => {
    const [provider] = providerInstallationsFromApi([
      {
        manifest: {
          provider_id: "parallel-search",
          display_name: "Parallel Search",
          transport: "streamable_http",
          authentication: "optional_api_key",
          documentation_url: "https://docs.parallel.ai/integrations/mcp/search-mcp",
          secrets: [
            {
              env_key: "PARALLEL_API_KEY",
              description: "Parallel API key for higher rate limits",
              required: false,
            },
          ],
          launch: {
            type: "streamable_http",
            url: "https://search.parallel.ai/mcp",
          },
        },
        installation: null,
      },
    ]);

    expect(provider.transport).toBe("streamable_http");
    expect(provider.authentication).toBe("optional_api_key");
    expect(provider.documentationUrl).toContain("parallel.ai");
    expect(provider.launch.type).toBe("streamable_http");
    expect(provider.secrets[0].required).toBe(false);
  });
});

describe("upsertConversationMessage", () => {
  test("adds an authoritative child and advances the selected path", () => {
    const conversation = {
      id: "conversation-1",
      model: "openai/test",
      rootId: "root",
      rootIds: ["root"],
      selectedPath: ["root"],
      nodes: {
        root: {
          id: "root",
          parentId: null,
          childrenIds: [],
          message: { role: "user", parts: [{ type: "text", text: "hello" }] },
        },
      },
    };

    const updated = upsertConversationMessage(
      conversation,
      {
        id: "assistant-1",
        parent_message_id: "root",
        role: "assistant",
        content: "saved answer",
        parts: [{ type: "text", text: "saved answer" }],
        metadata: null,
      },
      "openai/test",
      true
    );

    expect(updated.nodes["assistant-1"].parentId).toBe("root");
    expect(updated.nodes.root.childrenIds).toEqual(["assistant-1"]);
    expect(updated.selectedPath).toEqual(["root", "assistant-1"]);
    expect(updated.nodes["assistant-1"].message.parts[0].text).toBe("saved answer");
  });
});
