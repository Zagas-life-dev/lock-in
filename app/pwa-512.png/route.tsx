import { iconArt } from "@/lib/iconArt";

export const dynamic = "force-static";
export function GET() {
  return iconArt(512);
}
