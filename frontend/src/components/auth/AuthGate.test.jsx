import { renderToStaticMarkup } from "react-dom/server";
import AuthGate from "./AuthGate";
import TopBar from "@/components/windie/TopBar";
import { AUTH_KIND, AuthProvider } from "@/context/AuthContext";

const mockIsLocalInspectorOrigin = jest.fn();
const mockIsPublicDemoInspectorOrigin = jest.fn();

jest.mock("@/components/auth/LocalAccessGate", () => function LocalAccessGate({ children }) {
  return children;
});

jest.mock("@/lib/localInspectorAccess", () => ({
  isLocalInspectorOrigin: () => mockIsLocalInspectorOrigin(),
}));

jest.mock("@/lib/windieEndpoint", () => ({
  isPublicDemoInspectorOrigin: () => mockIsPublicDemoInspectorOrigin(),
}));

jest.mock("@/context/WindieContext", () => ({
  useWindie: () => ({
    activeConv: null,
    theme: "light",
    setTheme: jest.fn(),
    tokenMeter: null,
  }),
}));

beforeEach(() => {
  mockIsLocalInspectorOrigin.mockReturnValue(false);
  mockIsPublicDemoInspectorOrigin.mockReturnValue(false);
});

test("local access provides context without hosted account controls", () => {
  mockIsLocalInspectorOrigin.mockReturnValue(true);

  const markup = renderToStaticMarkup(
    <AuthGate>
      <TopBar />
    </AuthGate>
  );

  expect(markup).toContain('aria-label="toggle theme"');
  expect(markup).not.toContain('aria-label="sign out"');
});

test("the public demo mounts without hosted account controls", () => {
  mockIsPublicDemoInspectorOrigin.mockReturnValue(true);

  const markup = renderToStaticMarkup(
    <AuthGate>
      <TopBar />
    </AuthGate>
  );

  expect(markup).toContain('aria-label="toggle theme"');
  expect(markup).not.toContain("Continue with Google");
  expect(markup).not.toContain('aria-label="sign out"');
});

test("hosted access retains account identity and sign-out controls", () => {
  const markup = renderToStaticMarkup(
    <AuthProvider
      value={{
        kind: AUTH_KIND.HOSTED,
        session: { user: { email: "person@example.com" } },
        signOut: jest.fn(),
      }}
    >
      <TopBar />
    </AuthProvider>
  );

  expect(markup).toContain("person@example.com");
  expect(markup).toContain('aria-label="sign out"');
});
