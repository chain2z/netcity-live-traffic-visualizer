import { describe, expect, it } from "vitest";

import { decodeMessage } from "./decode";

describe("decodeMessage", () => {
  it("decodes a valid snapshot", () => {
    const message = decodeMessage(
      JSON.stringify({
        type: "snapshot",
        sourceStatus: {
          mode: "MOCK",
          failureReason: "INSUFFICIENT_PRIVILEGES",
          message: "Live capture requires administrator/root privileges.",
        },
        devices: [],
        connections: [],
      }),
    );

    expect(message.type).toBe("snapshot");
    if (message.type === "snapshot") {
      expect(message.sourceStatus.mode).toBe("MOCK");
    }
  });

  it("rejects malformed messages", () => {
    expect(() => decodeMessage(JSON.stringify({ type: "delta" }))).toThrow(/malformed/);
  });
});
