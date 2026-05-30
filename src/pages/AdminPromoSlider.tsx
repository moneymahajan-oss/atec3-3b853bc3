// src/pages/AdminPromoSlider.tsx
// Admin panel for the Promo/Discount Slider (OffersSliderSection)
// Uses table: promo_slides + site_settings key: promo_slider_visible
// Pattern matches existing AdminOffers.tsx / AdminNav.tsx

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
  LogOut, ToggleLeft, ToggleRight, Pencil, X, Check,
  ChevronUp, ChevronDown, Tag, MessageCircle
} from "lucide-react";

interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  caption: string;
  badge_text: string;
  cta_text: string;
  whatsapp_message: string;
  bg_color_from: string;
  bg_color_to: string;
  text_color: string;
  slide_order: number;
  duration_seconds: number;
  is_active: boolean;
  is_visible: boolean;
}

const EMPTY_SLIDE: Omit<PromoSlide, "id"> = {
  title: "",
  subtitle: "",
  caption: "",
  badge_text: "Special Offer",
  cta_text: "Enquire on WhatsApp",
  whatsapp_message: "Hello ATEC! I am interested in your offer.",
  bg_color_from: "#1a1a2e",
  bg_color_to: "#16213e",
  text_color: "#ffffff",
  slide_order: 1,
  duration_seconds: 5,
  is_active: true,
  is_visible: true,
};

export default function AdminPromoSlider() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [editingSlide, setEditingSlide] = useState<PromoSlide | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [savingSlide, setSavingSlide] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    // Fetch section visibility from site_settings
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "promo_slider_visible")
      .maybeSingle();
    setSectionVisible(setting?.value === "true");

    // Fetch all slides (admin sees all, not just visible)
    const { data: slideData } = await supabase
      .from("promo_slides" as any)
      .select("*")
      .order("slide_order", { ascending: true });
    setSlides((slideData ?? []) as PromoSlide[]);
  };

  const saveSectionVisibility = async (val: boolean) => {
    setSavingSection(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "promo_slider_visible", value: val ? "true" : "false" }, { onConflict: "key" });
    setSavingSection(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSectionVisible(val);
    toast({ title: val ? "Promo Slider is now VISIBLE ✓" : "Promo Slider is now HIDDEN ✓" });
  };

  const saveSlide = async () => {
    if (!editingSlide) return;
    setSavingSlide(true);
    try {
      if (isNew) {
        const { id, ...rest } = editingSlide;
        const { error } = await supabase.from("promo_slides" as any).insert([rest]);
        if (error) throw error;
        toast({ title: "Slide added ✓" });
      } else {
        const { error } = await supabase
          .from("promo_slides" as any)
          .update({ ...editingSlide, updated_at: new Date().toISOString() })
          .eq("id", editingSlide.id);
        if (error) throw error;
        toast({ title: "Slide saved ✓" });
      }
      setEditingSlide(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingSlide(false);
    }
  };

  const deleteSlide = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    await supabase.from("promo_slides" as any).delete().eq("id", id);
    fetchAll();
    toast({ title: "Slide deleted" });
  };

  const toggleVisibility = async (slide: PromoSlide) => {
    await supabase.from("promo_slides" as any)
      .update({ is_visible: !slide.is_visible })
      .eq("id", slide.id);
    fetchAll();
  };

  const moveSlide = async (idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= slides.length) return;
    const a = slides[idx];
    const b = slides[swapIdx];
    await Promise.all([
      supabase.from("promo_slides" as any).update({ slide_order: b.slide_order }).eq("id", a.id),
      supabase.from("promo_slides" as any).update({ slide_order: a.slide_order }).eq("id", b.id),
    ]);
    fetchAll();
  };

  const openAdd = () => {
    setEditingSlide({
      ...EMPTY_SLIDE,
      id: "__new__",
      slide_order: slides.length + 1,
    });
    setIsNew(true);
  };

  const openEdit = (slide: PromoSlide) => {
    setEditingSlide({ ...slide });
    setIsNew(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
    </div>
  );

  // Live preview gradient
  const previewBg = editingSlide
    ? `linear-gradient(135deg, ${editingSlide.bg_color_from} 0%, ${editingSlide.bg_color_to} 100%)`
    : "";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 hover:bg-muted rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <Tag className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">Promo Slider</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/"><Eye className="w-4 h-4 mr-1" /> View Site</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* Section visibility */}
        <div className="glass rounded-xl p-6 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-lg">Show Promo Slider on Homepage</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Toggle to show or hide the entire promo/discount slider section. Appears between Hero and Courses.
            </p>
          </div>
          <button
            disabled={savingSection}
            onClick={() => saveSectionVisibility(!sectionVisible)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border ${
              sectionVisible
                ? "bg-green-100 text-green-700 border-green-300"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {sectionVisible
              ? <><ToggleRight className="w-5 h-5" /> Slider ON</>
              : <><ToggleLeft className="w-5 h-5" /> Slider OFF</>}
          </button>
        </div>

        {/* Slides list */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg">Promo Slides ({slides.length})</h2>
            <Button onClick={openAdd} className="gradient-accent text-accent-foreground border-0" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Slide
            </Button>
          </div>

          {slides.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="font-medium">No promo slides yet.</p>
              <p className="text-sm mt-1">Click "Add Slide" to create your first promo banner.</p>
            </div>
          )}

          <div className="space-y-3">
            {slides.map((slide, idx) => (
              <div key={slide.id}>
                {editingSlide?.id === slide.id ? (
                  <SlideEditForm
                    slide={editingSlide}
                    previewBg={previewBg}
                    saving={savingSlide}
                    isNew={isNew}
                    onChange={setEditingSlide}
                    onSave={saveSlide}
                    onCancel={() => setEditingSlide(null)}
                  />
                ) : (
                  <div className={`flex items-center gap-3 p-4 rounded-xl border bg-background hover:border-accent/40 transition-colors
                    ${!slide.is_visible ? "opacity-55 border-orange-200" : "border-border"}`}>

                    {/* Color preview */}
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 shadow"
                      style={{ background: `linear-gradient(135deg, ${slide.bg_color_from}, ${slide.bg_color_to})` }} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{slide.title}</span>
                        {slide.badge_text && (
                          <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded-full">{slide.badge_text}</span>
                        )}
                        {!slide.is_visible && (
                          <span className="text-[10px] bg-orange-100 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full">Hidden</span>
                        )}
                      </div>
                      {slide.subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{slide.subtitle}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-0.5">Duration: {slide.duration_seconds}s · Order: {slide.slide_order}</p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Reorder */}
                      <div className="flex flex-col">
                        <button onClick={() => moveSlide(idx, -1)} disabled={idx === 0}
                          className="p-1 hover:bg-muted rounded disabled:opacity-30">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveSlide(idx, 1)} disabled={idx === slides.length - 1}
                          className="p-1 hover:bg-muted rounded disabled:opacity-30">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <button onClick={() => toggleVisibility(slide)}
                        title={slide.is_visible ? "Hide" : "Show"}
                        className="p-2 hover:bg-muted rounded-lg transition-colors">
                        {slide.is_visible ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-orange-500" />}
                      </button>
                      <button onClick={() => openEdit(slide)} className="p-2 hover:bg-accent/10 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4 text-accent" />
                      </button>
                      <button onClick={() => deleteSlide(slide.id)} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Inline add form at bottom */}
            {editingSlide && isNew && editingSlide.id === "__new__" && !slides.find(s => s.id === "__new__") && (
              <SlideEditForm
                slide={editingSlide}
                previewBg={previewBg}
                saving={savingSlide}
                isNew={true}
                onChange={setEditingSlide}
                onSave={saveSlide}
                onCancel={() => setEditingSlide(null)}
              />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="glass rounded-xl p-5 bg-blue-50/50 border-blue-100">
          <h3 className="font-semibold text-sm text-blue-800 mb-2">How this slider works</h3>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Slides auto-advance in a <strong>bounce (to-and-fro)</strong> pattern — forward to end, then reverses back.</li>
            <li>Each slide stays for its individual <strong>Duration</strong> (seconds) before moving.</li>
            <li>The WhatsApp button opens a pre-filled WhatsApp chat with ATEC.</li>
            <li>Use <strong>Visible</strong> toggle per slide to hide specific slides without deleting them.</li>
            <li>Use <strong>Slider ON/OFF</strong> above to hide the entire section from the homepage.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

// ── Inline edit form component ────────────────────────────────────────────
function SlideEditForm({
  slide, previewBg, saving, isNew, onChange, onSave, onCancel
}: {
  slide: PromoSlide;
  previewBg: string;
  saving: boolean;
  isNew: boolean;
  onChange: (s: PromoSlide) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (patch: Partial<PromoSlide>) => onChange({ ...slide, ...patch });

  return (
    <div className="border-2 border-accent rounded-xl p-5 space-y-4 bg-accent/5">
      {/* Live preview */}
      <div className="rounded-xl p-4 flex items-center justify-between relative overflow-hidden"
        style={{ background: previewBg, minHeight: "70px" }}>
        <div>
          {slide.badge_text && (
            <span className="text-xs px-2 py-0.5 rounded-full inline-block mb-1"
              style={{ background: "rgba(255,255,255,0.2)", color: slide.text_color || "#fff" }}>
              {slide.badge_text}
            </span>
          )}
          <p className="font-bold text-sm" style={{ color: slide.text_color || "#fff" }}>
            {slide.title || "Slide Title Preview"}
          </p>
          {slide.subtitle && (
            <p className="text-xs opacity-80" style={{ color: slide.text_color || "#fff" }}>{slide.subtitle}</p>
          )}
        </div>
        <button className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
          style={{ background: "#25D366", color: "#fff" }}>
          <MessageCircle size={12} />
          {slide.cta_text || "WhatsApp"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold mb-1 block">Title *</label>
          <Input value={slide.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. 50% Off on All Computer Courses!" className="bg-background" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Subtitle</label>
          <Input value={slide.subtitle} onChange={e => set({ subtitle: e.target.value })} placeholder="e.g. Limited Time Offer – Enroll Now" className="bg-background" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Badge Text</label>
          <Input value={slide.badge_text} onChange={e => set({ badge_text: e.target.value })} placeholder="e.g. Flash Sale" className="bg-background" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold mb-1 block">Caption (small text)</label>
          <Textarea value={slide.caption} onChange={e => set({ caption: e.target.value })} placeholder="e.g. Valid till 30th June 2025. Seats limited." rows={2} className="bg-background" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">CTA Button Text</label>
          <Input value={slide.cta_text} onChange={e => set({ cta_text: e.target.value })} placeholder="Enquire on WhatsApp" className="bg-background" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">WhatsApp Pre-filled Message</label>
          <Input value={slide.whatsapp_message} onChange={e => set({ whatsapp_message: e.target.value })} placeholder="Hello ATEC! I saw the offer..." className="bg-background" />
        </div>

        {/* Colors */}
        <div>
          <label className="text-xs font-semibold mb-1 block">Background Color (From)</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={slide.bg_color_from} onChange={e => set({ bg_color_from: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border" />
            <Input value={slide.bg_color_from} onChange={e => set({ bg_color_from: e.target.value })} className="font-mono text-xs bg-background" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Background Color (To)</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={slide.bg_color_to} onChange={e => set({ bg_color_to: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border" />
            <Input value={slide.bg_color_to} onChange={e => set({ bg_color_to: e.target.value })} className="font-mono text-xs bg-background" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Text Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={slide.text_color} onChange={e => set({ text_color: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border" />
            <Input value={slide.text_color} onChange={e => set({ text_color: e.target.value })} className="font-mono text-xs bg-background" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Duration (seconds)</label>
          <Input type="number" min={2} max={30} value={slide.duration_seconds}
            onChange={e => set({ duration_seconds: parseInt(e.target.value) || 5 })} className="bg-background" />
          <p className="text-[10px] text-muted-foreground mt-0.5">How long this slide stays before advancing</p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input type="checkbox" id="vis" checked={slide.is_visible}
            onChange={e => set({ is_visible: e.target.checked })} className="w-4 h-4 accent-accent" />
          <label htmlFor="vis" className="text-sm font-medium cursor-pointer">Visible on public page</label>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input type="checkbox" id="act" checked={slide.is_active}
            onChange={e => set({ is_active: e.target.checked })} className="w-4 h-4 accent-accent" />
          <label htmlFor="act" className="text-sm font-medium cursor-pointer">Active (in rotation)</label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={onSave} disabled={saving || !slide.title} className="gradient-accent text-accent-foreground border-0" size="sm">
          <Check className="w-4 h-4 mr-1" />{saving ? "Saving…" : isNew ? "Add Slide" : "Save Slide"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-4 h-4 mr-1" /> Cancel</Button>
      </div>
    </div>
  );
}
