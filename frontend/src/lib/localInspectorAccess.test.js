import {
  isLocalInspectorOrigin,
  localLaunchCode,
} from "./localInspectorAccess";

test("recognizes only loopback Inspector origins as local", () => {
  expect(isLocalInspectorOrigin({ hostname: "localhost" })).toBe(true);
  expect(isLocalInspectorOrigin({ hostname: "127.0.0.1" })).toBe(true);
  expect(isLocalInspectorOrigin({ hostname: "app.windieos.com" })).toBe(false);
});

test("reads a launch code from the URL fragment", () => {
  expect(localLaunchCode({ hash: "#windie-local-code=one-time-code" })).toBe(
    "one-time-code"
  );
  expect(localLaunchCode({ hash: "" })).toBe("");
});
