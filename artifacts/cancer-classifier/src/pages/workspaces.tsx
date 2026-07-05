import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Users, Building2, MessageSquare, UserPlus, Activity, FileText } from "lucide-react";

const WORKSPACES = [
  {
    name: "University Research Lab",
    institution: "Dept. of Bioinformatics",
    members: [
      { name: "Dr. A. Sharma", role: "Lab Manager" },
      { name: "J. Osei", role: "Researcher" },
      { name: "M. Tan", role: "Viewer" },
    ],
    analyses: 128,
    reports: 42,
    activity: "Uploaded LUAD cohort · 2 hours ago",
  },
  {
    name: "Oncology Genomics Team",
    institution: "Regional Cancer Research Centre",
    members: [
      { name: "Dr. R. Fischer", role: "Admin" },
      { name: "K. Idris", role: "Researcher" },
      { name: "S. Watanabe", role: "Researcher" },
      { name: "L. Novak", role: "Viewer" },
    ],
    analyses: 264,
    reports: 91,
    activity: "Reviewed BRCA batch analysis · 5 hours ago",
  },
  {
    name: "Demo Cancer Research Group",
    institution: "GeneClassifier Demo Environment",
    members: [
      { name: "Demo Admin", role: "Admin" },
      { name: "Demo Researcher", role: "Researcher" },
    ],
    analyses: 17,
    reports: 6,
    activity: "Created workspace · 1 day ago",
  },
];

const ANALYSIS_STATUS = [
  { label: "Review Pending", sample: "GBM-0042", assignee: "Dr. A. Sharma" },
  { label: "Reviewed", sample: "BRCA-0117", assignee: "J. Osei" },
  { label: "Archived", sample: "LUAD-0009", assignee: "K. Idris" },
];

export default function Workspaces() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Users}
          title="Team Workspaces"
          description="Collaborative spaces for labs and research teams to share analyses, reports, and review workflows."
          badges={[{ label: "Prototype", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text='Workspace membership, roles, and activity shown here are demo data illustrating the collaboration model. Real multi-tenant workspace persistence is planned for production.' />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {WORKSPACES.map(ws => (
            <Card key={ws.name} className="border-border/60">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">{ws.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ws.institution}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-secondary/40 rounded-md py-2">
                    <div className="text-lg font-bold">{ws.analyses}</div>
                    <div className="text-[10px] text-muted-foreground">Analyses</div>
                  </div>
                  <div className="bg-secondary/40 rounded-md py-2">
                    <div className="text-lg font-bold">{ws.reports}</div>
                    <div className="text-[10px] text-muted-foreground">Reports</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1">Members</div>
                  <div className="space-y-1">
                    {ws.members.map(m => (
                      <div key={m.name} className="flex justify-between text-xs">
                        <span>{m.name}</span>
                        <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" /> {ws.activity}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><MessageSquare className="w-4 h-4" /> Lab Collaboration Tools (Prototype)</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">
              Analyses can be commented on, assigned to team members, and tracked through a review lifecycle.
            </p>
            <div className="space-y-2">
              {ANALYSIS_STATUS.map(a => (
                <div key={a.sample} className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-2 text-xs">
                  <span className="font-mono">{a.sample}</span>
                  <span className="text-muted-foreground flex items-center gap-1"><UserPlus className="w-3 h-3" /> {a.assignee}</span>
                  <Badge className={
                    a.label === "Review Pending" ? BADGE_COLORS.warning
                    : a.label === "Reviewed" ? BADGE_COLORS.success
                    : BADGE_COLORS.planned
                  }>{a.label}</Badge>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <FileText className="w-3.5 h-3.5" /> Shared reports and @mention comments are simulated in this prototype view.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
