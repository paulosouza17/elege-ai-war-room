-- Definir ike@gmail.com como analista
UPDATE profiles
SET role = 'analyst'
WHERE email = 'ike@gmail.com';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"analyst"')
WHERE email = 'ike@gmail.com';
