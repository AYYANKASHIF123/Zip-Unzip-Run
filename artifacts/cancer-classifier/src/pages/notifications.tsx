import { useQueryClient } from "@tanstack/react-query";
import { useListNotifications } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Info, Bell, BellOff } from "lucide-react";
import { format } from "date-fns";

const typeStyles: Record<string, { icon: React.ReactNode; border: string; bg: string; iconColor: string; label: string }> = {
  success: { icon: <CheckCircle2 className="w-4 h-4" />, border: "border-l-green-500", bg: "bg-green-50/50 dark:bg-green-950/20", iconColor: "text-green-500", label: "Success" },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, border: "border-l-amber-500",  bg: "bg-amber-50/50 dark:bg-amber-950/20", iconColor: "text-amber-500", label: "Warning" },
  error:   { icon: <XCircle className="w-4 h-4" />,      border: "border-l-red-500",   bg: "bg-red-50/50 dark:bg-red-950/20",     iconColor: "text-red-500",   label: "Error"   },
  info:    { icon: <Info className="w-4 h-4" />,          border: "border-l-blue-500",  bg: "bg-blue-50/50 dark:bg-blue-950/20",   iconColor: "text-blue-500",  label: "Info"    },
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, isFetching } = useListNotifications();
  const loading = isLoading || isFetching;

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

  const unread = notifications?.filter(n => !n.read).length ?? 0;

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Notifications"
          subtitle="System events, pipeline alerts, and analysis status updates."
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["success","warning","error","info"] as const).map(t => (
            <Card key={t} className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className={`text-2xl font-bold ${typeStyles[t].iconColor}`}>
                  {notifications?.filter(n => n.type === t).length ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground">{typeStyles[t].label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">All Notifications</CardTitle>
              {unread > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {unread}
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{notifications?.length ?? 0} total</span>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : notifications?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BellOff className="w-10 h-10 mb-3 opacity-30" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications?.map(n => {
                  const style = typeStyles[n.type] ?? typeStyles.info;
                  return (
                    <div key={n.id} className={`flex items-start gap-3 p-3.5 rounded-lg border-l-4 ${style.border} ${style.bg} ${!n.read ? "opacity-100" : "opacity-70"}`}>
                      <div className={`shrink-0 mt-0.5 ${style.iconColor}`}>{style.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm flex items-center gap-1.5">
                            {n.title}
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{format(new Date(n.createdAt), "MMM d, HH:mm")}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
