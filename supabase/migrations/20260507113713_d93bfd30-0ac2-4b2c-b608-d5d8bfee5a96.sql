-- Fix NULL token columns in auth.users that cause login failures
UPDATE auth.users
SET
  confirmation_token  = COALESCE(confirmation_token, ''),
  recovery_token      = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  phone_change_token  = COALESCE(phone_change_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR reauthentication_token IS NULL
   OR phone_change_token IS NULL;