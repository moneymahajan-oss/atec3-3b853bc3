// src/pages/AdminPromoSlider.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Eye, EyeOff, LogOut, ToggleLeft, ToggleRight,
  Pencil, X, Check, ChevronUp, ChevronDown, Tag,
  MessageCircle, Plus, Trash2, Upload, ImageOff, Loader2
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
  bg_image_url: string;
  bg_overlay_opacity: number;
  text_color: string;
  slide_order: number;
  duration_seconds: number;
  is_active: boolean;
  is_visible: boolean;
  title_font_size: string;
  title_font_family: string;
  title_line_colors: { line: number; color: string }[];
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
  bg_image_url: "",
  bg_overlay_opacity: 0.55,
  text_color: "#ffffff",
  slide_order: 1,
  duration_seconds: 5,
  is_active: true,
  is_visible: true,
  title_font_size: "clamp(1rem, 3.2vw, 1.9rem)",
  title_font_family: "inherit",
  title_line_colors: [],
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
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "promo_slider_visible")
      .maybeSingle();
    setSectionVisible(setting?.value === "true");

    const { data: slideData } = await supabase
      .from("promo_slides" as any)
      .select("*")
      .order("slide_order", { ascending: true });
    setSlides((slideData ?? []) as PromoSlide[]);
  };

  const saveSectionVisibility = async (val: boolean) => {
    setSavingSection(true);
    await supabase
      .from("site_settings")
      .upsert({ key: "promo_slider_visible", value: val ? "true" : "false" }, { onConflict: "key" });
    setSavingSection(false);
    setSectionVisible(val);
    toast({ title: val ? "Promo Slider is now VISIBLE ✓" : "Promo Slider is now HIDDEN ✓" });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    const maxSizeMB = 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({ title: "Image too large", description: `Max size is ${maxSizeMB}MB`, variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `promo-slides/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(fileName);
      setEditingSlide(prev => prev ? { ...prev, bg_image_url: urlData.publicUrl } : prev);
      toast({ title: "Image uploaded ✓" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setEditingSlide(prev => prev ? { ...prev, bg_image_url: "" } : prev);
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
      .update({ is_visible: !slide.is_visible }).eq("id", slide.id);
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
    setEditingSlide({ ...EMPTY_SLIDE, id: "__new__", slide_order: slides.length + 1 });
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

  const previewBg = editingSlide?.bg_image_url
    ? `url(${editingSlide.bg_image_url})`
    : `linear-gradient(135deg, ${editingSlide?.bg_color_from || "#1a1a2e"} 0%, ${editingSlide?.bg_color_to || "#16213e"} 100%)`;

  return (
    <div className="min-h-screen bg-muted/30">
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

        {/* Section toggle */}
        <div className="glass rounded-xl p-6 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-lg">Show Promo Slider on Homepage</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Appears between Hero section and Courses section.</p>
          </div>
          <button
            disabled={savingSection}
            onClick={() => saveSectionVisibility(!sectionVisible)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border ${
              sectionVisible ? "bg-green-100 text-green-700 border-green-300" : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {sectionVisible
              ? <><ToggleRight className="w-5 h-5" /> Slider ON</>
              : <><ToggleLeft className="w-5 h-5" /> Slider OFF</>}
          </button>
        </div>

        {/* Slides */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg">Promo Slides ({slides.length})</h2>
            <Button onClick={openAdd} className="gradient-accent text-accent-foreground border-0" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Slide
            </Button>
          </div>

          {slides.length === 0 && !editingSlide && (
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
                    uploadingImage={uploadingImage}
                    isNew={isNew}
                    onChange={setEditingSlide}
                    onSave={saveSlide}
                    onCancel={() => setEditingSlide(null)}
                    onImageUpload={handleImageUpload}
                    onRemoveImage={removeImage}
                  />
                ) : (
                  <div className={`flex items-center gap-3 p-4 rounded-xl border bg-background hover:border-accent/40 transition-colors
                    ${!slide.is_visible ? "opacity-55 border-orange-200" : "border-border"}`}>
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 shadow overflow-hidden">
                      {slide.bg_image_url ? (
                        <img src={slide.bg_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full"
                          style={{ background: `linear-gradient(135deg, ${slide.bg_color_from}, ${slide.bg_color_to})` }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{slide.title}</span>
                        {slide.badge_text && (
                          <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded-full">{slide.badge_text}</span>
                        )}
                        {slide.bg_image_url && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">📷 Image</span>
                        )}
                        {!slide.is_visible && (
                          <span className="text-[10px] bg-orange-100 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full">Hidden</span>
                        )}
                      </div>
                      {slide.subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{slide.subtitle}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        Duration: {slide.duration_seconds}s · Order: {slide.slide_order}
                        {slide.title_font_family && slide.title_font_family !== "inherit" && ` · Font: ${slide.title_font_family}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                        className="p-2 hover:bg-muted rounded-lg transition-colors">
                        {slide.is_visible ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-orange-500" />}
                      </button>
                      <button onClick={() => openEdit(slide)}
                        className="p-2 hover:bg-accent/10 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4 text-accent" />
                      </button>
                      <button onClick={() => deleteSlide(slide.id)}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {editingSlide && isNew && editingSlide.id === "__new__" && (
              <SlideEditForm
                slide={editingSlide}
                previewBg={previewBg}
                saving={savingSlide}
                uploadingImage={uploadingImage}
                isNew={true}
                onChange={setEditingSlide}
                onSave={saveSlide}
                onCancel={() => setEditingSlide(null)}
                onImageUpload={handleImageUpload}
                onRemoveImage={removeImage}
              />
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="glass rounded-xl p-5 border-blue-100 bg-blue-50/50">
          <h3 className="font-semibold text-sm text-blue-800 mb-2">Image Tips</h3>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Upload a <strong>JPEG or PNG</strong> — recommended size: <strong>1200×300px</strong> (wide banner)</li>
            <li>Max file size: <strong>3MB</strong></li>
            <li>Use the <strong>Overlay Opacity</strong> slider to darken the image so text stays readable</li>
            <li>If no image is set, the gradient colors are used instead</li>
            <li>Use <strong>Enter/newline</strong> in the Title field to split text into multiple lines with different colors</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

// ── Edit form ──────────────────────────────────────────────────────────────
function SlideEditForm({
  slide, previewBg, saving, uploadingImage, isNew,
  onChange, onSave, onCancel, onImageUpload, onRemoveImage
}: {
  slide: PromoSlide;
  previewBg: string;
  saving: boolean;
  uploadingImage: boolean;
  isNew: boolean;
  onChange: (s: PromoSlide) => void;
  onSave: () => void;
  onCancel: () => void;
  onImageUpload: (f: File) => void;
  onRemoveImage: () => void;
}) {
  const set = (patch: Partial<PromoSlide>) => onChange({ ...slide, ...patch });

  // Derive line count from title newlines
  const titleLines = slide.title.split("\n");
  const lineColors: { line: number; color: string }[] = Array.isArray(slide.title_line_colors)
    ? slide.title_line_colors
    : [];

  const getLineColor = (lineNum: number) =>
    lineColors.find(c => c.line === lineNum)?.color || slide.text_color || "#ffffff";

  const setLineColor = (lineNum: number, color: string) => {
    const updated = lineColors.filter(c => c.line !== lineNum);
    updated.push({ line: lineNum, color });
    set({ title_line_colors: updated });
  };

  const FONT_PRESETS = [
    { label: "Default (inherit)", value: "inherit" },
    { label: "Inter", value: "Inter, sans-serif" },
    { label: "Poppins", value: "Poppins, sans-serif" },
    { label: "Roboto", value: "Roboto, sans-serif" },
    { label: "Montserrat", value: "Montserrat, sans-serif" },
    { label: "Oswald", value: "Oswald, sans-serif" },
    { label: "Playfair Display", value: "Playfair Display, serif" },
    { label: "Raleway", value: "Raleway, sans-serif" },
    { label: "Nunito", value: "Nunito, sans-serif" },
  ];

  return (
    <div className="border-2 border-accent rounded-xl p-5 space-y-4 bg-accent/5">

      {/* Live preview */}
      <div className="rounded-xl overflow-hidden relative" style={{ height: "90px" }}>
        {slide.bg_image_url ? (
          <>
            <div className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.bg_image_url})` }} />
            <div className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${slide.bg_color_from || "#000"} 0%, ${slide.bg_color_to || "#1a1a2e"} 100%)`,
                opacity: slide.bg_overlay_opacity ?? 0.55,
              }} />
          </>
        ) : (
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${slide.bg_color_from || "#1a1a2e"} 0%, ${slide.bg_color_to || "#16213e"} 100%)` }} />
        )}
        <div className="relative z-10 h-full flex items-center justify-between px-4">
          <div>
            {slide.badge_text && (
              <span className="text-[10px] px-2 py-0.5 rounded-full inline-block mb-1"
                style={{ background: "rgba(255,255,255,0.2)", color: slide.text_color || "#fff" }}>
                {slide.badge_text}
              </span>
            )}
            {/* Live preview of title with per-line colors */}
            <p
              className="font-bold"
              style={{
                fontFamily: slide.title_font_family || "inherit",
                fontSize: "clamp(0.7rem, 2vw, 1rem)",
              }}
            >
              {titleLines.map((line, i) => (
                <span key={i} style={{ color: getLineColor(i + 1), display: "block" }}>
                  {line || <span className="opacity-40">Line {i + 1}</span>}
                </span>
              ))}
            </p>
            {slide.subtitle && (
              <p className="text-xs opacity-80" style={{ color: slide.text_color || "#fff" }}>{slide.subtitle}</p>
            )}
          </div>
          <button className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 flex-shrink-0"
            style={{ background: "#25D366", color: "#fff" }}>
            <MessageCircle size={11} />
            {slide.cta_text || "WhatsApp"}
          </button>
        </div>
      </div>

      {/* ── Background Image Upload ── */}
      <div className="space-y-2">
        <label className="text-xs font-semibold block">Background Image (optional)</label>
        {slide.bg_image_url ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
            <img src={slide.bg_image_url} alt="bg" className="w-16 h-10 object-cover rounded" />
            <p className="text-xs text-muted-foreground flex-1 truncate">Image uploaded ✓</p>
            <button onClick={onRemoveImage}
              className="text-xs text-destructive hover:underline flex items-center gap-1">
              <ImageOff className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        ) : (
          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors
            ${uploadingImage ? "border-accent/50 bg-accent/5" : "border-border hover:border-accent/50 hover:bg-accent/5"}`}>
            {uploadingImage ? (
              <><Loader2 className="w-5 h-5 animate-spin text-accent" /><span className="text-sm text-muted-foreground">Uploading…</span></>
            ) : (
              <><Upload className="w-5 h-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click to upload JPEG / PNG (max 3MB)</span></>
            )}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              disabled={uploadingImage}
              onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }}
            />
          </label>
        )}
        {slide.bg_image_url && (
          <div className="space-y-1">
            <label className="text-xs font-semibold block">
              Overlay Opacity: {Math.round((slide.bg_overlay_opacity ?? 0.55) * 100)}%
              <span className="text-muted-foreground font-normal ml-1">(higher = darker image, better text visibility)</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={slide.bg_overlay_opacity ?? 0.55}
              onChange={e => set({ bg_overlay_opacity: parseFloat(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Title — full width with newline hint */}
        <div className="md:col-span-2">
          <label className="text-xs font-semibold mb-1 block">
            Title *
            <span className="font-normal text-muted-foreground ml-2">
              — press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to add a new line with its own color
            </span>
          </label>
          <Textarea
            value={slide.title}
            onChange={e => set({ title: e.target.value })}
            placeholder={"e.g. 50% Off on All Courses!\nEnroll Before June 10th"}
            rows={3}
            className="bg-background font-mono text-sm"
          />
        </div>

        {/* ── NEW: Font Size ── */}
        <div>
          <label className="text-xs font-semibold mb-1 block">
            Title Font Size
            <span className="font-normal text-muted-foreground ml-1">(e.g. 48px, 3rem, 2.5vw)</span>
          </label>
          <Input
            value={slide.title_font_size || "clamp(1rem, 3.2vw, 1.9rem)"}
            onChange={e => set({ title_font_size: e.target.value })}
            placeholder="clamp(1rem, 3.2vw, 1.9rem)"
            className="bg-background font-mono text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Tip: use <code>clamp(min, preferred, max)</code> for responsive sizing
          </p>
        </div>

        {/* ── NEW: Font Family ── */}
        <div>
          <label className="text-xs font-semibold mb-1 block">Title Font Family</label>
          <select
            value={slide.title_font_family || "inherit"}
            onChange={e => set({ title_font_family: e.target.value })}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {[
              { label: "Default (inherit)", value: "inherit" },
              { label: "Inter", value: "Inter, sans-serif" },
              { label: "Poppins", value: "Poppins, sans-serif" },
              { label: "Roboto", value: "Roboto, sans-serif" },
              { label: "Montserrat", value: "Montserrat, sans-serif" },
              { label: "Oswald", value: "Oswald, sans-serif" },
              { label: "Playfair Display", value: "Playfair Display, serif" },
              { label: "Raleway", value: "Raleway, sans-serif" },
              { label: "Nunito", value: "Nunito, sans-serif" },
            ].map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground mt-0.5">Or type a custom font name in the size field above</p>
        </div>

        {/* ── NEW: Per-line color pickers ── */}
        <div className="md:col-span-2">
          <label className="text-xs font-semibold mb-2 block">
            Title Line Colors
            <span className="font-normal text-muted-foreground ml-2">— pick a color for each line of your title</span>
          </label>
          {titleLines.length === 0 || (titleLines.length === 1 && !titleLines[0]) ? (
            <p className="text-xs text-muted-foreground italic">Type your title above to set per-line colors.</p>
          ) : (
            <div className="space-y-2">
              {titleLines.map((line, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background">
                  <span className="text-[10px] font-bold text-muted-foreground w-12 flex-shrink-0">Line {i + 1}</span>
                  <input
                    type="color"
                    value={getLineColor(i + 1)}
                    onChange={e => setLineColor(i + 1, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border flex-shrink-0"
                  />
                  <Input
                    value={getLineColor(i + 1)}
                    onChange={e => setLineColor(i + 1, e.target.value)}
                    className="font-mono text-xs bg-background w-28 flex-shrink-0"
                  />
                  <span
                    className="text-sm font-bold truncate flex-1"
                    style={{ color: getLineColor(i + 1), fontFamily: slide.title_font_family || "inherit" }}
                  >
                    {line || <span className="opacity-40 text-xs">(empty line)</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold mb-1 block">Subtitle</label>
          <Input value={slide.subtitle} onChange={e => set({ subtitle: e.target.value })}
            placeholder="e.g. Limited Time Offer – Enroll Now" className="bg-background" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Badge Text</label>
          <Input value={slide.badge_text} onChange={e => set({ badge_text: e.target.value })}
            placeholder="e.g. Flash Sale" className="bg-background" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold mb-1 block">Caption (small text)</label>
          <Textarea value={slide.caption} onChange={e => set({ caption: e.target.value })}
            placeholder="e.g. Valid till 30th June 2025. Seats limited." rows={2} className="bg-background" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">CTA Button Text</label>
          <Input value={slide.cta_text} onChange={e => set({ cta_text: e.target.value })}
            placeholder="Enquire on WhatsApp" className="bg-background" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">WhatsApp Pre-filled Message</label>
          <Input value={slide.whatsapp_message} onChange={e => set({ whatsapp_message: e.target.value })}
            placeholder="Hello ATEC! I saw the offer..." className="bg-background" />
        </div>

        {/* Colors */}
        <div>
          <label className="text-xs font-semibold mb-1 block">
            {slide.bg_image_url ? "Overlay Color (From)" : "Background Color (From)"}
          </label>
          <div className="flex gap-2 items-center">
            <input type="color" value={slide.bg_color_from}
              onChange={e => set({ bg_color_from: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border" />
            <Input value={slide.bg_color_from} onChange={e => set({ bg_color_from: e.target.value })}
              className="font-mono text-xs bg-background" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">
            {slide.bg_image_url ? "Overlay Color (To)" : "Background Color (To)"}
          </label>
          <div className="flex gap-2 items-center">
            <input type="color" value={slide.bg_color_to}
              onChange={e => set({ bg_color_to: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border" />
            <Input value={slide.bg_color_to} onChange={e => set({ bg_color_to: e.target.value })}
              className="font-mono text-xs bg-background" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Text Color (default for all elements)</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={slide.text_color}
              onChange={e => set({ text_color: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border" />
            <Input value={slide.text_color} onChange={e => set({ text_color: e.target.value })}
              className="font-mono text-xs bg-background" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Duration (seconds)</label>
          <Input type="number" min={2} max={30} value={slide.duration_seconds}
            onChange={e => set({ duration_seconds: parseInt(e.target.value) || 5 })}
            className="bg-background" />
          <p className="text-[10px] text-muted-foreground mt-0.5">How long this slide shows before advancing</p>
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
        <Button onClick={onSave} disabled={saving || !slide.title}
          className="gradient-accent text-accent-foreground border-0" size="sm">
          <Check className="w-4 h-4 mr-1" />
          {saving ? "Saving…" : isNew ? "Add Slide" : "Save Slide"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}