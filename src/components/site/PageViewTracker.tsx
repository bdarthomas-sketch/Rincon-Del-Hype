import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function PageViewTracker() {
  useEffect(() => {
    trackEvent({
      event_type: "page_view",
      metadata: { page: window.location.pathname },
    });
  }, []);

  return null;
}
