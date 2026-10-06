import { redirect } from "next/navigation";
import { SETTINGS_QUERY_FLAG } from "@/lib/settings-query";

/** Settings is a modal now; old links open it over the Home page. */
export default function SettingsPage() {
  redirect(`/?${SETTINGS_QUERY_FLAG}`);
}
