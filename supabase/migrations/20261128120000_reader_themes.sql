-- Reader themes: Dia, Pôr do Sol, Noite, Meia-Noite and the custom theme.
-- 'auto' stays accepted so installed copies that still send it keep syncing; new copies never send it.
alter table public.user_preferences drop constraint user_preferences_theme_check;
alter table public.user_preferences add constraint user_preferences_theme_check
  check (theme in ('auto', 'day', 'sunset', 'night', 'midnight', 'custom'));

-- The old Sépia preset was stored as a custom theme with fixed colors.
update public.user_preferences
set theme = 'sunset'
where theme = 'custom' and lower(custom_bg) = '#efdfc2' and lower(custom_ink) = '#39271c';
