import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoMarkProps {
  /** Show the "resume.co" wordmark next to the icon. */
  withWordmark?: boolean;
  /** Tailwind size class for the gradient icon tile, e.g. "size-8". */
  className?: string;
  iconClassName?: string;
}

/**
 * resume.co brand mark: a blue→teal gradient rounded tile with a speech-bubble
 * icon, optionally followed by the "resume.co" wordmark.
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
          resume.co
        </span>
      )}
    </span>
  );
}
