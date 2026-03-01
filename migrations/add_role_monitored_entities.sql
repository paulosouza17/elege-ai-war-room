-- Add role column to monitored_entities
-- Roles: target (alvo principal), adversary (adversário), ally (aliado), neutral (outros)
ALTER TABLE monitored_entities
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'neutral'
CHECK (role IN ('target', 'adversary', 'ally', 'neutral'));

-- Update existing entities with their roles
UPDATE monitored_entities SET role = 'target'
WHERE name = 'Flavio Bolsonaro';

UPDATE monitored_entities SET role = 'adversary'
WHERE name IN ('Luiz Inácio Lula da Silva', 'GDF');

UPDATE monitored_entities SET role = 'ally'
WHERE name = 'Jair Bolsonaro';
