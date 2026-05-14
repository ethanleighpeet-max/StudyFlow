import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { db, users } from '@studyflow/db';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return Response.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json(
      { error: 'Missing svix headers' },
      { status: 400 },
    );
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return Response.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  switch (evt.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses[0]?.email_address;

      if (primaryEmail) {
        await db.insert(users).values({
          clerkId: id,
          email: primaryEmail,
          name: [first_name, last_name].filter(Boolean).join(' ') || 'User',
          avatarUrl: image_url ?? null,
        });
      }
      break;
    }

    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses[0]?.email_address;

      if (primaryEmail) {
        await db
          .update(users)
          .set({
            email: primaryEmail,
            name: [first_name, last_name].filter(Boolean).join(' ') || 'User',
            avatarUrl: image_url ?? null,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, id));
      }
      break;
    }

    case 'user.deleted': {
      const { id } = evt.data;
      if (id) {
        await db.delete(users).where(eq(users.clerkId, id));
      }
      break;
    }
  }

  return Response.json({ received: true });
}
