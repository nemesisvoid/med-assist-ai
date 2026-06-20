import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import { getPatientMessages } from '@/actions/message.action';
import ChatRoom from '@/components/messages/chat-room';

const PatientMessagePage = async () => {
    const loggedInUser = await getLoggedInUser();

    if (!loggedInUser || loggedInUser.user.role !== 'PATIENT') return redirect('/');

    const { data: conversation } = await getPatientMessages(loggedInUser.user.id);


    const data = conversation?.map((c: any) => ({
        id: c.id,
        // The doctor is the partner in this conversation
        partnerId: c.doctorId,
        name: c.doctor.name,
        avatar: c.doctor.doctorProfile?.imageUrl ?? c.doctor.image ?? null,
        initials: c.doctor.name.slice(0, 2).toUpperCase(),
        specialty: c.doctor.doctorProfile?.specialty,
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
            <ChatRoom data={data || []} userId={loggedInUser.user.id} userRole="PATIENT" />
        </div>
    );
};

export default PatientMessagePage;