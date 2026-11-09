-- Iteration 5: one main product description + a separate story.
-- `summary` is the main description (shown on the product page and in search); `story` is the optional story
-- (idea, inspiration, process). The old long `description` used to be printed inside the story block.
-- It is folded into `summary` once, so no text is lost; the column stays for compatibility and is no longer written.
-- Same rules as src/lib/product-text.ts and the store migration v6 → v7. Apply after 20261116_iteration4.sql.
begin;

update products set summary = case
    when coalesce(trim(description), '') = '' or position(trim(description) in summary) > 0 then trim(summary)
    when coalesce(trim(summary), '') = '' or position(trim(summary) in description) > 0 then trim(description)
    else trim(summary) || E'\n\n' || trim(description)
  end
where coalesce(trim(description), '') <> '';

-- A story that only repeated the description (or the summary) is not a story; it is cleared, never filled from the description.
update products set story = '' where trim(story) <> '' and (trim(story) = trim(description) or trim(story) = trim(summary));

update products set description = '' where description <> '';
alter table products alter column description set default '';
comment on column products.summary is 'Main product description (one field).';
comment on column products.story is 'Optional story of the piece: idea, inspiration, process. Hidden when empty.';
comment on column products.description is 'Deprecated: folded into summary by 20261117_iteration5.sql.';

commit;
