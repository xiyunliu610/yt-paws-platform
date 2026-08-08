export type CareDetailsViewer = { id: string; role: string };
export type CareDetailsBooking = { customerId: string; assignedStaffId: string | null };

export function canViewCareDetails(
  user: CareDetailsViewer | null | undefined,
  booking: CareDetailsBooking,
): boolean {
  if (!user) return false;
  if (booking.customerId === user.id) return true;
  if (user.role === 'owner' || user.role === 'admin') return true;
  return user.role === 'staff' && booking.assignedStaffId === user.id;
}
