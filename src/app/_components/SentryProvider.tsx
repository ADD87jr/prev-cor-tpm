"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    
    if (dsn && !Sentry.getClient()) {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        debug: false,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        integrations: [
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
      });
    }
  }, []);

  return <>{children}</>;
}
