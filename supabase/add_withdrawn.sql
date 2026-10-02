-- ============================================================================
-- انسحاب الكلانات: الكلان المنسحب بيختفي من الترتيب، ونتايجه القديمة تفضل.
-- Safe to run more than once.
-- ============================================================================

alter table clans add column if not exists withdrawn boolean not null default false;

-- حد الـ 10 كلانات بيحسب الكلانات النشطة بس (المنسحب مش بيتحسب)
create or replace function check_clan_limit() returns trigger as $$
begin
  if (select count(*) from clans
      where division_id = new.division_id and withdrawn = false) >= 10 then
    raise exception 'This division already has 10 clans (max reached).';
  end if;
  return new;
end;
$$ language plpgsql;

notify pgrst, 'reload schema';
