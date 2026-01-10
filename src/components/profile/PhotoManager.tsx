import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, X, Loader2, Image as ImageIcon, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhotoManagerProps {
  userId: string;
  currentPhotos: string[];
  avatarUrl: string | null;
  onUpdate: () => void;
}

export const PhotoManager = ({ userId, currentPhotos, avatarUrl, onUpdate }: PhotoManagerProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const maxPhotos = 6;

  const allPhotos = currentPhotos.length > 0 
    ? currentPhotos 
    : (avatarUrl ? [avatarUrl] : []);

  const handleAddPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (allPhotos.length >= maxPhotos) {
      toast({
        title: "Maximum photos reached",
        description: `You can only upload up to ${maxPhotos} photos`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newPhotoUrl = data.publicUrl;

      const updatedPhotos = [...allPhotos, newPhotoUrl];

      const updateData: any = {
        photo_urls: updatedPhotos,
      };

      // Set avatar to first photo if not set
      if (!avatarUrl || updatedPhotos.length === 1) {
        updateData.avatar_url = updatedPhotos[0];
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) throw updateError;

      toast({
        title: "Photo added",
        description: "Your photo has been uploaded successfully",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (allPhotos.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "You must have at least one photo",
        variant: "destructive",
      });
      return;
    }

    setDeleting(photoUrl);
    try {
      const updatedPhotos = allPhotos.filter(p => p !== photoUrl);
      
      const updateData: any = {
        photo_urls: updatedPhotos,
      };

      // If removing the avatar, set new avatar to first photo
      if (photoUrl === avatarUrl) {
        updateData.avatar_url = updatedPhotos[0];
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Photo removed",
        description: "Your photo has been removed",
      });

      onUpdate();
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

  const handleSetAsMain = async (photoUrl: string) => {
    if (photoUrl === avatarUrl) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: photoUrl })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Main photo updated",
        description: "Your profile picture has been changed",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="liquid-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          My Photos
        </CardTitle>
        <CardDescription>
          Add up to {maxPhotos} photos to your profile. The first photo is your main profile picture.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {allPhotos.map((photo, index) => (
            <div 
              key={index} 
              className="relative aspect-square rounded-xl overflow-hidden group"
            >
              <img 
                src={photo} 
                alt={`Photo ${index + 1}`} 
                className="w-full h-full object-cover"
              />
              
              {/* Main photo indicator */}
              {photo === avatarUrl && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Main
                </div>
              )}
              
              {/* Always visible overlay for mobile - tap friendly */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col items-center justify-end gap-2 p-3 opacity-100 md:opacity-0 md:bg-black/50 md:from-transparent md:justify-center group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2 w-full justify-center">
                  {photo !== avatarUrl && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full text-xs px-4 py-2 h-auto touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAsMain(photo);
                      }}
                    >
                      Set Main
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-full px-4 py-2 h-auto touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto(photo);
                    }}
                    disabled={deleting === photo}
                  >
                    {deleting === photo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Add photo button - Large touch target for mobile */}
          {allPhotos.length < maxPhotos && (
            <label className="cursor-pointer touch-manipulation">
              <div className="aspect-square rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors">
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">Add Photo</span>
                    <span className="text-xs text-muted-foreground mt-0.5">Tap to upload</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddPhoto}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          {allPhotos.length}/{maxPhotos} photos
        </p>
      </CardContent>
    </Card>
  );
};
