// "use server";

// import { db } from "@/lib/db";
// import { revalidatePath } from "next/cache";

// export async function getBotStatus(): Promise<boolean> {
//   const status = await db.botStatus.upsert({
//     where: { id: 1 },
//     update: {},
//     create: { enabled: true },
//   });
//   return status.enabled;
// }

// export async function toggleBotStatus(): Promise<boolean> {
//   const currentStatus = await getBotStatus();
//   const newStatus = await db.botStatus.update({
//     where: { id: 1 },
//     data: { enabled: !currentStatus },
//   });
//   revalidatePath('/'); // Optional: revalidate the page if needed
//   return newStatus.enabled;
// }

// export async function getChannels() {
//   return await db.channel.findMany({
//     orderBy: { createdAt: 'desc' },
//   });
// }

// // NOUVELLE FONCTION pour ajouter un canal
// export async function addChannel(formData: FormData) {
//   const url = formData.get('url') as string;

//   if (!url || !url.startsWith('https://t.me/')) {
//     return { error: 'Veuillez fournir une URL de canal Telegram valide (ex: https://t.me/channel_name).' };
//   }

//   try {
//     await db.channel.create({
//       data: {
//         url: url,
//       },
//     });
//     revalidatePath('/channels'); // Rafraîchir la page des canaux pour afficher le nouveau
//     return { success: true };
//   } catch (error: any) {
//     // Gérer le cas où le canal existe déjà (contrainte unique)
//     if (error.code === 'P2002') {
//       return { error: 'Ce canal a déjà été ajouté.' };
//     }
//     return { error: 'Échec de l\'ajout du canal à la base de données.' };
//   }
// }