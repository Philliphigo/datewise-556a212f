import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingCarousel } from "@/components/OnboardingCarousel";
import Onboarding from "./Onboarding";

const OnboardingWrapper = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCarousel, setShowCarousel] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_complete) {
        navigate("/discover");
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (showCarousel) {
    return <OnboardingCarousel onComplete={() => setShowCarousel(false)} />;
  }

  return <Onboarding />;
};

export default OnboardingWrapper;
