export type PhotoStatus = "approved" | "pending" | "rejected";

export interface Photo {
  id: string;
  image_url: string;
  photographer: string;
  location: string;
  caption: string;
  status: PhotoStatus;
  created_at: string;
}