-- The private schema is not exposed by the Data API. Authenticated callers need
-- only these exact privileges so public SECURITY INVOKER wrappers and RLS can use them.
grant usage on schema private to authenticated;
grant execute on function private.current_user_is_admin() to authenticated;
grant execute on function private.current_coach_id() to authenticated;
grant execute on function private.book_private_class(uuid,timestamptz,text) to authenticated;
grant execute on function private.cancel_private_class(uuid) to authenticated;
grant execute on function private.reschedule_private_class(uuid,timestamptz,boolean) to authenticated;
grant execute on function private.set_private_class_zoom(uuid,text) to authenticated;
grant execute on function private.private_class_join_url(uuid) to authenticated;
grant execute on function private.record_private_class_attendance(uuid,boolean) to authenticated;
grant execute on function private.submit_private_class_review(uuid,smallint,text) to authenticated;
grant execute on function private.set_private_class_availability(date,time,boolean,text) to authenticated;
grant execute on function private.private_class_rating_summary(uuid) to authenticated;
