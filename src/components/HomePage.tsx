"use client";

import { useRouter } from "next/navigation";
import { HomeScreen } from "./HomeScreen";
import { useNow } from "./hooks/use-now";
import { unlockAudio } from "@/lib/audio/audio-port";

export function HomePage() {
  const router = useRouter();
  const now = useNow();
  return (
    <HomeScreen
      now={now}
      onStart={(durationMin) => {
        // Inside the tap handler, so iOS allows the run's audio later.
        unlockAudio();
        router.push(`/run?min=${durationMin}`);
      }}
    />
  );
}
