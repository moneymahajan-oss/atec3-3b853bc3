import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { toast } from "sonner";

export default function CrmLogin() {
  const { user, loading, signIn, signInWithGoogle } = useCrmAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/crm" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      const msg = (error as { message?: string })?.message ?? "Sign-in failed";
      toast.error(msg);
    } else {
      toast.success("Signed in");
      navigate("/crm");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl">ATEC CRM</h1>
            <p className="text-xs text-muted-foreground">Staff sign in</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@ateceducation.in" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
        </div>

        <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
          Continue with Google
        </Button>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Access requires a CRM role. Ask an admin to grant access after first sign-in.
        </p>
      </div>
    </div>
  );
}
