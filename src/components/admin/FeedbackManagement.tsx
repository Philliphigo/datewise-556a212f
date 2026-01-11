import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export interface ContactMessageRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

interface FeedbackManagementProps {
  messages: ContactMessageRow[];
  onRefresh: () => void;
  refreshing?: boolean;
}

export const FeedbackManagement = ({ messages, onRefresh, refreshing }: FeedbackManagementProps) => {
  return (
    <Card className="liquid-glass">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Feedback & Contact Messages</CardTitle>
          <CardDescription>Messages submitted via the Get in Touch form.</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No messages yet.</div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="p-4 rounded-xl border border-border/60">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{m.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      From <span className="text-foreground">{m.name}</span> • {m.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(m.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <a href={`mailto:${m.email}?subject=Re:%20${encodeURIComponent(m.subject)}`}>
                      <Mail className="w-4 h-4 mr-2" />
                      Reply
                    </a>
                  </Button>
                </div>
                <div className="mt-3 text-sm whitespace-pre-wrap">{m.message}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
