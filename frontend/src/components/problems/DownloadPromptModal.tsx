import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Monitor, Download, ShieldAlert } from "lucide-react";

interface DownloadPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadPromptModal: React.FC<DownloadPromptModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleDownloadRedirect = () => {
    onClose();
    navigate("/download");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md z-10 flex flex-col text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2 text-primary">
            <ShieldAlert className="size-4" />
            <span className="font-bold text-xs uppercase tracking-wider">Action Restricted</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
            <Monitor className="size-6" />
          </div>

          <h3 className="text-base font-bold tracking-tight">
            Desktop Application Required
          </h3>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            Running and submitting code requires direct compiler access to execute low-latency testcases locally in an isolated sandbox. This feature is exclusive to the <strong>ShahLMS Desktop Application</strong>.
          </p>

          <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-left">
            <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wide">Why Use the Desktop App?</h4>
            <ul className="text-[10.5px] text-muted-foreground mt-1.5 list-disc list-inside space-y-1">
              <li>Automatic local compiler auto-detection.</li>
              <li>Zero-latency compilation & execution.</li>
              <li>Infinite loop detection and auto-timeouts.</li>
              <li>Full sandbox isolation for local runs.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex gap-2.5 justify-end">
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadRedirect}
            className="py-1.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="size-3.5" />
            <span>Get Desktop App</span>
          </button>
        </div>

      </div>
    </div>
  );
};
export default DownloadPromptModal;
