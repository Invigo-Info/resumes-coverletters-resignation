/**
 * Dropbox Chooser integration. The real chooser popup (the "Sign into Dropbox"
 * window) only opens when a Dropbox app key is configured via the public env
 * var NEXT_PUBLIC_DROPBOX_APP_KEY. Without it, callers fall back to the in-app
 * import flow.
 */

const APP_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;

export function isDropboxConfigured(): boolean {
  return !!APP_KEY;
}

declare global {
  interface Window {
    Dropbox?: {
      choose: (opts: {
        linkType?: "preview" | "direct";
        multiselect?: boolean;
        extensions?: string[];
        success: (files: { name: string; link: string }[]) => void;
        cancel?: () => void;
      }) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadDropins(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Dropbox) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://www.dropbox.com/static/api/2/dropins.js";
    s.id = "dropboxjs";
    s.setAttribute("data-app-key", APP_KEY ?? "");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Dropbox dropins"));
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Open the Dropbox chooser. Resolves with the picked file (name + direct link),
 * or null if cancelled / not configured.
 */
export async function chooseFromDropbox(): Promise<{ name: string; link: string } | null> {
  if (!APP_KEY) return null;
  await loadDropins();
  return new Promise((resolve) => {
    window.Dropbox!.choose({
      linkType: "direct",
      multiselect: false,
      extensions: [".pdf", ".doc", ".docx"],
      success: (files) => resolve(files[0] ?? null),
      cancel: () => resolve(null),
    });
  });
}

/** Fetch a Dropbox direct link and wrap it as a File for parsing. */
export async function fetchDropboxFile(
  name: string,
  link: string
): Promise<File> {
  const res = await fetch(link);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "application/pdf" });
}
