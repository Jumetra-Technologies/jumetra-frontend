import { SignInRequired } from "@/components/auth/SignInRequired";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <SignInRequired>{children}</SignInRequired>;
}
