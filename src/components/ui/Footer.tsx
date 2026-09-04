/**
 * openFDA disclaimer, on every page: this product surfaces openFDA label data, not a
 * pharmacist's or prescriber's judgment. Copy rule: never the phrase "medical advice".
 */
export function Footer() {
  return (
    <footer className="footer mt-10 border-t border-hair-strong bg-canvas-soft px-4 py-4 text-ink-mute sm:px-6">
      <p className="colhead normal-case text-[0.75rem] tracking-normal">
        Medication data drawn from openFDA drug label and recall APIs. openFDA does not endorse
        this product, and its data is not a substitute for a pharmacist or prescriber. Everything
        here is for discussion with a pharmacist.
      </p>
    </footer>
  );
}

export default Footer;
