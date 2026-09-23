-- Run once in Supabase → SQL Editor to update the shop's saved contact
-- numbers (the WhatsApp buttons read this row, not the code).
update public.site_settings
set whatsapp_number = '94725544428',
    phone           = '+94 72 554 4428';

select whatsapp_number, phone from public.site_settings;
