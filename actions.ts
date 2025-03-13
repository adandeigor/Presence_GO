"use server";
import sessionOptions from "@/lib/session/session-options";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { signIn } from "next-auth/react";

export async function handleSignInWithGoogle() {
  await signIn("google");
}
export async function getNotifications() {
  const session:any = await getIronSession(await cookies(), sessionOptions);
  return session.notifications || [];
}

export async function addNotification(message: string) {
  const session:any = await getIronSession(await cookies(), sessionOptions);

  // Initialiser le tableau s'il n'existe pas
  if (!session.notifications) {
    session.notifications = [];
  }

  session.notifications.push({ message, read: false, id: Date.now() });

  await session.save(); // Sauvegarder les modifications

  return session.notifications;
}

export async function markNotificationAsRead(id: string) {
  const session:any = await getIronSession(await cookies(), sessionOptions);

  if (!session.notifications) session.notifications = [];

  session.notifications = session.notifications.map((notif:any) =>
    notif.id === id ? { ...notif, read: true } : notif
  );

  await session.save();
  return session.notifications;
}