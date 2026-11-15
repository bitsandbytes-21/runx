import { Suspense } from "react";
import { ResumePage } from "@/components/ResumePage";

export default function Page() {
  // Reads URL parameters, which are only known in the browser.
  return (
    <Suspense>
      <ResumePage />
    </Suspense>
  );
}
