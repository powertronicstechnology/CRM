-- Merge spelling/case variants into one project type. Includes records in Trash.
BEGIN;
LOCK TABLE public.metadata IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE pm_surya_merge_records ON COMMIT DROP AS
SELECT id,financial_tag FROM public.admin
WHERE regexp_replace(lower(coalesce(project_type,'')), '[^a-z0-9]', '', 'g') IN ('pmsurya','pmsuryaghar','pmsuryagharr')
AND project_type IS DISTINCT FROM 'PM Surya Ghar';
UPDATE public.admin SET project_type='PM Surya Ghar'
WHERE id IN (SELECT id FROM pm_surya_merge_records);
-- Retain saved tags if the financial trigger assigned a default during the rename.
UPDATE public.admin a SET financial_tag=m.financial_tag FROM pm_surya_merge_records m
WHERE a.id=m.id AND a.financial_tag IS DISTINCT FROM m.financial_tag;
DELETE FROM public.metadata
WHERE category='project_type'
AND regexp_replace(lower(label), '[^a-z0-9]', '', 'g') IN ('pmsurya','pmsuryaghar','pmsuryagharr')
AND label<>'PM Surya Ghar';
INSERT INTO public.metadata(category,label)
SELECT 'project_type','PM Surya Ghar'
WHERE NOT EXISTS(SELECT 1 FROM public.metadata WHERE category='project_type' AND label='PM Surya Ghar');
COMMIT;
