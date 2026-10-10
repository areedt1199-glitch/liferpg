"use client";
import { useEffect, useState } from "react";
import { controlRound, useProgress, progressNow } from "@/features/journey/progress-store";
import { focusView } from "./rules";

export function useFocusView(questId: string) {
  const { ready, progress, error } = useProgress();
  const focus = progress.focus[questId];
  const [now, setNow] = useState(0);
  useEffect(() => {
    let finishing = false;
    const refresh = () => {
      const time = progressNow();
      setNow(time);
      if (!error && focus.round.status === "running" && focusView(focus, time).status === "finished" && !finishing) {
        finishing = true;
        void controlRound(questId, "finish");
      }
    };
    refresh();
    const timer = focus.round.status === "running" ? window.setInterval(refresh, 1000) : null;
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      if (timer !== null) window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [focus, questId, error]);
  return { ready, error, focus, view: focusView(focus, now || focus.round.startedAt || 0) };
}
