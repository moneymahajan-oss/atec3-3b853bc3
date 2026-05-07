DO $$
DECLARE
  admin_uid uuid;
  crm_uid uuid;
BEGIN
  -- ADMIN USER
  SELECT id INTO admin_uid FROM auth.users WHERE email='moneymahajan@gmail.com';
  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_uid, 'authenticated', 'authenticated',
      'moneymahajan@gmail.com', crypt('Manav@22441', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'moneymahajan@gmail.com', 'email_verified', true),
      'email', admin_uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt('Manav@22441', gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = admin_uid;
  END IF;

  INSERT INTO public.admin_users (user_id, email, role)
  VALUES (admin_uid, 'moneymahajan@gmail.com', 'super_admin'::admin_role)
  ON CONFLICT DO NOTHING;

  -- CRM USER
  SELECT id INTO crm_uid FROM auth.users WHERE email='crm@moneymahajan.com';
  IF crm_uid IS NULL THEN
    crm_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', crm_uid, 'authenticated', 'authenticated',
      'crm@moneymahajan.com', crypt('Manav@22441', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), crm_uid,
      jsonb_build_object('sub', crm_uid::text, 'email', 'crm@moneymahajan.com', 'email_verified', true),
      'email', crm_uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt('Manav@22441', gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = crm_uid;
  END IF;

  INSERT INTO public.crm_user_roles (user_id, role)
  VALUES (crm_uid, 'admin'::crm_role)
  ON CONFLICT DO NOTHING;
END $$;