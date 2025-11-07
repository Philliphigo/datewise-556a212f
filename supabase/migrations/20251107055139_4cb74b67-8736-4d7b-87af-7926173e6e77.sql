-- Add discovery_preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS discovery_preferences JSONB DEFAULT '{
  "ageMin": 18,
  "ageMax": 50,
  "distanceMin": 5,
  "distanceMax": 50,
  "location": "",
  "genderPreference": "all",
  "interests": []
}'::jsonb;