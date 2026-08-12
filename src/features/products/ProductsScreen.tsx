import { Beaker } from "lucide-react";
import { EmptyState } from "@/src/components/common/EmptyState";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";

export function ProductsScreen() {
  return (
    <div className="screen">
      <ScreenHeader eyebrow="Personal shelf" title="Products" description="Everything you use, without the clutter." />
      <EmptyState icon={<Beaker size={26} />} title="Your shelf is empty." description="Add a product to keep its details, opening date, and routines close at hand." />
    </div>
  );
}
