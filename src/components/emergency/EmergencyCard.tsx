import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, Link2, Plus, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emergencyUrl, formatWhen } from "@/lib/health/shadow";
import type { EmergencyAccessToken, EmergencyProfile } from "@/lib/health/shadow-types";

/**
 * The person's emergency card: a scannable QR that opens their emergency record
 * without a login, plus the list of links they have issued and can revoke.
 */
export function EmergencyCard({
  profile,
  tokens,
  onCreate,
  onRevoke,
  busy,
}: {
  profile: EmergencyProfile;
  tokens: EmergencyAccessToken[];
  onCreate: (label: string, expiresInDays: number | null) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
  busy?: boolean;
}) {
  const active = useMemo(
    () =>
      tokens.find(
        (t) => !t.revoked && (!t.expires_at || new Date(t.expires_at).getTime() > Date.now()),
      ) ?? null,
    [tokens],
  );
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [label, setLabel] = useState("Wallet card");
  const [expiry, setExpiry] = useState("never");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = active && origin ? emergencyUrl(origin, active.token) : null;

  useEffect(() => {
    if (!url) {
      setQr(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(url, { width: 512, margin: 1, errorCorrectionLevel: "M" })
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency card · आपातकालीन कार्ड</CardTitle>
        <CardDescription>
          Anyone who scans this code can read your emergency record without signing in. Every scan is
          logged, and you can revoke a code at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/40 p-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex size-40 items-center justify-center rounded-xl border border-border bg-card">
            {qr ? (
              <img src={qr} alt="Emergency record QR code" className="size-36" />
            ) : (
              <p className="px-4 text-center text-xs text-muted-foreground">
                No active code yet — create one below.
              </p>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Emergency code
            </p>
            <p className="font-mono text-2xl font-semibold">{profile.emergency_code}</p>
            {url && (
              <p className="truncate text-xs text-muted-foreground" title={url}>
                {url}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {qr && (
                <Button asChild variant="outline" size="sm">
                  <a href={qr} download={`swasthyashadow-${profile.emergency_code}.png`}>
                    <Download className="size-4" aria-hidden />
                    Save QR
                  </a>
                </Button>
              )}
              {url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void navigator.clipboard?.writeText(url)}
                >
                  <Link2 className="size-4" aria-hidden />
                  Copy link
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="token-label">New code label</Label>
            <Input
              id="token-label"
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Wallet card, phone lock screen…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token-expiry">Valid for</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger id="token-expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">No expiry</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="180">6 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={busy || label.trim().length === 0}
            onClick={() =>
              void onCreate(label.trim(), expiry === "never" ? null : Number(expiry))
            }
          >
            <Plus className="size-4" aria-hidden />
            Create code
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Issued codes</p>
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No codes issued yet.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => {
                const expired = !!t.expires_at && new Date(t.expires_at).getTime() < Date.now();
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.label ?? "Emergency code"}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatWhen(t.created_at)} ·{" "}
                        {t.revoked
                          ? "Revoked"
                          : expired
                            ? "Expired"
                            : t.expires_at
                              ? `Valid until ${formatWhen(t.expires_at)}`
                              : "No expiry"}
                      </p>
                    </div>
                    {!t.revoked && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void onRevoke(t.id)}
                      >
                        <ShieldOff className="size-4" aria-hidden />
                        Revoke
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
