import { SupportTicketThread } from "@/components/support/SupportTicketThread";

export default function SellerSupportTicketPage({ params }: { params: { id: string } }) {
  return <SupportTicketThread ticketId={params.id} basePath="/seller/support" />;
}
