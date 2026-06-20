import { getDoctorMessages } from "@/actions/message.action";
import ChatRoom from "@/components/messages/chat-room"
import { getLoggedInUser } from "@/lib/get-user";
import { redirect } from "next/navigation";

const DoctorMessagesPage = async () => {
    const loggedInUser = await getLoggedInUser();

    if (!loggedInUser || loggedInUser.user.role !== 'DOCTOR') return redirect('/');

    const { data: conversation } = await getDoctorMessages(loggedInUser.user.id);

    const data = conversation?.map((c: any) => ({
        id: c.id,
        // The patient is the partner in this conversation
        partnerId: c.patientId,
        name: c.patient.name,
        avatar: c.patient.patientProfile?.imageUrl ?? c.patient.image ?? null,
        initials: c.patient.name.slice(0, 2).toUpperCase(),
        appointmentType: c.appointment?.appointmentType,
        appointmentStatus: c.appointment?.status,
        unread: c.messages.filter((m) => !m.isRead && m.senderId !== loggedInUser.user.id).length,
        lastMessage: c.messages[c.messages.length - 1]?.content ?? undefined,
        appointment: c.appointment ? {
            id: c.appointment.id,
            status: c.appointment.status,
            appointmentType: c.appointment.appointmentType,
            scheduledAt: c.appointment.scheduledAt.toISOString(),
        } : undefined,
        messages: c.messages.map((m) => ({
            id: m.id,
            conversationId: c.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            content: m.content,
            createdAt: m.createdAt,
            isRead: m.isRead,
        })),
    }));
    return (
        <div className='px-4 sm:px-6 py-4'>
            <ChatRoom data={data || []} userId={loggedInUser.user.id} userRole="DOCTOR" />
        </div>)
}

export default DoctorMessagesPage