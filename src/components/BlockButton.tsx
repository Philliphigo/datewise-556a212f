import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Ban, Loader2 } from "lucide-react";

interface BlockButtonProps {
  blockedUserId: string;
  blockedUserName: string;
  onBlock?: () => void;
}

export const BlockButton = ({ blockedUserId, blockedUserName, onBlock }: BlockButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    if (!user) return;

    setBlocking(true);
    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
      });

      if (error) throw error;

      toast({
        title: "User Blocked",
        description: `You have blocked ${blockedUserName}. You won't see each other anymore.`,
      });

      onBlock?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBlocking(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-left hover:bg-accent/50"
          disabled={blocking}
        >
          {blocking ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Ban className="w-4 h-4 mr-2" />
          )}
          Block
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-card">
        <AlertDialogHeader>
          <AlertDialogTitle>Block {blockedUserName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This user will no longer be able to see your profile or contact you. This action can be
            undone from Settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="glass">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBlock}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Block User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
