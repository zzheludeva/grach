"use client";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { ProductForm, type ProductPrefill } from "@/components/seller/ProductForm";

export default function NewProductPage() {
  const sp = useSearchParams();
  const { state, meId, actions } = useStore();
  const projectId = sp.get("project");
  // Prefill from the user's own project only (ownership check).
  const project = projectId ? state!.data.projects.find((p) => p.id === projectId && p.userId === meId) : undefined;
  const prefill: ProductPrefill | undefined = project
    ? {
        title: project.title,
        description: project.description || project.idea,
        images: [...project.photos.filter((p) => p.final), ...project.photos.filter((p) => !p.final)].map((p) => p.src).concat(project.cover ? [project.cover] : []).slice(0, 6),
        category: project.category,
        technique: project.technique,
        materials: project.materials,
      }
    : undefined;
  return <ProductForm prefill={prefill} onSaved={(id) => project && actions.updateProject(project.id, { productId: id })} />;
}
