// import { r2 } from "@/lib/r2";
// import { PutObjectCommand } from "@aws-sdk/client-s3";
// import { v4 as uuidv4 } from "uuid";
// import path from "path";

/**
 * 上传图片到 R2 存储
 */
export async function uploadImages(images: File[]): Promise<string[]> {
  const uploadedUrls: string[] = [];

  // for (const image of images) {
  //   const buffer = Buffer.from(await image.arrayBuffer());
  //   const fileExtension = path.extname(image.name);
  //   const key = `${uuidv4()}${fileExtension}`;
    
  //   await r2.send(new PutObjectCommand({
  //     Bucket: process.env.R2_BUCKET_NAME!,
  //     Key: key,
  //     Body: buffer,
  //     ContentType: image.type,
  //   }));

  //   uploadedUrls.push(`${process.env.R2_PUBLIC_URL}/${key}`);
  // }

  return uploadedUrls;
}
