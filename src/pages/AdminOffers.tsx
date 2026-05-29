// src/pages/AdminOffers.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Plus, Trash2, Eye, EyeOff, GraduationCap,
  LogOut, ToggleLeft, ToggleRight, Pencil, X, Check
} from "lucide-react";

const ICON_OPTIONS = ["Trophy","Shield","Heart","Users","Star","Zap","Gift","Sparkles","CheckCircle2"];

interface OfferCard {
  id: string;
  icon: string;
  label: string;
  tag: string;
  discount: string;
  description: string;
  highlight: boolean;
  display_order: number;
}

interface SectionData {
  is_active: boolean;
  heading: string;
  subheading: string;
  badge_text: string;
  cta_text: string;
  features: string[];
  cards: OfferCard[];
  footer_note: string;
}

const DEFAULT: SectionData = {
  is_active: true,
  heading: "Special Discounts Just for You!",
  subheading: "We believe great education should be accessible to everyone. Get rewarded for your effort, service, and dedication.",
  badge_text: "Limited Offers",
  cta_text: "Claim Your Discount Now",
  features: ["No hidden charges","Discount applied at admission","Valid on all courses","Stackable with EMI plans"],
  cards: [
    { id:"1", icon:"Trophy", label:"Mock Test Toppers", tag:"Score 70%+", discount:"15% OFF", description:"Clear our online mock test with 70% or more and unlock an instant fee discount.", highlight:true, display_order:1 },
    { id:"2", icon:"Shield", label:"Defence Personnel", tag:"Army / Navy / Air Force", discount:"20% OFF", description:"Serving or retired armed forces members and their families.", highlight:false, display_order:2 },
    { id:"3", icon:"Heart", label:"Senior Citizens", tag:"Age 55+", discount:"15% OFF", description:"It's never too late to learn. Elders get a warm welcome and a special fee benefit.", highlight:false, display_order:3 },
    { id:"4", icon:"Users", label:"Homemakers", tag:"Housewives & Caregivers", discount:"10% OFF", description:"Empowering homemakers to enter the workforce with skills and confidence.", highlight:false, display_order:4 },
    { id:"5", icon:"Star", label:"Referral Bonus", tag:"Bring a Friend", discount:"₹500 OFF", description:"Refer a friend who enrolls and both of you get a fee waiver.", highlight:false, display_order:5 },
    { id:"6", icon:"Zap", label:"Early Bird", tag:"Register This Week", discount:"10% OFF", description:"Enroll in the first week of any new batch.", highlight:false, display_order:6 },
  ],
  footer_note: "Discounts verified at time of admission. One discount per student. Contact ATEC for details.",
};

export default function AdminOffers() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<SectionData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [editingCard, setEditingCard] = useState<OfferCard | null>(null);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("site_settings").select("value").eq("key","offers_section").maybeSingle().then(({ data: row }) => {
      if (row?.value) {
        try { setData(JSON.parse(row.value)); } catch {}
      }
    });
  }, [isAdmin]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "offers_section", value: JSON.stringify(data) }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Offers section saved ✓" });
  };

  const updateCard = (card: OfferCard) => {
    setData(d => ({ ...d, cards: d.cards.map(c => c.id === card.id ? card : c) }));
    setEditingCard(null);
  };

  const addCard = () => {
    const newCard: OfferCard = {
      id: Date.now().toString(), icon: "Gift", label: "New Offer", tag: "Tag",
      discount: "10% OFF", description: "Description here.", highlight: false,
      display_order: data.cards.length + 1,
    };
    setData(d => ({ ...d, cards: [...d.cards, newCard] }));
    setEditingCard(newCard);
  };

  const deleteCard = (id: string) => {
    if (!confirm("Delete this offer card?")) return;
    setData(d => ({ ...d, cards: d.cards.filter(c => c.id !== id) }));
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setData(d => ({ ...d, features: [...d.features, newFeature.trim()] }));
    setNewFeature("");
  };

  const removeFeature = (i: number) => {
    setData(d => ({ ...d, features: d.features.filter((_, idx) => idx !== i) }));
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
            <span className="font-heading font-bold text-lg">Offers & Discounts Section</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild><Link to="/"><Eye className="w-4 h-4 mr-1" /> View Site</Link></Button>
            <Button onClick={save} disabled={saving} className="gradient-accent text-accent-foreground border-0" size="sm">
              <Save className="w-4 h-4 mr-1" />{saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* Section toggle */}
        <div className="glass rounded-xl p-6 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-lg">Section Visibility</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Toggle to show or hide the entire offers section on the website</p>
          </div>
          <button
            onClick={() => setData(d => ({ ...d, is_active: !d.is_active }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${data.is_active ? "bg-green-100 text-green-700 border border-green-300" : "bg-muted text-muted-foreground border border-border"}`}
          >
            {data.is_active ? <><ToggleRight className="w-5 h-5" /> Section ON</> : <><ToggleLeft className="w-5 h-5" /> Section OFF</>}
          </button>
        </div>

        {/* Text content */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-heading font-bold text-lg">Section Text</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1 block">Badge Text</label>
              <Input value={data.badge_text} onChange={e => setData(d => ({...d, badge_text: e.target.value}))} className="bg-background" /></div>
            <div><label className="text-sm font-medium mb-1 block">CTA Button Text</label>
              <Input value={data.cta_text} onChange={e => setData(d => ({...d, cta_text: e.target.value}))} className="bg-background" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1 block">Heading</label>
            <Input value={data.heading} onChange={e => setData(d => ({...d, heading: e.target.value}))} className="bg-background" /></div>
          <div><label className="text-sm font-medium mb-1 block">Subheading</label>
            <Textarea value={data.subheading} onChange={e => setData(d => ({...d, subheading: e.target.value}))} rows={2} className="bg-background" /></div>
          <div><label className="text-sm font-medium mb-1 block">Footer Note</label>
            <Input value={data.footer_note} onChange={e => setData(d => ({...d, footer_note: e.target.value}))} className="bg-background" /></div>
        </div>

        {/* Feature pills */}
        <div className="glass rounded-xl p-6 space-y-3">
          <h2 className="font-heading font-bold text-lg">Feature Pills</h2>
          <div className="flex flex-wrap gap-2">
            {data.features.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20 text-sm">
                {f}
                <button onClick={() => removeFeature(i)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add a feature pill..." value={newFeature} onChange={e => setNewFeature(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addFeature()} className="bg-background" />
            <Button onClick={addFeature} variant="outline"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Offer cards */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg">Offer Cards ({data.cards.length})</h2>
            <Button onClick={addCard} className="gradient-accent text-accent-foreground border-0" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Card
            </Button>
          </div>

          <div className="space-y-3">
            {data.cards.sort((a,b) => a.display_order - b.display_order).map((card) => (
              <div key={card.id}>
                {editingCard?.id === card.id ? (
                  /* Edit form */
                  <div className="border-2 border-accent rounded-xl p-4 space-y-3 bg-accent/5">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div><label className="text-xs font-medium mb-1 block">Label</label>
                        <Input value={editingCard.label} onChange={e => setEditingCard({...editingCard, label: e.target.value})} className="bg-background" /></div>
                      <div><label className="text-xs font-medium mb-1 block">Tag (e.g. "Age 55+")</label>
                        <Input value={editingCard.tag} onChange={e => setEditingCard({...editingCard, tag: e.target.value})} className="bg-background" /></div>
                      <div><label className="text-xs font-medium mb-1 block">Discount (e.g. "15% OFF")</label>
                        <Input value={editingCard.discount} onChange={e => setEditingCard({...editingCard, discount: e.target.value})} className="bg-background" /></div>
                      <div><label className="text-xs font-medium mb-1 block">Icon</label>
                        <select value={editingCard.icon} onChange={e => setEditingCard({...editingCard, icon: e.target.value})}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                          {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                        </select>
                      </div>
                      <div><label className="text-xs font-medium mb-1 block">Display Order</label>
                        <Input type="number" value={editingCard.display_order} onChange={e => setEditingCard({...editingCard, display_order: Number(e.target.value)})} className="bg-background" /></div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                          <input type="checkbox" checked={editingCard.highlight} onChange={e => setEditingCard({...editingCard, highlight: e.target.checked})}
                            className="w-4 h-4 accent-accent" />
                          Mark as Popular
                        </label>
                      </div>
                    </div>
                    <div><label className="text-xs font-medium mb-1 block">Description</label>
                      <Textarea value={editingCard.description} onChange={e => setEditingCard({...editingCard, description: e.target.value})} rows={2} className="bg-background" /></div>
                    <div className="flex gap-2">
                      <Button onClick={() => updateCard(editingCard)} className="gradient-accent text-accent-foreground border-0" size="sm">
                        <Check className="w-4 h-4 mr-1" /> Save Card
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCard(null)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  /* Card row */
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-background hover:border-accent/40 transition-colors">
                    <span className="text-lg font-bold text-muted-foreground w-6 text-center">{card.display_order}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{card.label}</span>
                        {card.highlight && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded-full font-semibold">Popular</span>}
                        <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded-full">{card.discount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{card.tag} — {card.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingCard({...card})}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCard(card.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save bar */}
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Remember to save after all changes.</p>
          <Button onClick={save} disabled={saving} className="gradient-accent text-accent-foreground border-0">
            <Save className="w-4 h-4 mr-1" />{saving ? "Saving…" : "Save All Changes"}
          </Button>
        </div>

      </div>
    </div>
  );
}
