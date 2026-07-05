import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarFooter } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useRole, type Role } from "@/lib/role-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import {
  Dna, LayoutDashboard, FileBarChart, Activity, DnaOff,
  Microscope, HeartPulse, FlaskConical, BookOpen, GitBranch,
  Cpu, FileText, Bell, Database, GitCompare,
  Sparkles, BarChart3, Network, Map, Settings, ClipboardList,
  Layers, Info, ShieldCheck, PlayCircle, ClipboardCheck, Rocket,
  Gauge, Users, Key, CreditCard, Building2, Share2, ShieldAlert,
  Smartphone, FileStack, Target, Scale, TrendingUp, Briefcase,
  MessageSquareHeart, Presentation, ChevronDown, Workflow, FlaskRound,
  Building,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Core Workflow",
    defaultOpen: true,
    items: [
      { href: "/",           label: "Dashboard",        icon: LayoutDashboard },
      { href: "/analyses",   label: "Analyses",         icon: FileBarChart    },
      { href: "/datasets",   label: "Datasets",         icon: Database        },
      { href: "/reports",    label: "Reports",          icon: FileText        },
      { href: "/notifications", label: "Notifications", icon: Bell           },
      { href: "/audit-logs", label: "Audit Logs",       icon: ClipboardList   },
    ],
  },
  {
    label: "ML & Research",
    defaultOpen: true,
    items: [
      { href: "/genomics",          label: "Genomics Explorer", icon: Microscope  },
      { href: "/survival",          label: "Survival Analysis", icon: HeartPulse  },
      { href: "/genes",             label: "Gene Library",      icon: BookOpen    },
      { href: "/biomarkers",        label: "Biomarkers",        icon: DnaOff      },
      { href: "/pathways",          label: "Pathway Analysis",  icon: GitBranch   },
      { href: "/drugs",             label: "Drug Sensitivity",  icon: FlaskConical },
      { href: "/comparison",        label: "Sample Comparison", icon: GitCompare   },
      { href: "/model-performance", label: "Model Performance", icon: Activity     },
      { href: "/model-comparison",  label: "Model Comparison",  icon: BarChart3   },
      { href: "/model-training",    label: "Model Training",    icon: PlayCircle  },
      { href: "/xai",               label: "Explainable AI",    icon: Sparkles    },
      { href: "/pipeline",          label: "Pipeline Monitor",  icon: Cpu         },
    ],
  },
  {
    label: "Startup & Admin",
    defaultOpen: false,
    items: [
      { href: "/overview",                label: "Project Overview",        icon: Info        },
      { href: "/roadmap",                 label: "Roadmap",                 icon: Map         },
      { href: "/architecture",            label: "Architecture",            icon: Layers      },
      { href: "/model-card",              label: "Model Card",              icon: ClipboardCheck },
      { href: "/startup-vision",          label: "Startup Vision",          icon: Rocket      },
      { href: "/success-readiness",       label: "Success Readiness",       icon: Gauge       },
      { href: "/workspaces",              label: "Workspaces",              icon: Users       },
      { href: "/api-access",              label: "API Access",              icon: Key         },
      { href: "/billing",                 label: "Billing & Plans",         icon: CreditCard  },
      { href: "/institutional-dashboard", label: "Institutional Dashboard", icon: Building2   },
      { href: "/dataset-integration",     label: "Dataset Integration",     icon: Workflow    },
      { href: "/market-validation",       label: "Market Validation",       icon: Target      },
      { href: "/pilot-program",           label: "Pilot Program",           icon: FlaskRound  },
      { href: "/competitive-analysis",    label: "Competitive Analysis",    icon: Scale       },
      { href: "/go-to-market",            label: "Go-To-Market",            icon: TrendingUp  },
      { href: "/business-case",           label: "Business Case",           icon: Briefcase   },
      { href: "/risk-mitigation",         label: "Risk & Mitigation",       icon: ShieldAlert },
      { href: "/feedback",                label: "Feedback",                icon: MessageSquareHeart },
      { href: "/case-studies",            label: "Case Studies",            icon: FileStack   },
      { href: "/investor-summary",        label: "Investor Summary",        icon: Presentation },
    ],
  },
  {
    label: "Advanced Research Preview",
    defaultOpen: false,
    items: [
      { href: "/multi-omics",           label: "Multi-Omics",            icon: Layers      },
      { href: "/validation-pipeline",   label: "Validation Pipeline",    icon: ClipboardCheck },
      { href: "/enterprise-deployment", label: "Enterprise Deployment",  icon: Building    },
      { href: "/gnn-preview",           label: "GNN Research Preview",  icon: Network     },
      { href: "/ppi-network",           label: "PPI Network",           icon: Share2      },
      { href: "/federated-learning",    label: "Federated Learning",    icon: Network     },
      { href: "/mobile-preview",        label: "Mobile Preview",        icon: Smartphone  },
      { href: "/ehr-integration",       label: "EHR / FHIR Integration",icon: HeartPulse   },
      { href: "/research-paper",        label: "Research Paper",        icon: FileText     },
    ],
  },
  {
    label: "Settings",
    defaultOpen: true,
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { role, setRole, user } = useRole();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map(g => [g.label, g.defaultOpen]))
  );

  const isActive = (href: string) =>
    href === "/"
      ? location === "/"
      : location === href || (href === "/analyses" && location.startsWith("/results"));

  const groupHasActiveItem = (group: typeof NAV_GROUPS[number]) =>
    group.items.some(item => isActive(item.href));

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <Sidebar className="border-r border-sidebar-border" variant="sidebar" collapsible="none">
      <SidebarContent>
        <div className="flex h-14 items-center px-4 font-bold text-lg gap-2 text-sidebar-primary-foreground border-b border-sidebar-border bg-sidebar shrink-0">
          <Dna className="h-6 w-6 text-sidebar-primary shrink-0" />
          <span className="truncate">GeneClassifier</span>
        </div>
        {NAV_GROUPS.map(group => {
          const isOpen = openGroups[group.label] || groupHasActiveItem(group);
          return (
            <SidebarGroup key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
              {isOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map(link => (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton asChild isActive={isActive(link.href)}>
                          <Link href={link.href} className="flex items-center gap-2">
                            <link.icon className="h-4 w-4 shrink-0" />
                            <span>{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 text-sidebar-primary flex items-center justify-center text-xs font-bold shrink-0">
            {user.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</div>
            <div className="text-[10px] text-sidebar-foreground/50 truncate">{user.department}</div>
          </div>
          <ShieldCheck className="w-3.5 h-3.5 text-sidebar-foreground/40 shrink-0" />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="h-7 text-xs bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="researcher">Researcher</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </SidebarProvider>
  );
}
