import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Heart, DollarSign, AlertCircle, Megaphone, FileCheck, Activity, MessageSquare } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalMatches: number;
  totalRevenue: number;
  pendingReports: number;
  totalPosts: number;
  totalMessages: number;
  activeUsers: number;
  pendingVerifications: number;
  broadcastsSent: number;
}

interface AdminStatsProps {
  stats: DashboardStats;
  onStatClick: (stat: string) => void;
}

export const AdminStats = ({ stats, onStatClick }: AdminStatsProps) => {
  const statItems = [
    { key: "users", label: "Total Users", value: stats.totalUsers, sub: `${stats.activeUsers} active`, icon: Users, color: "text-primary" },
    { key: "matches", label: "Total Matches", value: stats.totalMatches, icon: Heart, color: "text-destructive" },
    { key: "revenue", label: "Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-success" },
    { key: "reports", label: "Pending Reports", value: stats.pendingReports, icon: AlertCircle, color: "text-destructive" },
    { key: "verification", label: "Pending Verifications", value: stats.pendingVerifications, icon: FileCheck, color: "text-info" },
    { key: "broadcast", label: "Broadcasts Sent", value: stats.broadcastsSent, icon: Megaphone, color: "text-primary" },
    { key: "posts", label: "Total Posts", value: stats.totalPosts, icon: Activity, color: "text-accent" },
    { key: "messages", label: "Messages", value: stats.totalMessages, icon: MessageSquare, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card 
          key={item.key} 
          className="liquid-glass cursor-pointer hover:scale-[1.02] transition-all duration-300 group"
          onClick={() => onStatClick(item.key)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {item.label}
            </CardTitle>
            <item.icon className={`h-4 w-4 ${item.color} group-hover:scale-110 transition-transform`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            {item.sub && (
              <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
