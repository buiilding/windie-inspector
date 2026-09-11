import {
  LOCAL_WINDIE_API_BASE,
  PUBLIC_DEMO_API_BASE,
  isPublicDemoInspectorOrigin,
  resolveWindieApiBase,
} from "./windieEndpoint";

test("app.windieos.com selects the public demo API", () => {
  const location = { hostname: "app.windieos.com" };

  expect(isPublicDemoInspectorOrigin(location)).toBe(true);
  expect(
    resolveWindieApiBase({ location, runtimeOverride: null, buildOverride: null })
  ).toBe(PUBLIC_DEMO_API_BASE);
});

test("local and unrelated origins retain the loopback API default", () => {
  for (const hostname of ["localhost", "127.0.0.1", "preview.example.com"]) {
    expect(
      resolveWindieApiBase({
        location: { hostname },
        runtimeOverride: null,
        buildOverride: null,
      })
    ).toBe(LOCAL_WINDIE_API_BASE);
  }
});

test("the production demo hostname cannot be redirected by an endpoint override", () => {
  expect(
    resolveWindieApiBase({
      location: { hostname: "app.windieos.com" },
      runtimeOverride: "https://runtime.example.com",
      buildOverride: "https://build.example.com",
    })
  ).toBe(PUBLIC_DEMO_API_BASE);
});

test("explicit endpoint overrides retain precedence for other origins", () => {
  expect(
    resolveWindieApiBase({
      location: { hostname: "preview.example.com" },
      runtimeOverride: "https://runtime.example.com",
      buildOverride: "https://build.example.com",
    })
  ).toBe("https://runtime.example.com");

  expect(
    resolveWindieApiBase({
      location: { hostname: "preview.example.com" },
      runtimeOverride: null,
      buildOverride: "https://build.example.com",
    })
  ).toBe("https://build.example.com");
});
