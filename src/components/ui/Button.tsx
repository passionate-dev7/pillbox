import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "solid" | "outline" | "danger" | "accent";

/**
 * Round-card buttons: a rectangular plate with a hairline, no gradient, no shadow.
 * `primary` is ink; `accent` is the one clinical-teal button per screen. Press is a
 * 3% squeeze, nothing else moves.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-paper border-ink hover:bg-ink-soft hover:border-ink-soft",
  solid: "bg-ink text-paper border-ink hover:bg-ink-soft hover:border-ink-soft",
  outline:
    "bg-paper text-ink border-hair-strong hover:border-ink hover:bg-paper-sunk",
  danger:
    "bg-paper text-tier-out border-hair-strong hover:border-tier-out hover:bg-tier-out hover:text-paper",
  accent:
    "bg-accent text-paper border-accent hover:bg-accent-ink hover:border-accent-ink",
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
