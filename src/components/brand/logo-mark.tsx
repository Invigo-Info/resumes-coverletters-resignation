import { MessageSquareText } from "lucide-react";
import { cn } from "@/utilities/utils";

interface LogoMarkProps {
  /** Show the "resumewriter.ai" wordmark next to the icon. */
  withWordmark?: boolean;
  /** Tailwind size class for the gradient icon tile, e.g. "size-8". */
  className?: string;
  iconClassName?: string;
}

/**
 * resumewriter.ai brand mark: a blue gradient rounded tile with a speech-bubble
 * icon, optionally followed by the "resumewriter.ai" wordmark.
 */
export function LogoMark({
  withWordmark = true,
  className,
  iconClassName,
}: LogoMarkProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "grid place-items-center rounded-xl bg-gradient-logo text-white shadow-sm",
          "size-8",
          className
        )}
      >
        <MessageSquareText className={cn("size-[60%]", iconClassName)} />
      </span>
      {withWordmark && (
        <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
          resumewriter.ai
        </span>
      )}
    </span>
  );
}
