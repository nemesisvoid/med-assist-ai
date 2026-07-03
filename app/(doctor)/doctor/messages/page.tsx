import { getDoctorMessages } from "@/actions/message.action";
import ChatRoom from "@/components/messages/chat-room";
import { getLoggedInUser } from "@/lib/get-user";
import { redirect } from "next/navigation";

const DoctorMessagesPage = async () => {
    const loggedInUser = await getLoggedInUser();

    if (!loggedInUser || loggedInUser.user.role !== 'DOCTOR') return redirect('/');

    const { data: conversations } = await getDoctorMessages(loggedInUser.user.id);

    const data = conversations?.map((c: any) => ({
        id: c.id,
        partnerId: c.patientId,
        name: c.patient.name,
        avatar: c.patient.patientProfile?.imageUrl ?? c.patient.image ?? null,
        initials: c.patient.name.slice(0, 2).toUpperCase(),
        // For sidebar display
        appointmentType: c.activeAppointment?.appointmentType,
        appointmentStatus: c.activeAppointment?.status,
        unread: c.messages.filter((m: any) => !m.isRead && m.senderId !== loggedInUser.user.id).length,
        lastMessage: c.messages[c.messages.length - 1]?.content ?? undefined,
        // Active appointment for the chat section banner & lock logic
        activeAppointment: c.activeAppointment ? {
            id: c.activeAppointment.id,
            status: c.activeAppointment.status,
            appointmentType: c.activeAppointment.appointmentType,
            scheduledAt: c.activeAppointment.scheduledAt.toISOString(),
        } : null,
        chatLocksAt: c.chatLocksAt ? new Date(c.chatLocksAt).toISOString() : null,
        messages: c.messages.map((m: any) => ({
            id: m.id,
            conversationId: c.id,
            appointmentId: m.appointmentId ?? null,
            appointment: m.appointment ? {
                id: m.appointment.id,
                status: m.appointment.status,
                appointmentType: m.appointment.appointmentType,
                scheduledAt: m.appointment.scheduledAt instanceof Date
                    ? m.appointment.scheduledAt.toISOString()
                    : m.appointment.scheduledAt,
            } : null,
            senderId: m.senderId,
            receiverId: m.receiverId,
            content: m.content,
            createdAt: m.createdAt,
            isRead: m.isRead,
            messageStatus: m.messageStatus ?? undefined,
        })),
    }));

    return (
        <div className='px-4 sm:px-6 py-4'>
            <ChatRoom data={data || []} userId={loggedInUser.user.id} userRole="DOCTOR" />
        </div>
    );
};

export default DoctorMessagesPage;