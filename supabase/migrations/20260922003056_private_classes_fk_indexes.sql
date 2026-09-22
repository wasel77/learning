create index if not exists notification_email_outbox_notification_idx on public.notification_email_outbox(notification_id);
create index if not exists notification_email_outbox_user_idx on public.notification_email_outbox(user_id);
create index if not exists private_class_availability_creator_idx on public.private_class_availability(created_by);
create index if not exists private_class_booking_events_actor_idx on public.private_class_booking_events(actor_id);
create index if not exists private_class_bookings_attendance_actor_idx on public.private_class_bookings(attendance_recorded_by);
create index if not exists private_class_bookings_cancel_actor_idx on public.private_class_bookings(cancelled_by);
create index if not exists private_class_reviews_moderator_idx on public.private_class_reviews(moderated_by);
create index if not exists private_class_reviews_student_idx on public.private_class_reviews(student_id);
