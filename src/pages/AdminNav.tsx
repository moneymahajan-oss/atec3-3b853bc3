import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, GraduationCap, LogOut, Eye, ChevronUp, ChevronDown, Plus, Trash2, Save } from "lucide-react";

type NavItem = {
  id: number;
  label: string;
  section_key: string;
  external_url: string | null;
  order_index: number;
  is_visible: boolean;
};

export default function AdminNav() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<NavItem[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newExternal, setNewExternal] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, loading]);

  const refresh = async () => {
    const { data } = await (supabase as any).from("nav_items").select("*").order("order_index");
    setItems((data as NavItem[]) || []);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const update = async (id: number, patch: Partial<NavItem>) => {
    await (supabase as any).from("nav_items").update(patch).eq("id", id);
    refresh();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[i], b = items[j];
    await (supabase as any).from("nav_items").update({ order_index: b.order_index }).eq("id", a.id);
    await (supabase as any).from("nav_items").update({ order_index: a.order_index }).eq("id", b.id);
    refresh();
  };

  const addItem = async () => {
    if (!newLabel.trim() || !newKey.trim()) { toast({ title: "Label and section key required", variant: "destructive" }); return; }
    const max = items.reduce((m, x) => Math.max(m, x.order_index), 0);
    await (supabase as any).from("nav_items").insert({
      label: newLabel.trim(),
      section_key: newKey.trim(),
      external_url: newExternal.trim() || null,
      order_index: max + 1,
      is_visible: true,
    });
    setNewLabel(""); setNewKey(""); setNewExternal("");
    refresh();
  };

  const remove = async (id: number) => {
    if (!confirm("Hide is preferred. Delete anyway?")) return;
    await (supabase as any).from("nav_items").delete().eq("id", id);
    refresh();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 hover:bg-muted rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">Navigation Menu</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild><Link to="/"><Eye className="w-4 h-4 mr-1" /> View Site</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div className="glass rounded-xl p-6">
          <h2 className="font-heading font-bold text-xl mb-4">Navbar Items</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Section keys must match an HTML id on the page (e.g. <code>courses</code>, <code>about</code>, <code>gallery</code>). For routes (e.g. <code>/verification</code>), put the path in External URL.
          </p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={it.id} className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-2 items-center bg-background rounded-lg p-2 border border-border">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30 hover:bg-muted rounded p-0.5"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="disabled:opacity-30 hover:bg-muted rounded p-0.5"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <Input value={it.label} onChange={e => setItems(p => p.map(x => x.id === it.id ? { ...x, label: e.target.value } : x))} placeholder="Label" />
                <Input value={it.section_key} onChange={e => setItems(p => p.map(x => x.id === it.id ? { ...x, section_key: e.target.value } : x))} placeholder="section_key" />
                <Input value={it.external_url || ""} onChange={e => setItems(p => p.map(x => x.id === it.id ? { ...x, external_url: e.target.value } : x))} placeholder="External URL (optional)" />
                <Switch checked={it.is_visible} onCheckedChange={(v) => update(it.id, { is_visible: v })} />
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => update(it.id, { label: it.label, section_key: it.section_key, external_url: it.external_url || null })} className="gradient-accent text-accent-foreground border-0"><Save className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="font-heading font-bold text-lg mb-4">Add New Item</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <Input placeholder="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            <Input placeholder="section_key (e.g. about)" value={newKey} onChange={e => setNewKey(e.target.value)} />
            <Input placeholder="External URL (optional)" value={newExternal} onChange={e => setNewExternal(e.target.value)} />
            <Button onClick={addItem} className="gradient-accent text-accent-foreground border-0"><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
