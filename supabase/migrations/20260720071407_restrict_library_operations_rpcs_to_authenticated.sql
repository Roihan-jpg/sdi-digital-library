-- SECURITY DEFINER functions are denied to PUBLIC/anon and exposed only to the
-- authenticated role (plus service_role for the maintenance command).

revoke execute on function public.lookup_member_by_card(text) from public, anon;
grant execute on function public.lookup_member_by_card(text) to authenticated;

revoke execute on function public.lookup_book_copy_by_code(text) from public, anon;
grant execute on function public.lookup_book_copy_by_code(text) to authenticated;

revoke execute on function public.approve_reservation(uuid, text) from public, anon;
grant execute on function public.approve_reservation(uuid, text) to authenticated;

revoke execute on function public.reject_reservation(uuid, text) from public, anon;
grant execute on function public.reject_reservation(uuid, text) to authenticated;

revoke execute on function public.record_group_visit(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.record_group_visit(uuid, uuid, text, integer, text) to authenticated;

revoke execute on function public.get_loan_receipt(uuid) from public, anon;
grant execute on function public.get_loan_receipt(uuid) to authenticated;

revoke execute on function public.get_fine_payment_receipt(uuid) from public, anon;
grant execute on function public.get_fine_payment_receipt(uuid) to authenticated;

revoke execute on function public.run_library_maintenance() from public, anon;
grant execute on function public.run_library_maintenance() to authenticated, service_role;
