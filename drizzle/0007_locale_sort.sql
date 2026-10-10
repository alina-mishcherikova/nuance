-- Fixed ICU collations, never caller-provided SQL identifiers.
CREATE COLLATION nuance_en (provider=icu, locale='en', deterministic=true);
CREATE COLLATION nuance_uk (provider=icu, locale='uk', deterministic=true);
CREATE COLLATION nuance_fr (provider=icu, locale='fr', deterministic=true);
