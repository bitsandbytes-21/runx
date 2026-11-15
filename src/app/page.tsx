import { Suspense } from "react";
import { HomePage } from "@/components/HomePage";

export default function Page() {
  // Reads URL parameters, which are only known in the browser.
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
