-- Definir ike@gmail.com como operator
UPDATE profiles
SET role = 'operator'
WHERE email = 'ike@gmail.com';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"operator"')
WHERE email = 'ike@gmail.com';
