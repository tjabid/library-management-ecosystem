"use client";

import { useState, useEffect, useCallback } from "react";
import { getSettings } from "@/lib/actions/settings";
import type { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getSettings();
      setSettings(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Falls back to defaults if settings row hasn't been seeded yet
  const effective: Settings = settings ?? {
    id: 1,
    loanPeriodDays: DEFAULT_SETTINGS.loanPeriodDays,
    maxBooksPerMember: DEFAULT_SETTINGS.maxBooksPerMember,
    finePerDayFils: DEFAULT_SETTINGS.finePerDayFils,
    updatedAt: new Date(),
    updatedBy: "defaults",
  };

  return { settings: effective, loading, rawSettings: settings, refresh: fetch };
}
