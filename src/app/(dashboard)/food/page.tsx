import { redirect } from "next/navigation";

export default function LegacyFoodPage() {
  redirect("/app/food");
}
