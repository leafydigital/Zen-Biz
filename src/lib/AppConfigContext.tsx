"use client";

import { createContext, useContext } from "react";
import { DEFAULT_APP_CONFIG, type AppConfig } from "@/lib/appConfigDefaults";

const Ctx = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function AppConfigProvider({ config, children }: { config: AppConfig; children: React.ReactNode }) {
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}

export function useAppConfig() {
  return useContext(Ctx);
}
