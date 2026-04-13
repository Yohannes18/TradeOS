create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ai_verdict') then
    create type public.ai_verdict as enum ('AUTHORIZED', 'INVALID', 'STANDBY');
  end if;

  if not exists (select 1 from pg_type where typname = 'pre_trade_status') then
    create type public.pre_trade_status as enum ('draft', 'validated', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'execution_status') then
    create type public.execution_status as enum ('executed', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'journal_emotion') then
    create type public.journal_emotion as enum (
      'calm',
      'confident',
      'disciplined',
      'anxious',
      'fearful',
      'greedy',
      'impatient',
      'revenge'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'journal_mistake') then
    create type public.journal_mistake as enum (
      'late_entry',
      'early_exit',
      'moved_stop',
      'overrisked',
      'ignored_plan',
      'forced_trade',
      'news_trade',
      'fomo'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'trade_outcome') then
    create type public.trade_outcome as enum ('win', 'loss', 'breakeven');
  end if;
end $$;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.pre_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair text not null,
  entry numeric(18, 8) not null check (entry > 0),
  stop_loss numeric(18, 8) not null check (stop_loss > 0),
  take_profit numeric(18, 8) not null check (take_profit > 0),
  risk_percent numeric(8, 4) not null check (risk_percent > 0 and risk_percent <= 10),
  checklist jsonb not null default '{}'::jsonb,
  checklist_score numeric(6, 4) not null check (checklist_score >= 0 and checklist_score <= 1),
  ai_verdict public.ai_verdict not null,
  ai_score numeric(6, 4) not null check (ai_score >= 0 and ai_score <= 1),
  macro_score numeric(6, 4) not null check (macro_score >= 0 and macro_score <= 1),
  final_score numeric(6, 4) not null check (final_score >= 0 and final_score <= 1),
  status public.pre_trade_status not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pre_trades_locked_formula check (
    final_score = round(((checklist_score * 0.5) + (ai_score * 0.3) + (macro_score * 0.2))::numeric, 4)
  ),
  constraint pre_trades_status_matches_score check (
    (final_score >= 0.7 and status = 'validated')
    or
    (final_score < 0.7 and status = 'rejected')
  ),
  constraint pre_trades_distinct_levels check (entry <> stop_loss and entry <> take_profit)
);

create table if not exists public.executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pre_trade_id uuid not null references public.pre_trades(id) on delete restrict,
  entry numeric(18, 8) not null check (entry > 0),
  stop_loss numeric(18, 8) not null check (stop_loss > 0),
  take_profit numeric(18, 8) not null check (take_profit > 0),
  risk_percent numeric(8, 4) not null check (risk_percent > 0 and risk_percent <= 10),
  position_size numeric(20, 8) not null check (position_size > 0),
  close_price numeric(18, 8),
  status public.execution_status not null default 'executed',
  executed_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint executions_close_state check (
    (status = 'executed' and closed_at is null and close_price is null)
    or
    (status = 'closed' and closed_at is not null and close_price is not null)
  )
);

create unique index if not exists executions_pre_trade_id_unique on public.executions(pre_trade_id);
create unique index if not exists pre_trades_user_id_id_unique on public.pre_trades(user_id, id);
create unique index if not exists executions_user_id_id_unique on public.executions(user_id, id);

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null unique references public.executions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emotions public.journal_emotion[] not null default '{}',
  mistakes public.journal_mistake[] not null default '{}',
  adherence_score numeric(6, 4) not null check (adherence_score >= 0 and adherence_score <= 1),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trade_metrics (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null unique references public.executions(id) on delete cascade,
  rr_ratio numeric(12, 4) not null,
  pnl numeric(18, 2) not null,
  win_loss public.trade_outcome not null,
  computed_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'executions_pre_trade_owner_fk'
      and conrelid = 'public.executions'::regclass
  ) then
    alter table public.executions
      add constraint executions_pre_trade_owner_fk
      foreign key (user_id, pre_trade_id)
      references public.pre_trades(user_id, id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'journals_execution_owner_fk'
      and conrelid = 'public.journals'::regclass
  ) then
    alter table public.journals
      add constraint journals_execution_owner_fk
      foreign key (user_id, execution_id)
      references public.executions(user_id, id)
      on delete cascade
      not valid;
  end if;

end $$;

create index if not exists idx_pre_trades_user_created_at on public.pre_trades(user_id, created_at desc);
create index if not exists idx_pre_trades_status on public.pre_trades(user_id, status);
create index if not exists idx_executions_user_status on public.executions(user_id, status, executed_at desc);
create index if not exists idx_journals_user_created_at on public.journals(user_id, created_at desc);
create index if not exists idx_trade_metrics_execution on public.trade_metrics(execution_id, computed_at desc);

create or replace function public.enforce_execution_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.entry is distinct from new.entry
    or old.stop_loss is distinct from new.stop_loss
    or old.take_profit is distinct from new.take_profit
    or old.risk_percent is distinct from new.risk_percent
    or old.position_size is distinct from new.position_size
    or old.pre_trade_id is distinct from new.pre_trade_id
    or old.user_id is distinct from new.user_id then
    raise exception 'Execution values are immutable after insert';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_execution_source()
returns trigger
language plpgsql
as $$
declare
  source_trade public.pre_trades;
begin
  select *
  into source_trade
  from public.pre_trades
  where id = new.pre_trade_id;

  if source_trade.id is null then
    raise exception 'Execution requires a pre-trade.';
  end if;

  if source_trade.user_id <> new.user_id then
    raise exception 'Execution ownership mismatch.';
  end if;

  if source_trade.status <> 'validated' then
    raise exception 'Execution requires a validated pre-trade.';
  end if;

  if new.entry <> source_trade.entry
    or new.stop_loss <> source_trade.stop_loss
    or new.take_profit <> source_trade.take_profit
    or new.risk_percent <> source_trade.risk_percent then
    raise exception 'Execution values must match the locked pre-trade.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_journal_ownership()
returns trigger
language plpgsql
as $$
declare
  source_execution public.executions;
begin
  select *
  into source_execution
  from public.executions
  where id = new.execution_id;

  if source_execution.id is null then
    raise exception 'Journal requires an execution.';
  end if;

  if source_execution.user_id <> new.user_id then
    raise exception 'Journal ownership mismatch.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_metrics_ownership()
returns trigger
language plpgsql
as $$
declare
  source_execution public.executions;
begin
  select *
  into source_execution
  from public.executions
  where id = new.execution_id;

  if source_execution.id is null then
    raise exception 'Trade metrics require an execution.';
  end if;

  if source_execution.status <> 'closed' then
    raise exception 'Trade metrics can only be stored for closed executions.';
  end if;

  return new;
end;
$$;

create or replace function public.close_execution_and_store_metrics(
  p_execution_id uuid,
  p_user_id uuid,
  p_close_price numeric,
  p_pnl numeric,
  p_rr_ratio numeric,
  p_win_loss public.trade_outcome
)
returns void
language plpgsql
as $$
declare
  updated_count integer;
begin
  update public.executions
  set
    close_price = p_close_price,
    status = 'closed',
    closed_at = timezone('utc', now())
  where id = p_execution_id
    and user_id = p_user_id
    and status = 'executed';

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'Execution could not be closed.';
  end if;

  insert into public.trade_metrics (execution_id, pnl, rr_ratio, win_loss)
  values (p_execution_id, p_pnl, p_rr_ratio, p_win_loss)
  on conflict (execution_id)
  do update set
    pnl = excluded.pnl,
    rr_ratio = excluded.rr_ratio,
    win_loss = excluded.win_loss,
    computed_at = timezone('utc', now());
end;
$$;

create or replace function public.get_trading_analytics_overview(p_user_id uuid)
returns table (
  open_executions integer,
  closed_executions integer,
  journals_completed integer,
  win_rate numeric,
  net_pnl numeric,
  average_rr numeric,
  average_adherence numeric
)
language sql
as $$
  with user_executions as (
    select id, status
    from public.executions
    where user_id = p_user_id
  ),
  metrics as (
    select tm.pnl, tm.rr_ratio, tm.win_loss
    from public.trade_metrics tm
    join user_executions ue on ue.id = tm.execution_id
  ),
  journal_stats as (
    select
      count(*)::integer as journals_completed,
      coalesce(avg(adherence_score), 0)::numeric as average_adherence
    from public.journals
    where user_id = p_user_id
  )
  select
    (select count(*)::integer from user_executions where status = 'executed') as open_executions,
    (select count(*)::integer from metrics) as closed_executions,
    journal_stats.journals_completed,
    coalesce((select avg(case when win_loss = 'win' then 1.0 else 0.0 end) from metrics), 0)::numeric as win_rate,
    coalesce((select sum(pnl) from metrics), 0)::numeric as net_pnl,
    coalesce((select avg(rr_ratio) from metrics), 0)::numeric as average_rr,
    journal_stats.average_adherence
  from journal_stats;
$$;

drop trigger if exists trg_pre_trades_updated_at on public.pre_trades;
create trigger trg_pre_trades_updated_at
before update on public.pre_trades
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_executions_updated_at on public.executions;
create trigger trg_executions_updated_at
before update on public.executions
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_executions_enforce_source on public.executions;
create trigger trg_executions_enforce_source
before insert on public.executions
for each row
execute function public.enforce_execution_source();

drop trigger if exists trg_executions_immutable on public.executions;
create trigger trg_executions_immutable
before update on public.executions
for each row
execute function public.enforce_execution_immutability();

drop trigger if exists trg_journals_enforce_ownership on public.journals;
create trigger trg_journals_enforce_ownership
before insert or update on public.journals
for each row
execute function public.enforce_journal_ownership();

drop trigger if exists trg_trade_metrics_enforce_ownership on public.trade_metrics;
create trigger trg_trade_metrics_enforce_ownership
before insert or update on public.trade_metrics
for each row
execute function public.enforce_metrics_ownership();

alter table public.pre_trades enable row level security;
alter table public.executions enable row level security;
alter table public.journals enable row level security;
alter table public.trade_metrics enable row level security;

drop policy if exists "pre_trades_select_own" on public.pre_trades;
drop policy if exists "pre_trades_insert_own" on public.pre_trades;
drop policy if exists "pre_trades_update_own" on public.pre_trades;
create policy "pre_trades_select_own" on public.pre_trades for select using (auth.uid() = user_id);

drop policy if exists "executions_select_own" on public.executions;
drop policy if exists "executions_insert_own" on public.executions;
drop policy if exists "executions_update_own" on public.executions;
create policy "executions_select_own" on public.executions for select using (auth.uid() = user_id);

drop policy if exists "journals_select_own" on public.journals;
drop policy if exists "journals_insert_own" on public.journals;
drop policy if exists "journals_update_own" on public.journals;
create policy "journals_select_own" on public.journals for select using (auth.uid() = user_id);

drop policy if exists "trade_metrics_select_own" on public.trade_metrics;
create policy "trade_metrics_select_own"
on public.trade_metrics
for select
using (
  exists (
    select 1
    from public.executions e
    where e.id = trade_metrics.execution_id
      and e.user_id = auth.uid()
  )
);
