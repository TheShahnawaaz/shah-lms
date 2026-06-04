import React, { useEffect, useState } from "react";
import { Download, Terminal, AlertTriangle, Monitor, Sparkles, Check } from "lucide-react";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface ReleaseData {
  tag_name: string;
  assets: ReleaseAsset[];
}

export const DownloadPage: React.FC = () => {
  const [version, setVersion] = useState<string>("v0.1.9");
  const [loading, setLoading] = useState<boolean>(true);
  const [detectedOS, setDetectedOS] = useState<"mac" | "windows" | "linux" | "unknown">("unknown");
  const [copiedCommand, setCopiedCommand] = useState<boolean>(false);
  
  const [downloads, setDownloads] = useState({
    macArm: "https://github.com/TheShahnawaaz/shah-lms/releases/download/v0.1.9/ShahLMS_0.1.9_aarch64.dmg",
    macIntel: "https://github.com/TheShahnawaaz/shah-lms/releases/download/v0.1.9/ShahLMS_0.1.9_x64.dmg",
    windows: "https://github.com/TheShahnawaaz/shah-lms/releases/download/v0.1.9/ShahLMS_0.1.9_x64-setup.exe"
  });

  useEffect(() => {
    // Detect OS
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("mac")) {
      setDetectedOS("mac");
    } else if (userAgent.includes("win")) {
      setDetectedOS("windows");
    } else if (userAgent.includes("linux")) {
      setDetectedOS("linux");
    }

    // Fetch latest release URLs
    const fetchLatestRelease = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/TheShahnawaaz/shah-lms/releases/latest");
        if (!response.ok) throw new Error("API call failed");
        const data: ReleaseData = await response.json();
        setVersion(data.tag_name);

        let macArm = "";
        let macIntel = "";
        let win = "";

        data.assets.forEach(asset => {
          const name = asset.name.toLowerCase();
          const url = asset.browser_download_url;
          if (name.endsWith(".dmg")) {
            if (name.includes("aarch64") || name.includes("arm64")) {
              macArm = url;
            } else {
              macIntel = url;
            }
          } else if (name.endsWith(".msi") || name.endsWith(".exe")) {
            win = url;
          }
        });

        const cleanVersion = data.tag_name.replace("v", "");
        setDownloads({
          macArm: macArm || `https://github.com/TheShahnawaaz/shah-lms/releases/download/${data.tag_name}/ShahLMS_${cleanVersion}_aarch64.dmg`,
          macIntel: macIntel || `https://github.com/TheShahnawaaz/shah-lms/releases/download/${data.tag_name}/ShahLMS_${cleanVersion}_x64.dmg`,
          windows: win || `https://github.com/TheShahnawaaz/shah-lms/releases/download/${data.tag_name}/ShahLMS_${cleanVersion}_x64-setup.exe`
        });
      } catch (err) {
        console.error("Failed to load releases from Github API, using fallbacks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLatestRelease();
  }, []);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText("xattr -d com.apple.quarantine /Applications/ShahLMS.app");
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-24 space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-muted-foreground text-sm font-medium animate-pulse">
          Fetching release assets...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Title Header */}
      <div className="text-center space-y-2.5 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" />
          <span>Latest Release: {version}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Get ShahLMS Desktop
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Compile, debug, and execute code locally with zero-latency execution. Get the client for your operating system below.
        </p>
      </div>

      {/* Main OS Download Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* macOS Download Card */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 bg-card relative overflow-hidden flex flex-col justify-between ${
          detectedOS === "mac"
            ? "border-primary shadow-lg ring-1 ring-primary/30 scale-[1.01]"
            : "border-border hover:border-border/80"
        }`}>
          {detectedOS === "mac" && (
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg select-none">
              Recommended for your system
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#e2e8f0]/40 dark:bg-muted/40 rounded-xl flex items-center justify-center text-foreground">
                <Monitor className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">macOS</h3>
                <p className="text-[10px] text-muted-foreground">Apple Silicon & Intel Macs</p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              Provides native compilation for C++, Python, and Java on macOS machines. Select your chip architecture below.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href={downloads.macArm}
              className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Apple Silicon (M1/M2/M3)</span>
            </a>
            <a
              href={downloads.macIntel}
              className="py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-border"
            >
              <Download className="size-3.5" />
              <span>Intel Chip</span>
            </a>
          </div>
        </div>

        {/* Windows Download Card */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 bg-card relative overflow-hidden flex flex-col justify-between ${
          detectedOS === "windows"
            ? "border-primary shadow-lg ring-1 ring-primary/30 scale-[1.01]"
            : "border-border hover:border-border/80"
        }`}>
          {detectedOS === "windows" && (
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg select-none">
              Recommended for your system
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#e2e8f0]/40 dark:bg-muted/40 rounded-xl flex items-center justify-center text-foreground">
                <Monitor className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Windows</h3>
                <p className="text-[10px] text-muted-foreground">Windows 10 / 11 (x64)</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Standard Windows Installer containing native tauri client, and compiler bindings.
            </p>
          </div>

          <div className="mt-8">
            <a
              href={downloads.windows}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Download Windows Installer (.msi)</span>
            </a>
          </div>
        </div>

      </div>

      {/* Bypass / Unquarantine Guides */}
      <div className="border border-border bg-card rounded-2xl p-6 md:p-8 space-y-6">
        <h3 className="font-bold text-base flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-500" />
          <span>Bypassing Security warnings & Quarantine</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* macOS Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground border-b border-border pb-1.5">macOS Gatekeeper warning</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Because development builds are self-signed, Apple Gatekeeper may show a warning: <em>"Apple cannot verify this app for malware..."</em>
            </p>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Run this command in Terminal:</span>
              <div className="flex items-center gap-2 bg-[#0f172a] dark:bg-[#0f172a] border border-[#1e293b] p-3 rounded-lg text-white font-mono text-[11px] relative overflow-hidden group">
                <span className="truncate pr-8 select-all">xattr -d com.apple.quarantine /Applications/ShahLMS.app</span>
                <button
                  onClick={handleCopyCommand}
                  className="absolute right-2.5 p-1 bg-slate-800 rounded hover:bg-slate-700 text-white transition-colors"
                  title="Copy command"
                >
                  {copiedCommand ? <Check className="size-3.5 text-green-400" /> : <Terminal className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Windows Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground border-b border-border pb-1.5">Windows SmartScreen warning</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When launching the `.msi` installer for the first time, Windows Defender SmartScreen might block execution with a warning: <em>"Windows protected your PC..."</em>
            </p>
            <div className="bg-muted/40 border border-border/80 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">How to bypass:</span>
              <ol className="text-[11px] text-muted-foreground list-decimal list-inside space-y-1.5">
                <li>Click on the <strong className="text-foreground">"More info"</strong> text inside the warning box.</li>
                <li>Click the <strong className="text-foreground">"Run anyway"</strong> button that appears at the bottom.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
export default DownloadPage;
