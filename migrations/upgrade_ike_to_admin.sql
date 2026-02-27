-- Promover ike@gmail.com para admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'ike@gmail.com';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'
WHERE email = 'ike@gmail.com';
