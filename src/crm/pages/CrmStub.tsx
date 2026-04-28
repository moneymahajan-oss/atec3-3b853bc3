import { PageHeader } from "../components/PageHeader";
import { Construction } from "lucide-react";

export default function CrmStub({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} description="This module ships in a later phase." />
      <div className="bg-card border rounded-2xl p-10 flex flex-col items-center text-center max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Construction className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="font-heading font-bold text-lg mb-1">Coming soon</h2>
        <p className="text-sm text-muted-foreground">
          {title} is part of a later phase of the ATEC CRM build plan.
          See <code className="text-xs bg-muted px-1 py-0.5 rounded">.lovable/plan.md</code> for the full roadmap.
        </p>
      </div>
    </div>
  );
}
