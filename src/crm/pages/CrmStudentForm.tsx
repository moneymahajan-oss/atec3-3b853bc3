useEffect(() => {
    supabase.from("courses").select("id,name,total_fee,registration_fee").eq("is_active", true).order("name")
      .then(({ data }) => setCourses((data ?? []) as Course[]));
    supabase.from("crm_batches").select("id,name,course_id").order("created_at", { ascending: false })
      .then(({ data }) => setBatches((data ?? []) as never));
  }, []);

  useEffect(() => {
    if (isNew) {
      if (fromEnquiry) {
        supabase.from("crm_enquiries").select("*").eq("id", fromEnquiry).maybeSingle().then(({ data }) => {
          if (!data) return;
          setForm((f) => ({
            ...f,
            full_name: data.name ?? "",
            phone: data.phone ?? "",
            alt_phone: data.alt_phone ?? "",
            email: data.email ?? "",
            city: data.city ?? "",
            state: data.state ?? "",
            course_id: data.course_id ?? "",
            course_name_snapshot: data.course_name_snapshot,
            qualification: data.qualification ?? "",
            college_name: data.college_name ?? "",
            class_year: data.class_year ?? "",
            stream: data.stream ?? "",
            current_status: data.current_status ?? "",
            company_name: data.company_name ?? "",
            designation: data.designation ?? "",
            hear_about_us: data.hear_about_us ?? "",
            referred_by: data.referred_by ?? "",
          }));
        });
      }
      return;
    }
