-- Cover foreign keys reported by the live Supabase performance advisor.
create index checklist_step_reference on public.checklist(quest_id,step_id);
create index quest_progress_definition_reference on public.quest_progress(quest_id);
create index user_progress_active_owner_reference on public.user_progress(user_id,active_quest_id);
create index user_progress_active_definition_reference on public.user_progress(active_quest_id);
create index user_progress_goal_reference on public.user_progress(selected_goal_id);
