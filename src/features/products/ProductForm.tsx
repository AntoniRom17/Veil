import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/src/components/common/Button";
import { Sheet } from "@/src/components/common/Sheet";
import { SelectField, TextAreaField, TextField } from "@/src/components/forms/Field";
import { PRODUCT_STATUS_LABELS } from "@/src/lib/constants";
import type { ProductDraft } from "@/src/repositories/productRepository";
import type { Category, MediaAsset, Product, ProductStatus } from "@/src/types/domain";
import { useObjectUrl } from "@/src/hooks/useObjectUrl";

export interface ProductFormValue extends ProductDraft {
  photoFile?: File;
  removePhoto: boolean;
}

interface ProductFormProps {
  open: boolean;
  product?: Product;
  photo?: MediaAsset;
  categories: Category[];
  busy?: boolean;
  onClose(): void;
  onSave(value: ProductFormValue): void | Promise<void>;
}

const statuses = Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[];

export function ProductForm({ open, product, photo, categories, busy = false, onClose, onSave }: ProductFormProps) {
  const photoInputId = useId();
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "active");
  const [datePurchased, setDatePurchased] = useState(product?.datePurchased ?? "");
  const [dateOpened, setDateOpened] = useState(product?.dateOpened ?? "");
  const [printedExpirationDate, setPrintedExpirationDate] = useState(product?.printedExpirationDate ?? "");
  const [paoMonths, setPaoMonths] = useState<number | "">(product?.paoMonths ?? "");
  const [size, setSize] = useState(product?.size ?? "");
  const [intendedFrequency, setIntendedFrequency] = useState(product?.intendedFrequency ?? "");
  const [ingredients, setIngredients] = useState(product?.ingredients ?? "");
  const [activeIngredients, setActiveIngredients] = useState(product?.activeIngredients ?? "");
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [amAllowed, setAmAllowed] = useState(product?.amAllowed ?? true);
  const [pmAllowed, setPmAllowed] = useState(product?.pmAllowed ?? true);
  const [photoFile, setPhotoFile] = useState<File>();
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = useObjectUrl(photoFile ?? (removePhoto ? undefined : photo?.thumbnail));

  async function submit() {
    const category = categories.find((item) => item.id === categoryId);
    if (!name.trim()) {
      setError("Enter a product name.");
      return;
    }
    if (!category) {
      setError("Choose a product category.");
      return;
    }
    if (!amAllowed && !pmAllowed) {
      setError("Allow this product in AM, PM, or both.");
      return;
    }
    setError("");
    await onSave({
      name: name.trim(),
      brand: brand.trim(),
      categoryId: category.id,
      categoryName: category.name,
      photoId: product?.photoId,
      datePurchased: datePurchased || undefined,
      dateOpened: dateOpened || undefined,
      printedExpirationDate: printedExpirationDate || undefined,
      paoMonths: paoMonths === "" ? undefined : Number(paoMonths),
      size: size.trim() || undefined,
      notes: notes.trim(),
      ingredients: ingredients.trim(),
      activeIngredients: activeIngredients.trim(),
      intendedFrequency: intendedFrequency.trim(),
      amAllowed,
      pmAllowed,
      status,
      favorite: product?.favorite ?? false,
      photoFile,
      removePhoto,
    });
  }

  return (
    <Sheet open={open} size="large" title={product ? "Edit product" : "Add product"} description="All details and photos stay on this device." onClose={onClose} footer={<Button fullWidth onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save product"}</Button>}>
      <div className="form-stack">
        <div className="photo-field">
          <div className="photo-field__preview">{previewUrl ? <img src={previewUrl} alt="Selected product" /> : <ImagePlus size={29} aria-hidden="true" />}</div>
          <div className="photo-field__actions"><label className="button button--secondary" htmlFor={photoInputId}><Camera size={17} /> {previewUrl ? "Replace photo" : "Add photo"}</label><input id={photoInputId} className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setPhotoFile(file); setRemovePhoto(false); } }} />{previewUrl ? <Button variant="quiet" leadingIcon={<Trash2 size={17} />} onClick={() => { setPhotoFile(undefined); setRemovePhoto(true); }}>Remove</Button> : null}</div>
        </div>
        <div className="field-grid"><TextField label="Product name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Barrier Cream" autoComplete="off" /><TextField label="Brand" optional value={brand} onChange={(event) => setBrand(event.target.value)} autoComplete="organization" /></div>
        <div className="field-grid"><SelectField label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField><SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)}>{statuses.map((value) => <option key={value} value={value}>{PRODUCT_STATUS_LABELS[value]}</option>)}</SelectField></div>
        <div className="form-section"><h3>Timing</h3><div className="availability-grid"><button type="button" aria-pressed={amAllowed} onClick={() => setAmAllowed((value) => !value)}>AM allowed</button><button type="button" aria-pressed={pmAllowed} onClick={() => setPmAllowed((value) => !value)}>PM allowed</button></div><TextField label="Intended frequency" optional value={intendedFrequency} onChange={(event) => setIntendedFrequency(event.target.value)} placeholder="Every evening" /></div>
        <div className="form-section"><h3>Dates & PAO</h3><div className="field-grid"><TextField label="Purchased" optional type="date" value={datePurchased} onChange={(event) => setDatePurchased(event.target.value)} /><TextField label="Opened" optional type="date" value={dateOpened} onChange={(event) => setDateOpened(event.target.value)} /><TextField label="Printed expiration" optional type="date" value={printedExpirationDate} onChange={(event) => setPrintedExpirationDate(event.target.value)} /><TextField label="PAO months" optional type="number" inputMode="numeric" min="1" max="60" value={paoMonths} onChange={(event) => setPaoMonths(event.target.value ? Number(event.target.value) : "")} hint="Period after opening" /></div></div>
        <TextField label="Size" optional value={size} onChange={(event) => setSize(event.target.value)} placeholder="50 ml" />
        <div className="form-section"><h3>Formula notes</h3><TextAreaField label="Active ingredients" optional rows={3} value={activeIngredients} onChange={(event) => setActiveIngredients(event.target.value)} /><TextAreaField label="Ingredients" optional rows={4} value={ingredients} onChange={(event) => setIngredients(event.target.value)} /></div>
        <TextAreaField label="Personal notes" optional rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
    </Sheet>
  );
}
