import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, Trash2, Eye, Megaphone, Loader2, Clock, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BroadcastManagementProps {
  broadcasts: any[];
  onRefresh: () => void;
}

export const BroadcastManagement = ({ broadcasts, onRefresh }: BroadcastManagementProps) => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-broadcast-email", {
        body: { message },
      });

      if (error) throw error;

      toast({
        title: "Broadcast Sent!",
        description: "Your message has been sent to all users",
      });
      setMessage("");
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.functions.invoke("manage-broadcast", {
        body: { action: "delete", id },
      });

      if (error) throw error;

      if (selectedBroadcast?.id === id) {
        setSelectedBroadcast(null);
        setShowViewDialog(false);
        setShowEditDialog(false);
      }

      toast({
        title: "Deleted",
        description: "Broadcast has been removed",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateBroadcast = async (id: string, content: string) => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase.functions.invoke("manage-broadcast", {
        body: { action: "update", id, content },
      });

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Broadcast updated successfully",
      });

      setShowEditDialog(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Send New Broadcast */}
      <Card className="liquid-glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Send New Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This message will appear in all users' Updates inbox and optionally send email notifications.
          </p>
          <Textarea
            placeholder="Type your broadcast message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] liquid-glass"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSendBroadcast}
              disabled={sending || !message.trim()}
              className="min-w-[140px]"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Broadcast
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Broadcast History */}
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Broadcast History
            <Badge variant="outline">{broadcasts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {broadcasts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No broadcasts sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{broadcast.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(broadcast.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedBroadcast(broadcast);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedBroadcast(broadcast);
                          setEditContent(broadcast.content || "");
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteBroadcast(broadcast.id)}
                        disabled={deleting === broadcast.id}
                      >
                        {deleting === broadcast.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Broadcast Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="liquid-glass">
          <DialogHeader>
            <DialogTitle>Broadcast Details</DialogTitle>
            <DialogDescription>
              {selectedBroadcast && format(new Date(selectedBroadcast.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          {selectedBroadcast && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="whitespace-pre-wrap">{selectedBroadcast.content}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditContent(selectedBroadcast.content || "");
                    setShowEditDialog(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteBroadcast(selectedBroadcast.id);
                    setShowViewDialog(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Broadcast Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="liquid-glass">
          <DialogHeader>
            <DialogTitle>Edit Broadcast</DialogTitle>
            <DialogDescription>Update the broadcast message (users will see the new text).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[140px] liquid-glass"
              placeholder="Edit your broadcast..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedBroadcast && handleUpdateBroadcast(selectedBroadcast.id, editContent)}
                disabled={savingEdit || !editContent.trim()}
              >
                {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
