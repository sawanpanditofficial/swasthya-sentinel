import { Eye, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWhen } from "@/lib/health/shadow";
import type { AccessLog } from "@/lib/health/shadow-types";

const ACTION_LABEL: Record<string, string> = {
  emergency_card_opened: "Emergency record opened",
  summary_generated: "Handover summary refreshed",
  document_read: "Medical paper read",
};

/** Who opened this person's emergency record, when, and how. */
export function AccessLogList({ logs }: { logs: AccessLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" aria-hidden />
          Who opened my record
        </CardTitle>
        <CardDescription>
          Every emergency scan and every signed-in lookup is written here. It cannot be edited or
          deleted, not even by you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody has opened your emergency record yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-lg border border-border px-3 py-2"
              >
                <Eye className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {ACTION_LABEL[log.action] ?? log.action.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(log.created_at)} ·{" "}
                    {log.via === "break_glass" ? "Emergency QR scan" : "Signed-in lookup"}
                    {log.actor_name ? ` · ${log.actor_name}` : ""}
                    {log.actor_org ? ` (${log.actor_org})` : ""}
                  </p>
                  {log.detail && <p className="text-xs text-muted-foreground">{log.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
