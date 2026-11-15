import { Suspense } from "react";
import { RunPage } from "@/components/RunPage";

export default function Page() {
  // The run reads its options from the URL, which is only known in the browser.
  return (
    <Suspense>
      <RunPage />
    </Suspense>
  );
}
