import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function SignInPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-6">
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#7C3AED",
              colorBackground: "#0E0E12",
              colorText: "#F8FAFC",
              colorTextSecondary: "#94A3B8",
              borderRadius: "1rem",
              fontFamily: "var(--font-body)",
            },
            elements: {
              card: "border border-white/10 bg-[#0E0E12] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] p-10",
              headerTitle: "text-3xl font-display font-bold text-white tracking-tight",
              headerSubtitle: "text-slate-400 font-medium",
              socialButtonsBlockButton: "bg-[#16161E] border border-white/5 shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_rgba(255,255,255,0.05)] hover:bg-[#1C1C26] transition-all duration-300 rounded-xl",
              socialButtonsBlockButtonText: "text-slate-200 font-semibold",
              dividerLine: "bg-white/5",
              dividerText: "text-slate-500 text-[10px] font-bold font-mono tracking-[0.2em]",
              formFieldLabel: "text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1",
              formFieldInput: "bg-[#060608] border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_1px_rgba(255,255,255,0.05)] focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all rounded-xl py-3.5 text-white placeholder:text-slate-700",
              formButtonPrimary: "bg-gradient-to-b from-violet-500 to-violet-600 border-t border-white/20 shadow-[0_4px_12px_rgba(124,58,237,0.3),0_1px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_16px_rgba(124,58,237,0.4)] transition-all active:scale-[0.98] py-4 rounded-xl font-bold text-white",
              footerActionText: "text-slate-500 text-sm",
              footerActionLink: "text-cyan-400 hover:text-cyan-300 transition-colors font-bold",
              identityPreviewText: "text-white",
              identityPreviewEditButtonIcon: "text-violet-400",
              formResendCodeLink: "text-cyan-400 hover:text-cyan-300 transition-colors",
              otpCodeFieldInput: "bg-[#060608] border-white/10 text-white rounded-xl shadow-inner focus:border-violet-500",
            },
            layout: {
              socialButtonsPlacement: "bottom",
              showOptionalFields: false,
            }
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </AuthLayout>
  );
}
