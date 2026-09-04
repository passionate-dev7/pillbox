/**
 * Rendered when a round page's `?k=` does not match either of the round's capability
 * keys (missing, mistyped, or guessed). No round data reaches this response: the
 * server resolves role from the key before any content is composed.
 */
export function InvalidLink() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[560px] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="colhead text-tier-out">Invalid Link</p>
      <h1 className="plate text-[1.5rem]">This Link Is Not Valid</h1>
      <p className="max-w-sm text-[0.875rem] leading-snug text-ink-mute">
        The key in this URL does not match either the caregiver or the pharmacist link for this
        round. Use the exact URL you were given, not a guessed or edited one.
      </p>
    </div>
  );
}

export default InvalidLink;
