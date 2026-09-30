import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/labels";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-soft text-muted-foreground border-border",
  accent: "bg-[#e6f4f1] text-[#0b6b61] border-[#c6e6e0]",
  warning: "bg-[#fdf3e2] text-[#8f5e13] border-[#f2dfba]",
  critical: "bg-[#fdeceb] text-[#96241c] border-[#f4d0cd]",
  info: "bg-[#eaf0fb] text-[#274c92] border-[#ccdaf3]",
  primary: "bg-primary text-primary-foreground border-primary",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold leading-none",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-70" /> : null}
      {children}
    </span>
  );
}
