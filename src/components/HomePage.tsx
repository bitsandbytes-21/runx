"use client";

import { useRouter } from "next/navigation";
import { HomeScreen } from "./HomeScreen";
import { useNow } from "./hooks/use-now";

export function HomePage() {
  const router = useRouter();
  const now = useNow();
  return (
    <HomeScreen
      now={now}
      onStart={(durationMin) => router.push(`/run?min=${durationMin}`)}
    />
  );
}
