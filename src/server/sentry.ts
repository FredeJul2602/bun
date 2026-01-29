// ============================================
// Sentry Error Monitoring Configuration
// Import this file before any other code
// ============================================

import * as Sentry from "@sentry/bun";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
    ],
    
    // Filter out non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Don't send expected errors
      if (error instanceof Error) {
        if (error.message.includes("MCP_SERVER_PATH not set")) {
          return null;
        }
        if (error.message.includes("DATABASE_URL not set")) {
          return null;
        }
      }
      
      return event;
    },
  });
  
  console.log("[Sentry] Error monitoring initialized");
} else {
  console.log("[Sentry] SENTRY_DSN not set - error monitoring disabled");
}

export { Sentry };

// Helper to capture exceptions with context
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (dsn) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
  console.error("[Error]", error.message, context);
}

// Helper for async error handling
export function withErrorCapture<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  return fn().catch((error) => {
    captureError(error instanceof Error ? error : new Error(String(error)), context);
    throw error;
  });
}
