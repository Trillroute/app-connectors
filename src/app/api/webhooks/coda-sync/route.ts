import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const tableIdentifier = searchParams.get('table'); // '?table=student' or '?table=schedule'

    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!payload.codaRowId) {
        return NextResponse.json({ success: false, error: 'Missing codaRowId in payload' }, { status: 400 });
    }

    try {
        if (tableIdentifier === 'student') {
            // Upsert Student Master Record
            const student = await prisma.studentMaster.upsert({
                where: { codaRowId: payload.codaRowId },
                update: {
                    studentName: payload.studentName,
                    whatsappContact: payload.whatsappContact || null,
                    email: payload.email || null,
                    email2: payload.email2 || null,
                    phone2: payload.phone2 || null,
                    parentName: payload.parentName || null,
                    dateOfBirth: payload.dateOfBirth || null,
                },
                create: {
                    codaRowId: payload.codaRowId,
                    studentName: payload.studentName || 'Unknown Student',
                    whatsappContact: payload.whatsappContact || null,
                    email: payload.email || null,
                    email2: payload.email2 || null,
                    phone2: payload.phone2 || null,
                    parentName: payload.parentName || null,
                    dateOfBirth: payload.dateOfBirth || null,
                }
            });

            await prisma.webhookLog.create({
                data: {
                    source: 'coda-sync-student',
                    payload: JSON.stringify(payload, null, 2),
                    status: 'success',
                    action: `Synced Student: ${student.studentName}`
                }
            });

            return NextResponse.json({ success: true, message: 'Student synced successfully', id: student.id });

        } else if (tableIdentifier === 'schedule') {
            // First attempt to find the student ID dynamically using the Person name
            let studentId = null;
            if (payload.studentName) {
                const matchedStudent = await prisma.studentMaster.findFirst({
                    where: { studentName: payload.studentName }
                });
                if (matchedStudent) {
                    studentId = matchedStudent.id;
                }
            }

            // Upsert Schedule Event Record
            const schedule = await prisma.scheduleEvent.upsert({
                where: { codaRowId: payload.codaRowId },
                update: {
                    day: payload.day || null,
                    timeSlot: payload.timeSlot || null,
                    teacher: payload.teacher || null,
                    eventDate: payload.eventDate ? new Date(payload.eventDate) : null,
                    eventStatus: payload.eventStatus || null,
                    eventType: payload.eventType || null,
                    instrument: payload.instrument || null,
                    remark: payload.remark || null,
                    attendanceStatus: payload.attendanceStatus || null,
                    attendanceReport: payload.attendanceReport || null,
                    courseCode: payload.courseCode || null,
                    phoneTrial: payload.phoneTrial || null,
                    studentId: studentId // Update relationship mapping if name changed
                },
                create: {
                    codaRowId: payload.codaRowId,
                    day: payload.day || null,
                    timeSlot: payload.timeSlot || null,
                    teacher: payload.teacher || null,
                    eventDate: payload.eventDate ? new Date(payload.eventDate) : null,
                    eventStatus: payload.eventStatus || null,
                    eventType: payload.eventType || null,
                    instrument: payload.instrument || null,
                    remark: payload.remark || null,
                    attendanceStatus: payload.attendanceStatus || null,
                    attendanceReport: payload.attendanceReport || null,
                    courseCode: payload.courseCode || null,
                    phoneTrial: payload.phoneTrial || null,
                    studentId: studentId // Bind relationship right away!
                }
            });

            await prisma.webhookLog.create({
                data: {
                    source: 'coda-sync-schedule',
                    payload: JSON.stringify(payload, null, 2),
                    status: 'success',
                    action: `Synced Schedule: ${schedule.day} ${schedule.timeSlot}`
                }
            });

            return NextResponse.json({ success: true, message: 'Schedule event synced successfully', id: schedule.id });

        } else {
            return NextResponse.json({ success: false, error: 'Invalid or missing table identifier (?table=student|schedule)' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Coda Sync Webhook error:', error);

        // Log the failure in our standard DB tracking
        await prisma.webhookLog.create({
            data: {
                source: `coda-sync-error`,
                payload: JSON.stringify(payload, null, 2),
                status: 'failed',
                action: 'Failed Database Upsert',
                error: error.message
            }
        });

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
