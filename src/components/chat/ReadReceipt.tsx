import { motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface ReadReceiptProps {
  isRead: boolean;
  readAt?: string | null;
  avatarUrl?: string | null;
  isOwn: boolean;
  showAvatar?: boolean;
}

export const ReadReceipt = ({ 
  isRead, 
  readAt, 
  avatarUrl, 
  isOwn,
  showAvatar = true 
}: ReadReceiptProps) => {
  if (!isOwn) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-end gap-1 mt-0.5"
    >
      {isRead ? (
        <div className="flex items-center gap-1">
          {showAvatar && avatarUrl && (
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              src={avatarUrl || defaultAvatar}
              alt="Seen by"
              className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-background"
            />
          )}
          <CheckCheck className="w-3.5 h-3.5 text-primary" />
        </div>
      ) : (
        <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/50" />
      )}
    </motion.div>
  );
};
