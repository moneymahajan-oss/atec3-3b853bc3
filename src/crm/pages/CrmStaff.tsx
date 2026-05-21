import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";

type StaffRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  role: "admin" | "counsellor";
  created_at: string;
};

export default function CrmStaff() {
  const { isAdmin, loading } = useCrmAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "counsellor">("counsellor");

  // New staff form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "counsellor">("counsellor");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("crm_user_roles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setStaff((data ?? []) as StaffRow[]);
    setFetching(false);
  };

  useEffect(() => { load(); }, []);

  if (!loading && !isAdmin) return <Navigate to="/crm" replace />;

  const startEdit = (s: StaffRow) => {
    setEditingId(s.id);
    setEditName(s.display_name ?? "");
    setEditRole(s.role);
  };

  const saveEdit = async (s: StaffRow) => {
    const { error } = await supabase
      .from("crm_user_roles")
      .update({ display_name: editName, role: editRole })
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    setEditingId(null);
    load();
  };

  const removeStaff = async (s: StaffRow) => {
    if (!confirm(`Remove ${s.display_name || "this user"} from CRM access? Their account will still exist but they won't be able to log into the CRM.`)) return;
    const { error } = await supabase.from("crm_user_roles").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed from CRM");
    load();
  };

  const addStaff = async () => {
    if (!newEmail || !newPassword || !newName) {
      toast.error("Email, password and name are required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setAdding(true);
    try {
      // Create auth user via Supabase admin (uses service role via edge function or direct)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: { data: { full_name: newName } },
      });
      if (authError) { toast.error(authError.message); setAdding(false); return; }
      const userId = authData.user?.id;
      if (!userId) { toast.error("Could not create user"); setAdding(false); return; }

      // Insert role
      const { error: roleError } = await supabase.from("crm_user_roles").insert({
        user_id: userId,
        display_name: newName,
        role: newRole,
      });
      if (roleError) { toast.error(roleError.message); setAdding(false); return; }

      toast.success(`${newName} added as ${newRole}. They can now log in at /crm/login`);
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("counsellor");
      setShowForm(false);
      load();
    } finally {
      setAdding(false);
    }
  };

  const roleColor = (role: string) =>
    role === "admin"
      ? "bg-purple-100 text-purple-700 border-purple-300"
      : "bg-blue-100 text-blue-700 border-blue-300";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Counsellors"
        description="Manage who can access the CRM and their roles."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-2" /> Add Staff
          </Button>
        }
      />

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Add New Staff Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full name *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Priya Sharma" />
              </div>
              <div>
                <Label>Role *</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "counsellor")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="counsellor">Counsellor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="priya@ateceducation.in" />
              </div>
              <div>
                <Label>Password * (min 6 chars)</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set a strong password" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addStaff} disabled={adding}>
                {adding ? "Creating..." : "Create & Add"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This creates a new login account. Share the email and password with the staff member. They can change their password after logging in.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Staff ({staff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {fetching ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff added yet.</p>
          ) : (
            <div className="space-y-3">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-semibold text-sm shrink-0">
                    {(s.display_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === s.id ? (
                      <div className="flex flex-wrap gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-48"
                          placeholder="Display name"
                        />
                        <Select value={editRole} onValueChange={(v) => setEditRole(v as "admin" | "counsellor")}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="counsellor">Counsellor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8" onClick={() => saveEdit(s)}><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{s.display_name || "—"}</span>
                        <Badge variant="outline" className={`text-[10px] ${roleColor(s.role)}`}>{s.role}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">{s.user_id.slice(0, 8)}…</span>
                      </div>
                    )}
                  </div>
                  {editingId !== s.id && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeStaff(s)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
