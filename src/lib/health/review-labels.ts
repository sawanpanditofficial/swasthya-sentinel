import type { ReviewState } from "./types";

/** Plain-text review state labels, safe for PDF output (no JSX dependency). */
export const REVIEW_STATE_LABEL_TEXT: Record<ReviewState, string> = {
  open: "Awaiting review",
  reviewed: "Reviewed",
  escalated: "Escalated",
  closed: "Closed",
  reopened: "Reopened",
};
