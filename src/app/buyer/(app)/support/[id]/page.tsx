import { SupportTicketThread } from "@/components/support/SupportTicketThread";

export default function BuyerSupportTicketPage({ params }: { params: { id: string } }) {
  return <SupportTicketThread ticketId={params.id} basePath="/buyer/support" />;
}
