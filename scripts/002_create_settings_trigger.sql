-- Auto-create settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.settings (user_id, risk_percent, account_balance)
  VALUES (NEW.id, 1.0, 10000.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;

-- Create trigger to auto-create settings on user signup
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();
