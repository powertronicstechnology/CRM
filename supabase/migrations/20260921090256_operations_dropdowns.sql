-- Run once in Supabase SQL Editor. Existing customer values are never changed.
BEGIN;
-- Seed once; rerunning must not resurrect removed options.
INSERT INTO public.metadata(category,label)
SELECT seed.category, seed.label FROM (VALUES ('panel','ADANI'),
('panel','WAAREE'),
('panel','PAHAL'),
('panel','ADANI TOPCON'),
('panel','WAAREE TOPCON'),
('panel','PAHAL TOPCON'),
('inverter','SOLARYAAN'),
('inverter','KSOLARE'),
('inverter','GROWATT'),
('inverter','POLYCAB'),
('inverter','WAAREE'),
('inverter','YAAN'),
('meter_phase','S'),
('meter_phase','T'),
('meter_phase','T (EXTEN)'),
('payment_method','ONL'),
('payment_method','CHQ'),
('payment_method','DD'),
('payment_method','CASH'),
('project_type','General'),
('project_type','PM SURYA'),
('financial_tag_general','Initial'),
('financial_tag_general','Installation'),
('financial_tag_general','Final payment'),
('financial_tag_surya','Registration payment 20k'),
('financial_tag_surya','Installation payment'),
('financial_tag_surya','Quotation amount'),
('financial_tag_surya','Final payment after meter installation')) AS seed(category,label)
WHERE NOT EXISTS (SELECT 1 FROM public.metadata WHERE category='dropdown_config' AND label='initialized')
AND NOT EXISTS (SELECT 1 FROM public.metadata m WHERE m.category=seed.category AND lower(m.label)=lower(seed.label));
INSERT INTO public.metadata(category,label)
SELECT 'dropdown_config','initialized' WHERE NOT EXISTS (SELECT 1 FROM public.metadata WHERE category='dropdown_config' AND label='initialized');
-- Existing authenticated read and admin update/delete policies remain in effect.
-- Only admins manage shared choices, including their initialization marker.
DROP POLICY IF EXISTS metadata_insert ON public.metadata;
CREATE POLICY metadata_insert ON public.metadata FOR INSERT TO authenticated
WITH CHECK ((SELECT crm_private.current_role())='admin');
NOTIFY pgrst, 'reload schema';
COMMIT;
