import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const automations = await (prisma as any).customAutomation.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, automations });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, triggerEventType, gallaboxTemplateName, variableMappings, isActive } = body;

        if (!name || !triggerEventType || !gallaboxTemplateName) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const newAutomation = await (prisma as any).customAutomation.create({
            data: {
                name,
                triggerEventType,
                gallaboxTemplateName,
                variableMappings: JSON.stringify(variableMappings || []),
                isActive: isActive !== undefined ? isActive : true
            }
        });

        return NextResponse.json({ success: true, automation: newAutomation });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
        }

        await (prisma as any).customAutomation.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, isActive } = body;

        if (!id || isActive === undefined) {
            return NextResponse.json({ success: false, error: 'Missing ID or isActive payload' }, { status: 400 });
        }

        const updated = await (prisma as any).customAutomation.update({
            where: { id },
            data: { isActive }
        });

        return NextResponse.json({ success: true, automation: updated });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, triggerEventType, gallaboxTemplateName, variableMappings, isActive } = body;

        if (!id || !name || !triggerEventType || !gallaboxTemplateName) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const dataToUpdate: any = {
            name,
            triggerEventType,
            gallaboxTemplateName,
            variableMappings: JSON.stringify(variableMappings || [])
        };

        if (isActive !== undefined) {
            dataToUpdate.isActive = isActive;
        }

        const updated = await (prisma as any).customAutomation.update({
            where: { id },
            data: dataToUpdate
        });

        return NextResponse.json({ success: true, automation: updated });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
