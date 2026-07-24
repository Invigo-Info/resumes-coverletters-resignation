// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { safeLocalStorage } from "./safe-storage";

/** A cross-browser storage-quota error (matched by name in isQuotaError). */
const quota = () => new DOMException("quota", "QuotaExceededError");

/**
 * jsdom's own `localStorage` is a Proxy, so vi.spyOn can't intercept the module's
 * calls. Swap in a plain fake (via vi.stubGlobal) whose methods we control.
 */
function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((k: string) => (store.has(k) ? store.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn((k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(() => store.clear()),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("safeLocalStorage.setItem", () => {
  it("reclaims once and retries after a quota error", () => {
    const s = makeStorage();
    s.setItem.mockImplementationOnce(() => {
      throw quota();
    });
    vi.stubGlobal("localStorage", s);
    expect(() => safeLocalStorage.setItem("k", "v")).not.toThrow();
    expect(s.removeItem).toHaveBeenCalledWith("k");
    expect(s.setItem).toHaveBeenCalledTimes(2);
  });

  it("degrades gracefully (warn, no throw) when still over quota after reclaim", () => {
    const s = makeStorage();
    s.setItem.mockImplementation(() => {
      throw quota();
    });
    vi.stubGlobal("localStorage", s);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => safeLocalStorage.setItem("k", "v")).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it("ignores a non-quota error without retrying", () => {
    const s = makeStorage();
    s.setItem.mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.stubGlobal("localStorage", s);
    expect(() => safeLocalStorage.setItem("k", "v")).not.toThrow();
    expect(s.setItem).toHaveBeenCalledTimes(1);
    expect(s.removeItem).not.toHaveBeenCalled();
  });
});

describe("safeLocalStorage read/remove", () => {
  it("round-trips a value", () => {
    vi.stubGlobal("localStorage", makeStorage());
    safeLocalStorage.setItem("k", "v");
    expect(safeLocalStorage.getItem("k")).toBe("v");
  });
  it("returns null when a read throws", () => {
    const s = makeStorage();
    s.getItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.stubGlobal("localStorage", s);
    expect(safeLocalStorage.getItem("k")).toBeNull();
  });
});
