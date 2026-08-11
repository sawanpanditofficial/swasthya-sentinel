import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  Allergy,
  EmergencyContact,
  MedicalCondition,
  Medication,
  Surgery,
} from "@/lib/health/shadow-types";

const SEVERITIES = ["mild", "moderate", "severe"] as const;

interface ListProps {
  busy?: boolean | undefined;
  onDelete: (table: never, id: string) => Promise<void>;
}

/* ---------------- Allergies ---------------- */

export function AllergyList({
  items,
  onAdd,
  onDelete,
  busy,
}: {
  items: Allergy[];
  onAdd: (row: { substance: string; severity: string; reaction: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean | undefined;
}) {
  const [substance, setSubstance] = useState("");
  const [severity, setSeverity] = useState<string>("moderate");
  const [reaction, setReaction] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allergies · एलर्जी</CardTitle>
        <CardDescription>
          Severe allergies are shown first on the emergency card, because they change what is safe to
          give.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Rows
          items={items.map((a) => ({
            id: a.id,
            primary: a.substance,
            secondary: [a.severity, a.reaction].filter(Boolean).join(" · "),
            severe: a.severity === "severe",
          }))}
          empty="No allergies recorded."
          onDelete={onDelete}
          busy={busy}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-end">
          <Field label="Substance" value={substance} onChange={setSubstance} placeholder="Penicillin" />
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Reaction" value={reaction} onChange={setReaction} placeholder="Rash, swelling" />
          <Button
            disabled={busy || substance.trim().length === 0}
            onClick={async () => {
              await onAdd({
                substance: substance.trim(),
                severity,
                reaction: reaction.trim() || null,
              });
              setSubstance("");
              setReaction("");
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Conditions ---------------- */

export function ConditionList({
  items,
  onAdd,
  onDelete,
  busy,
}: {
  items: MedicalCondition[];
  onAdd: (row: { name: string; severity: string; notes: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean | undefined;
}) {
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState<string>("moderate");
  const [notes, setNotes] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conditions on record · बीमारियाँ</CardTitle>
        <CardDescription>
          What has already been recorded for this person. Nothing here is decided by the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Rows
          items={items.map((c) => ({
            id: c.id,
            primary: c.name,
            secondary: [c.severity, c.notes].filter(Boolean).join(" · "),
            severe: c.severity === "severe",
          }))}
          empty="No conditions recorded."
          onDelete={onDelete}
          busy={busy}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-end">
          <Field label="Condition" value={name} onChange={setName} placeholder="Asthma" />
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Note" value={notes} onChange={setNotes} placeholder="Since 2019" />
          <Button
            disabled={busy || name.trim().length === 0}
            onClick={async () => {
              await onAdd({ name: name.trim(), severity, notes: notes.trim() || null });
              setName("");
              setNotes("");
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Medicines ---------------- */

export function MedicationList({
  items,
  onAdd,
  onToggleActive,
  onDelete,
  busy,
}: {
  items: Medication[];
  onAdd: (row: { name: string; dosage: string | null; frequency: string | null }) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean | undefined;
}) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medicines · दवाइयाँ</CardTitle>
        <CardDescription>Turn a medicine off when it has been stopped.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medicines recorded.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[m.dosage, m.frequency].filter(Boolean).join(" · ") || "No dose recorded"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={m.active}
                      disabled={busy}
                      onCheckedChange={(v) => void onToggleActive(m.id, v)}
                    />
                    Taking now
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Remove ${m.name}`}
                    onClick={() => void onDelete(m.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field label="Medicine" value={name} onChange={setName} placeholder="Metformin" />
          <Field label="Dose" value={dosage} onChange={setDosage} placeholder="500 mg" />
          <Field label="How often" value={frequency} onChange={setFrequency} placeholder="Twice a day" />
          <Button
            disabled={busy || name.trim().length === 0}
            onClick={async () => {
              await onAdd({
                name: name.trim(),
                dosage: dosage.trim() || null,
                frequency: frequency.trim() || null,
              });
              setName("");
              setDosage("");
              setFrequency("");
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Surgeries ---------------- */

export function SurgeryList({
  items,
  onAdd,
  onDelete,
  busy,
}: {
  items: Surgery[];
  onAdd: (row: { procedure: string; performed_on: string | null; hospital: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean | undefined;
}) {
  const [procedure, setProcedure] = useState("");
  const [performedOn, setPerformedOn] = useState("");
  const [hospital, setHospital] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Past surgeries · पिछली सर्जरी</CardTitle>
        <CardDescription>Helpful for a treating team that has never met this person.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Rows
          items={items.map((s) => ({
            id: s.id,
            primary: s.procedure,
            secondary: [s.performed_on, s.hospital].filter(Boolean).join(" · "),
            severe: false,
          }))}
          empty="No surgeries recorded."
          onDelete={onDelete}
          busy={busy}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_1fr_auto] sm:items-end">
          <Field label="Procedure" value={procedure} onChange={setProcedure} placeholder="Appendectomy" />
          <div className="space-y-1.5">
            <Label htmlFor="surgery-date">Date</Label>
            <Input
              id="surgery-date"
              type="date"
              value={performedOn}
              onChange={(e) => setPerformedOn(e.target.value)}
            />
          </div>
          <Field label="Hospital" value={hospital} onChange={setHospital} placeholder="District hospital" />
          <Button
            disabled={busy || procedure.trim().length === 0}
            onClick={async () => {
              await onAdd({
                procedure: procedure.trim(),
                performed_on: performedOn || null,
                hospital: hospital.trim() || null,
              });
              setProcedure("");
              setPerformedOn("");
              setHospital("");
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Emergency contacts ---------------- */

export function ContactList({
  items,
  onAdd,
  onDelete,
  busy,
}: {
  items: EmergencyContact[];
  onAdd: (row: { name: string; relationship: string | null; phone: string; priority: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean | undefined;
}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");

  const valid = name.trim().length > 0 && /^[+\d][\d\s-]{7,17}$/.test(phone.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency contacts · आपातकालीन संपर्क</CardTitle>
        <CardDescription>
          Shown as one-tap call buttons on the emergency card, in this order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Rows
          items={items.map((c) => ({
            id: c.id,
            primary: `${c.priority}. ${c.name}`,
            secondary: [c.relationship, c.phone].filter(Boolean).join(" · "),
            severe: false,
          }))}
          empty="No contacts recorded."
          onDelete={onDelete}
          busy={busy}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field label="Name" value={name} onChange={setName} placeholder="Sunita Devi" />
          <Field label="Relationship" value={relationship} onChange={setRelationship} placeholder="Sister" />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
          <Button
            disabled={busy || !valid}
            onClick={async () => {
              await onAdd({
                name: name.trim(),
                relationship: relationship.trim() || null,
                phone: phone.trim(),
                priority: items.length + 1,
              });
              setName("");
              setRelationship("");
              setPhone("");
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- shared bits ---------------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        maxLength={120}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Rows({
  items,
  empty,
  onDelete,
  busy,
}: {
  items: { id: string; primary: string; secondary: string; severe: boolean }[];
  empty: string;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean | undefined;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
        >
          <div className="min-w-0">
            <p className={`truncate ${item.severe ? "font-semibold text-critical" : "font-medium"}`}>
              {item.primary}
            </p>
            {item.secondary && (
              <p className="text-xs text-muted-foreground capitalize">{item.secondary}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            aria-label={`Remove ${item.primary}`}
            onClick={() => void onDelete(item.id)}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}

export type { ListProps };
