import { SignUp } from "@clerk/nextjs";
import InlogCodeTip from "@/app/InlogCodeTip";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <SignUp />
      <InlogCodeTip />
    </div>
  );
}
