-- The waitlist sends nothing. The page itself confirms "you are on the list",
-- so a welcome email added cost and a daily sending cap (Resend's free plan
-- allows 100 a day) without telling anyone anything new. Addresses are only
-- stored; members are emailed once, when they are invited.
drop trigger if exists waitlist_welcome_mail on halal_mode_private.waitlist;
drop function if exists halal_mode_private.queue_waitlist_mail();
delete from halal_mode_private.mail_outbox where kind = 'waitlist_welcome' and sent_at is null;
