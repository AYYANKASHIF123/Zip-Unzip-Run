import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { HeartPulse, ShieldAlert, ArrowRight } from "lucide-react";

const FHIR_MAPPING = [
  { field: "Sample ID", fhir: "Patient / Specimen identifier" },
  { field: "Predicted subtype", fhir: "Observation.valueCodeableConcept" },
  { field: "Confidence score", fhir: "Observation.component (numeric)" },
  { field: "Full report", fhir: "DiagnosticReport resource" },
  { field: "Model version", fhir: "DiagnosticReport.extension (custom)" },
];

export default function EhrIntegration() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={HeartPulse}
          title="EHR / FHIR Integration Preview"
          description="Preview of how classification results could map to FHIR-compliant clinical data structures."
          badges={[{ label: "Integration Preview", color: BADGE_COLORS.researchPreview }]}
        />
        <PrototypeBanner tone="warning" text="FHIR integration preview. Not connected to real EHR systems. No hospital, clinic, or patient data has ever been exchanged through this feature." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle>Proposed FHIR Resource Mapping</SectionTitle>
            <div className="space-y-1.5">
              {FHIR_MAPPING.map(m => (
                <div key={m.field} className="flex items-center gap-3 text-sm bg-secondary/30 rounded-md px-3 py-2">
                  <span className="font-medium w-40 shrink-0">{m.field}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground">{m.fhir}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-sm">Privacy & Clinical Validation Notice</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Any real EHR integration would require patient data privacy compliance (e.g. HIPAA/GDPR), clinical validation, and
              formal partnership with a healthcare provider before use with real patient records.
            </p>
            <Badge className={`${BADGE_COLORS.warning} border-0 mt-2`}>Clinical Validation Required</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
