/**
 * Rendered when a case page's `?k=` does not match either of the case's capability
 * keys (missing, mistyped, or guessed). No case data reaches this response: the
 * server resolves role from the key before any case content is composed.
 */
export function InvalidLink() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[560px] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="colhead text-tier-out">invalid link</p>
      <h1 className="plate text-[1.5rem]">This link is not valid</h1>
      <p className="max-w-sm text-[0.875rem] leading-snug text-ink-soft">
        The key in this URL does not match either the owner or the partner link for this case.
        Use the exact URL you were given, not a guessed or edited one.
      </p>
    </div>
  );
}

export default InvalidLink;
