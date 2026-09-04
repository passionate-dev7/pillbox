import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "solid" | "outline" | "danger" | "accent";

/**
 * Round-card buttons: 8px radius, a hairline border, no gradient. `primary` is the one
 * emerald button per screen; `outline` is the ghost secondary. Press is a 3% squeeze,
 * nothing else moves.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary border-primary hover:bg-primary-deep hover:border-primary-deep",
  solid: "bg-ink text-on-dark border-ink hover:bg-ink-mute hover:border-ink-mute",
  outline:
    "bg-canvas text-ink border-hair-strong hover:border-ink hover:bg-canvas-soft",
  danger:
    "bg-canvas text-tier-out border-hair-strong hover:border-tier-out hover:bg-tier-out hover:text-on-dark",
  accent:
    "bg-primary text-on-primary border-primary hover:bg-primary-deep hover:border-primary-deep",
};

export function Button({
  variant = "outline",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-control border px-3.5 py-2 text-[0.8125rem] font-semibold tracking-[0.01em] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
    />
  );
}
