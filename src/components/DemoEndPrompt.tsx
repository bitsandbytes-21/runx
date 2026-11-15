import Link from "next/link";
import { GLASS_BUTTON, GLASS_CARD } from "./styles";

export function DemoEndPrompt({ canSignUp }: { canSignUp: boolean }) {
  return (
    <section className={`${GLASS_CARD} flex flex-col gap-3`}>
      <p className="text-footnote text-fg-2">
        That was the demo: time ran faster and your demo progress stays separate
        on this device.
      </p>
      {canSignUp && (
        <Link href="/login" className={GLASS_BUTTON}>
          Sign up to keep your place
        </Link>
      )}
    </section>
  );
}
