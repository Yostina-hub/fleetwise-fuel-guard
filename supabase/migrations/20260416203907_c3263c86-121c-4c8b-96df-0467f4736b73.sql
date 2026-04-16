-- Fire auto-PO and POR queueing triggers on INSERT too (for auto-approved WOs)
DROP TRIGGER IF EXISTS trigger_create_auto_po_from_work_order ON public.work_orders;
CREATE TRIGGER trigger_create_auto_po_from_work_order
AFTER INSERT OR UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.create_auto_po_from_work_order();

DROP TRIGGER IF EXISTS trg_queue_por_on_approval ON public.work_orders;
CREATE TRIGGER trg_queue_por_on_approval
BEFORE INSERT OR UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.queue_por_on_wo_approval();