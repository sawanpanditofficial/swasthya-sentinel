import { auth, defineMcp } from "@lovable.dev/mcp-js";
import myHealthSummary from "./tools/my-health-summary";
import listHealthChecks from "./tools/list-checks";
import listPriorityPatients from "./tools/priority-queue";
import listAlerts from "./tools/list-alerts";
import listReferrals from "./tools/list-referrals";
import recordCaseReview from "./tools/record-case-review";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged and Vite inlines it at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "swasthyashadow",
  title: "SwasthyaShadow",
  version: "0.1.0",
  instructions:
    "Tools for SwasthyaShadow, a longitudinal baseline-monitoring prototype. Health Drift scores describe deviation from a person's own baseline and are non-clinical prototype signals — never state or imply a diagnosis. Use my_health_summary and list_health_checks for the signed-in person's own trends, list_priority_patients / list_alerts / list_referrals for community review queues within the caller's coverage, and record_case_review to log a reviewer decision.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    myHealthSummary,
    listHealthChecks,
    listPriorityPatients,
    listAlerts,
    listReferrals,
    recordCaseReview,
  ],
});
