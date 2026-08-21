import { sessionLocation } from "./sessionLocation";

describe("sessionLocation", () => {
  it("builds the canonical route for one session", () => {
    expect(sessionLocation("session-123")).toBe("/sessions/session-123");
  });

  it("encodes a session id before putting it in a URL", () => {
    expect(sessionLocation("session / 123")).toBe("/sessions/session%20%2F%20123");
  });

  it("rejects an empty session id", () => {
    expect(() => sessionLocation(" ")).toThrow("requires a session id");
  });
});
