import { useEffect, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Sparkles, X, RefreshCw } from "lucide-react";

export function UpdateChecker() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<"idle" | "downloading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check for updates 3 seconds after launch
    const timer = setTimeout(async () => {
      try {
        const result = await check();
        if (result?.available) {
          setUpdate(result);
        }
      } catch (err) {
        console.warn("[Updater] Check failed silently:", err);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleDownload() {
    if (!update) return;
    setStatus("downloading");
    let downloaded = 0;
    let total = 0;

    try {
      await update.download((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setProgress(Math.round((downloaded / total) * 100));
          }
        } else if (event.event === "Finished") {
          setStatus("ready");
        }
      });
    } catch (err: any) {
      setError("Download failed. Please try again.");
      setStatus("error");
      console.error("[Updater] Download failed:", err);
    }
  }

  async function handleInstall() {
    if (!update) return;
    try {
      await update.install();
      await relaunch();
    } catch (err: any) {
      setError("Install failed. Please restart manually.");
      setStatus("error");
      console.error("[Updater] Install failed:", err);
    }
  }

  if (!update) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 bg-card border border-border rounded-xl p-4 shadow-xl flex flex-col gap-3 min-w-[280px] max-w-[320px] text-foreground animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-border shrink-0 mt-0.5">
            <Sparkles className="size-4 text-primary animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">
              {status === "ready" ? "Update Ready!" : "New Update Available"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {status === "ready"
                ? "Restart ShahLMS to apply."
                : `Version v${update.version} is ready.`}
            </div>
          </div>
        </div>
        {status === "idle" && (
          <button
            onClick={() => setUpdate(null)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {update.body && status === "idle" && (
        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/40 line-clamp-2 leading-relaxed">
          {update.body}
        </p>
      )}

      {status === "idle" && (
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shadow-sm"
          >
            Update Now
          </button>
          <button
            onClick={() => setUpdate(null)}
            className="py-1.5 px-3 rounded-lg border border-input hover:bg-muted font-semibold text-xs text-foreground transition-colors"
          >
            Later
          </button>
        </div>
      )}

      {status === "downloading" && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
            <span>Downloading update...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden border border-border/20">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "ready" && (
        <button
          onClick={handleInstall}
          className="w-full py-2 px-3 rounded-lg font-semibold text-xs text-primary-foreground bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="size-3.5 animate-spin-slow" />
          Restart and Apply
        </button>
      )}

      {status === "error" && (
        <div className="text-xs font-semibold text-destructive text-center p-1.5 bg-destructive/10 border border-destructive/20 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
